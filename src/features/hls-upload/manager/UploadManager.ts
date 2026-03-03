/**
 * 上传管理器
 * 协调整个上传流程，管理 Worker 生命周期
 */

import axios from 'axios'
import { M3U8Parser } from '../parsers/M3U8Parser'
import { MetadataStore } from '../storage/MetadataStore'
import { SliceQueue } from '../queue/SliceQueue'
import { ProgressTracker } from '../progress/ProgressTracker'
import { ExponentialBackoffStrategy } from '../retry/RetryStrategy'
import type {
  UploadTask,
  UploadConfig,
  SliceMetadata,
  WorkerMessage,
  WorkerResponse,
  UploadProgress
} from '../types'

export class UploadManager {
  private parser: M3U8Parser
  private store: MetadataStore
  private queues: Map<string, SliceQueue> = new Map()
  private tracker: ProgressTracker
  private retryStrategy: ExponentialBackoffStrategy
  private worker: Worker | null = null
  private config: UploadConfig
  private completionCallbacks: Map<string, () => void> = new Map()

  constructor(config: UploadConfig) {
    this.parser = new M3U8Parser()
    this.store = new MetadataStore()
    this.tracker = new ProgressTracker()
    this.retryStrategy = new ExponentialBackoffStrategy(
      config.maxRetries,
      1000,
      30000
    )
    this.config = config
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    await this.store.initialize()
    this.initializeWorker()
    await this.recoverUnfinishedTasks()
  }

  /**
   * 恢复未完成的任务
   */
  private async recoverUnfinishedTasks(): Promise<void> {
    const tasks = await this.store.getAllTasks()

    for (const task of tasks) {
      // 只恢复未完成的任务
      if (task.status === 'uploading' || task.status === 'paused') {
        // 过滤出未完成的切片
        const incompleteSlices = task.slices.filter(
          slice => slice.status !== 'completed'
        )

        if (incompleteSlices.length > 0) {
          // 重建队列
          const queue = new SliceQueue(this.config.maxConcurrency)
          queue.enqueueBatch(incompleteSlices)
          this.queues.set(task.id, queue)

          // 重建进度追踪
          const totalSize = task.slices.reduce((sum, s) => sum + s.size, 0)
          this.tracker.initializeTask(task.id, totalSize, task.slices.length)

          // 更新已完成的切片进度
          for (const slice of task.slices) {
            if (slice.status === 'completed') {
              this.tracker.markSliceCompleted(task.id, slice.id, slice.size)
            }
          }

          // 如果任务是上传中状态，自动恢复上传
          if (task.status === 'uploading' && this.config.autoStart) {
            this.processQueue(task.id)
          }
        }
      }
    }
  }

  /**
   * 初始化 Worker
   */
  private initializeWorker(): void {
    this.worker = new Worker(
      new URL('../workers/upload.worker.ts', import.meta.url),
      { type: 'module' }
    )

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(event.data)
    }

    this.worker.onerror = (error) => {
      console.error('Worker error:', error)
    }

    // 发送配置
    this.sendWorkerMessage({
      type: 'UPDATE_CONFIG',
      payload: {
        maxConcurrency: this.config.maxConcurrency,
        timeout: this.config.timeout,
        chunkSize: 1024 * 1024
      }
    })
  }

  /**
   * 初始化上传任务
   */
  async initializeUpload(m3u8Url: string): Promise<UploadTask> {
    // 获取 M3U8 文件
    const response = await axios.get(m3u8Url)
    const m3u8Content = response.data

    // 解析 M3U8
    const playlist = this.parser.parse(m3u8Content, m3u8Url)

    // 创建任务
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const slices: SliceMetadata[] = playlist.segments.map((segment, index) => ({
      id: `${taskId}_slice_${index}`,
      taskId,
      index: segment.index,
      duration: segment.duration,
      size: 0, // 需要实际获取文件大小
      localUrl: segment.uri,
      status: 'pending' as const,
      retryCount: 0
    }))

    // 获取切片大小（并行请求）
    await this.fetchSliceSizes(slices)

    const task: UploadTask = {
      id: taskId,
      m3u8Url,
      slices,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      config: this.config
    }

    // 保存到存储
    await this.store.saveTask(task)
    await this.store.saveSlices(slices)

    // 初始化队列
    const queue = new SliceQueue(this.config.maxConcurrency)
    queue.enqueueBatch(slices)
    this.queues.set(taskId, queue)

    // 初始化进度追踪
    const totalSize = slices.reduce((sum, s) => sum + s.size, 0)
    this.tracker.initializeTask(taskId, totalSize, slices.length)

    return task
  }

  /**
   * 获取切片大小
   */
  private async fetchSliceSizes(slices: SliceMetadata[]): Promise<void> {
    const promises = slices.map(async (slice) => {
      try {
        const response = await axios.head(slice.localUrl)
        const contentLength = response.headers['content-length']
        slice.size = contentLength ? parseInt(contentLength, 10) : 0
      } catch (error) {
        console.warn(`Failed to get size for slice ${slice.id}:`, error)
        slice.size = 0
      }
    })

    await Promise.all(promises)
  }

  /**
   * 开始上传
   */
  async startUpload(taskId: string): Promise<void> {
    const task = await this.store.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    task.status = 'uploading'
    task.updatedAt = Date.now()
    await this.store.saveTask(task)

    // 开始处理队列
    this.processQueue(taskId)
  }

  /**
   * 处理队列
   */
  private processQueue(taskId: string): void {
    const queue = this.queues.get(taskId)
    if (!queue) return

    // 获取可用的切片
    const slices = queue.dequeueBatch(this.config.maxConcurrency)

    for (const slice of slices) {
      this.uploadSlice(taskId, slice)
    }
  }

  /**
   * 上传切片
   */
  private uploadSlice(taskId: string, slice: SliceMetadata): void {
    this.sendWorkerMessage({
      type: 'UPLOAD_SLICE',
      payload: {
        taskId,
        sliceId: slice.id,
        sliceUrl: slice.localUrl,
        uploadUrl: this.config.uploadEndpoint,
        index: slice.index
      }
    })
  }

  /**
   * 处理 Worker 消息
   */
  private async handleWorkerMessage(message: WorkerResponse): Promise<void> {
    switch (message.type) {
      case 'UPLOAD_PROGRESS':
        this.handleUploadProgress(message.payload)
        break

      case 'UPLOAD_SUCCESS':
        await this.handleUploadSuccess(message.payload)
        break

      case 'UPLOAD_FAILURE':
        await this.handleUploadFailure(message.payload)
        break

      case 'WORKER_ERROR':
        console.error('Worker error:', message.payload.error)
        break
    }
  }

  /**
   * 处理上传进度
   */
  private handleUploadProgress(payload: any): void {
    const { taskId, sliceId, loaded, total } = payload
    this.tracker.updateSliceProgress(taskId, sliceId, loaded, total)
  }

  /**
   * 处理上传成功
   */
  private async handleUploadSuccess(payload: any): Promise<void> {
    const { taskId, sliceId, remoteUrl } = payload
    const queue = this.queues.get(taskId)
    if (!queue) return

    // 更新队列状态
    queue.markAsCompleted(sliceId)

    // 更新存储
    await this.store.updateSliceStatus(taskId, sliceId, 'completed')

    // 更新进度
    const task = await this.store.getTask(taskId)
    if (task) {
      const slice = task.slices.find(s => s.id === sliceId)
      if (slice) {
        this.tracker.markSliceCompleted(taskId, sliceId, slice.size)
      }
    }

    // 检查是否全部完成
    if (queue.isAllCompleted()) {
      await this.handleTaskCompleted(taskId)
    } else {
      // 继续处理队列
      this.processQueue(taskId)
    }
  }

  /**
   * 处理上传失败
   */
  private async handleUploadFailure(payload: any): Promise<void> {
    const { taskId, sliceId, error, retryable } = payload
    const queue = this.queues.get(taskId)
    if (!queue) return

    const task = await this.store.getTask(taskId)
    if (!task) return

    const slice = task.slices.find(s => s.id === sliceId)
    if (!slice) return

    // 增加重试次数
    slice.retryCount++

    // 判断是否应该重试
    if (retryable && this.retryStrategy.shouldRetry(slice.retryCount, new Error(error))) {
      // 计算延迟
      const delay = this.retryStrategy.calculateDelay(slice.retryCount)

      // 延迟后重试
      setTimeout(() => {
        slice.status = 'pending'
        queue.enqueue(slice)
        this.processQueue(taskId)
      }, delay)
    } else {
      // 标记为失败
      queue.markAsFailed(sliceId)
      await this.store.updateSliceStatus(taskId, sliceId, 'failed')
    }
  }

  /**
   * 处理任务完成
   */
  private async handleTaskCompleted(taskId: string): Promise<void> {
    const task = await this.store.getTask(taskId)
    if (!task) return

    task.status = 'completed'
    task.updatedAt = Date.now()
    await this.store.saveTask(task)

    // 生成最终 M3U8
    await this.generateFinalM3U8(task)

    // 触发完成回调
    const callback = this.completionCallbacks.get(taskId)
    if (callback) {
      callback()
      this.completionCallbacks.delete(taskId)
    }
  }

  /**
   * 生成最终 M3U8
   */
  private async generateFinalM3U8(task: UploadTask): Promise<void> {
    const playlist = {
      version: 3,
      targetDuration: Math.max(...task.slices.map(s => s.duration)),
      mediaSequence: 0,
      segments: task.slices.map(slice => ({
        duration: slice.duration,
        uri: slice.remoteUrl || slice.localUrl,
        index: slice.index
      })),
      endList: true
    }

    const m3u8Content = this.parser.generate(playlist)

    // 上传 M3U8 文件
    try {
      await axios.post(this.config.uploadEndpoint, m3u8Content, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'X-File-Type': 'm3u8'
        }
      })
    } catch (error) {
      console.error('Failed to upload final M3U8:', error)
    }
  }

  /**
   * 发送 Worker 消息
   */
  private sendWorkerMessage(message: WorkerMessage): void {
    if (!this.worker) {
      throw new Error('Worker not initialized')
    }
    this.worker.postMessage(message)
  }

  /**
   * 获取上传进度
   */
  getProgress(taskId: string): UploadProgress | null {
    return this.tracker.getTaskProgress(taskId)
  }

  /**
   * 暂停上传
   */
  async pauseUpload(taskId: string): Promise<void> {
    const task = await this.store.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    task.status = 'paused'
    task.updatedAt = Date.now()
    await this.store.saveTask(task)

    // 通知 Worker 暂停
    this.sendWorkerMessage({
      type: 'PAUSE_UPLOAD',
      payload: { taskId }
    })
  }

  /**
   * 恢复上传
   */
  async resumeUpload(taskId: string): Promise<void> {
    const task = await this.store.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    task.status = 'uploading'
    task.updatedAt = Date.now()
    await this.store.saveTask(task)

    // 继续处理队列
    this.processQueue(taskId)
  }

  /**
   * 取消上传
   */
  async cancelUpload(taskId: string): Promise<void> {
    const task = await this.store.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    // 通知 Worker 取消
    this.sendWorkerMessage({
      type: 'CANCEL_UPLOAD',
      payload: { taskId }
    })

    // 清理队列
    this.queues.delete(taskId)

    // 清理进度追踪
    this.tracker.resetTask(taskId)

    // 删除任务
    await this.store.deleteTask(taskId)

    // 清理回调
    this.completionCallbacks.delete(taskId)
  }

  /**
   * 重试失败的切片
   */
  async retryFailedSlices(taskId: string): Promise<void> {
    const queue = this.queues.get(taskId)
    if (!queue) {
      throw new Error(`Queue for task ${taskId} not found`)
    }

    // 重试失败的切片
    queue.retryFailed()

    // 继续处理队列
    this.processQueue(taskId)
  }

  /**
   * 设置完成回调
   */
  onComplete(taskId: string, callback: () => void): void {
    this.completionCallbacks.set(taskId, callback)
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}
