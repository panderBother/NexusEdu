/**
 * WebWorker 上传器
 * 在后台线程执行切片上传，避免阻塞主线程
 */

import axios, { type AxiosProgressEvent } from 'axios'
import type {
  WorkerMessage,
  WorkerResponse,
  UploadSlicePayload,
  WorkerConfig
} from '../types'

// Worker 配置
let config: WorkerConfig = {
  maxConcurrency: 3,
  timeout: 30000,
  chunkSize: 1024 * 1024 // 1MB
}

// 活动的上传任务
const activeUploads = new Map<string, AbortController>()

// 暂停的任务
const pausedTasks = new Set<string>()

/**
 * 处理主线程消息
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  try {
    switch (message.type) {
      case 'UPLOAD_SLICE':
        await handleUploadSlice(message.payload)
        break

      case 'PAUSE_UPLOAD':
        handlePauseUpload(message.payload.taskId)
        break

      case 'CANCEL_UPLOAD':
        handleCancelUpload(message.payload.taskId)
        break

      case 'UPDATE_CONFIG':
        handleUpdateConfig(message.payload)
        break

      default:
        sendError(`Unknown message type: ${(message as any).type}`)
    }
  } catch (error) {
    sendError(error instanceof Error ? error.message : String(error))
  }
}

/**
 * 处理切片上传
 */
async function handleUploadSlice(payload: UploadSlicePayload): Promise<void> {
  const { taskId, sliceId, sliceUrl, uploadUrl, index } = payload

  // 检查任务是否暂停
  if (pausedTasks.has(taskId)) {
    return
  }

  // 创建 AbortController
  const abortController = new AbortController()
  const uploadKey = `${taskId}:${sliceId}`
  activeUploads.set(uploadKey, abortController)

  const startTime = Date.now()

  try {
    // 获取切片文件
    const sliceResponse = await axios.get(sliceUrl, {
      responseType: 'blob',
      signal: abortController.signal,
      timeout: config.timeout
    })

    const sliceBlob = sliceResponse.data as Blob

    // 上传切片
    const uploadResponse = await axios.post(uploadUrl, sliceBlob, {
      headers: {
        'Content-Type': 'video/mp2t',
        'X-Slice-Index': index.toString()
      },
      signal: abortController.signal,
      timeout: config.timeout,
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        const loaded = progressEvent.loaded || 0
        const total = progressEvent.total || sliceBlob.size
        const percentage = total > 0 ? (loaded / total) * 100 : 0

        sendProgress({
          taskId,
          sliceId,
          loaded,
          total,
          percentage
        })
      }
    })

    // 上传成功
    const duration = Date.now() - startTime
    const remoteUrl = uploadResponse.data?.url || uploadUrl

    sendSuccess({
      taskId,
      sliceId,
      remoteUrl,
      duration
    })
  } catch (error) {
    // 检查是否是取消操作
    if (axios.isCancel(error)) {
      return
    }

    // 判断错误是否可重试
    const retryable = isRetryableError(error)
    const errorMessage = error instanceof Error ? error.message : String(error)

    sendFailure({
      taskId,
      sliceId,
      error: errorMessage,
      retryable
    })
  } finally {
    // 清理
    activeUploads.delete(uploadKey)
  }
}

/**
 * 处理暂停上传
 */
function handlePauseUpload(taskId: string): void {
  pausedTasks.add(taskId)

  // 取消该任务的所有活动上传
  for (const [key, controller] of activeUploads.entries()) {
    if (key.startsWith(`${taskId}:`)) {
      controller.abort()
      activeUploads.delete(key)
    }
  }
}

/**
 * 处理取消上传
 */
function handleCancelUpload(taskId: string): void {
  pausedTasks.delete(taskId)

  // 取消该任务的所有活动上传
  for (const [key, controller] of activeUploads.entries()) {
    if (key.startsWith(`${taskId}:`)) {
      controller.abort()
      activeUploads.delete(key)
    }
  }
}

/**
 * 处理配置更新
 */
function handleUpdateConfig(newConfig: WorkerConfig): void {
  config = { ...config, ...newConfig }
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  // 网络错误可重试
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  ) {
    return true
  }

  // Axios 错误
  if (axios.isAxiosError(error)) {
    const status = error.response?.status

    if (!status) {
      // 没有响应，可能是网络错误
      return true
    }

    // 5xx 服务器错误可重试
    if (status >= 500 && status < 600) {
      return true
    }

    // 408 请求超时、429 请求过多可重试
    if (status === 408 || status === 429) {
      return true
    }

    // 4xx 客户端错误不可重试
    if (status >= 400 && status < 500) {
      return false
    }
  }

  // 默认可重试
  return true
}

/**
 * 发送进度消息
 */
function sendProgress(payload: WorkerResponse['payload']): void {
  const message: WorkerResponse = {
    type: 'UPLOAD_PROGRESS',
    payload
  }
  self.postMessage(message)
}

/**
 * 发送成功消息
 */
function sendSuccess(payload: WorkerResponse['payload']): void {
  const message: WorkerResponse = {
    type: 'UPLOAD_SUCCESS',
    payload
  }
  self.postMessage(message)
}

/**
 * 发送失败消息
 */
function sendFailure(payload: WorkerResponse['payload']): void {
  const message: WorkerResponse = {
    type: 'UPLOAD_FAILURE',
    payload
  }
  self.postMessage(message)
}

/**
 * 发送错误消息
 */
function sendError(error: string): void {
  const message: WorkerResponse = {
    type: 'WORKER_ERROR',
    payload: { error }
  }
  self.postMessage(message)
}
