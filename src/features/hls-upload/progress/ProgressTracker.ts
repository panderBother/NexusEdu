/**
 * 进度追踪器
 * 负责计算和报告上传进度、速度和预计剩余时间
 */

import type { UploadProgress, SliceProgress, SliceStatus } from '../types'

interface SpeedSample {
  timestamp: number
  bytes: number
}

export class ProgressTracker {
  private tasks: Map<string, TaskProgress> = new Map()
  private speedWindowMs: number = 5000 // 5秒滑动窗口

  /**
   * 初始化任务进度
   */
  initializeTask(taskId: string, totalSize: number, totalSlices: number): void {
    this.tasks.set(taskId, {
      taskId,
      totalBytes: totalSize,
      uploadedBytes: 0,
      totalSlices,
      uploadedSlices: 0,
      sliceProgress: new Map(),
      speedSamples: [],
      startTime: Date.now()
    })
  }

  /**
   * 更新切片进度
   */
  updateSliceProgress(taskId: string, sliceId: string, loaded: number, total: number): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    const existingProgress = task.sliceProgress.get(sliceId)
    const previousLoaded = existingProgress?.loaded || 0

    // 更新切片进度
    task.sliceProgress.set(sliceId, {
      sliceId,
      loaded,
      total,
      percentage: total > 0 ? (loaded / total) * 100 : 0,
      status: 'uploading'
    })

    // 更新总上传字节数
    const bytesIncrement = loaded - previousLoaded
    task.uploadedBytes += bytesIncrement

    // 记录速度样本
    this.recordSpeedSample(task, bytesIncrement)
  }

  /**
   * 标记切片完成
   */
  markSliceCompleted(taskId: string, sliceId: string, size: number): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    const existingProgress = task.sliceProgress.get(sliceId)
    if (existingProgress) {
      existingProgress.status = 'completed'
      existingProgress.percentage = 100

      // 如果之前没有完全上传，补充剩余字节
      const remaining = size - existingProgress.loaded
      if (remaining > 0) {
        task.uploadedBytes += remaining
        this.recordSpeedSample(task, remaining)
      }
    } else {
      // 如果之前没有进度记录，直接添加
      task.sliceProgress.set(sliceId, {
        sliceId,
        loaded: size,
        total: size,
        percentage: 100,
        status: 'completed'
      })
      task.uploadedBytes += size
      this.recordSpeedSample(task, size)
    }

    task.uploadedSlices++
  }

  /**
   * 获取任务进度
   */
  getTaskProgress(taskId: string): UploadProgress | null {
    const task = this.tasks.get(taskId)
    if (!task) return null

    const percentage = task.totalBytes > 0 
      ? (task.uploadedBytes / task.totalBytes) * 100 
      : 0

    return {
      taskId,
      uploadedBytes: task.uploadedBytes,
      totalBytes: task.totalBytes,
      uploadedSlices: task.uploadedSlices,
      totalSlices: task.totalSlices,
      percentage,
      speed: this.calculateSpeed(taskId),
      eta: this.calculateETA(taskId),
      sliceProgress: new Map(task.sliceProgress)
    }
  }

  /**
   * 计算上传速度（字节/秒）
   */
  calculateSpeed(taskId: string): number {
    const task = this.tasks.get(taskId)
    if (!task) return 0

    const now = Date.now()
    const windowStart = now - this.speedWindowMs

    // 过滤时间窗口内的样本
    const recentSamples = task.speedSamples.filter(
      sample => sample.timestamp >= windowStart
    )

    if (recentSamples.length === 0) return 0

    // 计算总字节数和时间跨度
    const totalBytes = recentSamples.reduce((sum, sample) => sum + sample.bytes, 0)
    const timeSpan = now - recentSamples[0].timestamp

    if (timeSpan === 0) return 0

    // 字节/毫秒 转换为 字节/秒
    return (totalBytes / timeSpan) * 1000
  }

  /**
   * 计算预计剩余时间（秒）
   */
  calculateETA(taskId: string): number {
    const task = this.tasks.get(taskId)
    if (!task) return 0

    const speed = this.calculateSpeed(taskId)
    if (speed === 0) return 0

    const remainingBytes = task.totalBytes - task.uploadedBytes
    if (remainingBytes <= 0) return 0

    return remainingBytes / speed
  }

  /**
   * 记录速度样本
   */
  private recordSpeedSample(task: TaskProgress, bytes: number): void {
    const now = Date.now()
    task.speedSamples.push({
      timestamp: now,
      bytes
    })

    // 清理过期样本
    const windowStart = now - this.speedWindowMs
    task.speedSamples = task.speedSamples.filter(
      sample => sample.timestamp >= windowStart
    )
  }

  /**
   * 重置任务进度
   */
  resetTask(taskId: string): void {
    this.tasks.delete(taskId)
  }

  /**
   * 获取所有任务进度
   */
  getAllProgress(): UploadProgress[] {
    const progressList: UploadProgress[] = []
    for (const taskId of this.tasks.keys()) {
      const progress = this.getTaskProgress(taskId)
      if (progress) {
        progressList.push(progress)
      }
    }
    return progressList
  }
}

interface TaskProgress {
  taskId: string
  totalBytes: number
  uploadedBytes: number
  totalSlices: number
  uploadedSlices: number
  sliceProgress: Map<string, SliceProgress>
  speedSamples: SpeedSample[]
  startTime: number
}
