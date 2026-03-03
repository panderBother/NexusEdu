/**
 * 错误处理器
 * 负责处理各种错误类型并记录日志
 */

import type {
  UploadError,
  ErrorHandlingDecision,
  WorkerError,
  StorageError
} from '../types'

interface ErrorLog {
  timestamp: number
  type: string
  message: string
  sliceId?: string
  taskId?: string
  statusCode?: number
}

export class ErrorHandler {
  private errorLogs: ErrorLog[] = []
  private maxLogs: number = 1000

  /**
   * 处理上传错误
   */
  handleUploadError(error: UploadError): ErrorHandlingDecision {
    // 记录错误
    this.logError({
      timestamp: error.timestamp,
      type: error.type,
      message: error.message,
      sliceId: error.sliceId,
      statusCode: error.statusCode
    })

    // 判断是否应该重试
    if (!error.retryable) {
      return {
        shouldRetry: false,
        fallbackAction: 'manual'
      }
    }

    // 网络错误 - 重试
    if (error.type === 'network') {
      return {
        shouldRetry: true,
        retryDelay: 2000
      }
    }

    // 服务器错误 - 重试
    if (error.type === 'server') {
      // 5xx 错误
      if (error.statusCode && error.statusCode >= 500) {
        return {
          shouldRetry: true,
          retryDelay: 3000
        }
      }

      // 429 请求过多 - 延长重试时间
      if (error.statusCode === 429) {
        return {
          shouldRetry: true,
          retryDelay: 10000
        }
      }

      // 408 请求超时
      if (error.statusCode === 408) {
        return {
          shouldRetry: true,
          retryDelay: 2000
        }
      }
    }

    // 客户端错误 - 不重试
    if (error.type === 'client') {
      return {
        shouldRetry: false,
        fallbackAction: 'skip'
      }
    }

    // 默认不重试
    return {
      shouldRetry: false,
      fallbackAction: 'manual'
    }
  }

  /**
   * 处理 Worker 错误
   */
  handleWorkerError(error: WorkerError): void {
    this.logError({
      timestamp: error.timestamp,
      type: 'worker',
      message: error.message
    })

    console.error('Worker error:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
  }

  /**
   * 处理存储错误
   */
  handleStorageError(error: StorageError): void {
    this.logError({
      timestamp: error.timestamp,
      type: 'storage',
      message: error.message
    })

    // 配额超出 - 尝试清理
    if (error.type === 'quota_exceeded') {
      console.warn('Storage quota exceeded. Consider cleaning up old tasks.')
    }

    // 访问被拒绝
    if (error.type === 'access_denied') {
      console.error('Storage access denied. Check browser permissions.')
    }
  }

  /**
   * 记录错误
   */
  private logError(log: ErrorLog): void {
    this.errorLogs.push(log)

    // 限制日志数量
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs.shift()
    }

    // 输出到控制台
    console.error(`[${new Date(log.timestamp).toISOString()}] ${log.type}: ${log.message}`, {
      sliceId: log.sliceId,
      taskId: log.taskId,
      statusCode: log.statusCode
    })
  }

  /**
   * 获取错误日志
   */
  getErrorLogs(filter?: {
    type?: string
    sliceId?: string
    taskId?: string
    since?: number
  }): ErrorLog[] {
    let logs = this.errorLogs

    if (filter) {
      if (filter.type) {
        logs = logs.filter(log => log.type === filter.type)
      }
      if (filter.sliceId) {
        logs = logs.filter(log => log.sliceId === filter.sliceId)
      }
      if (filter.taskId) {
        logs = logs.filter(log => log.taskId === filter.taskId)
      }
      if (filter.since) {
        logs = logs.filter(log => log.timestamp >= filter.since)
      }
    }

    return logs
  }

  /**
   * 清理错误日志
   */
  clearErrorLogs(olderThan?: number): void {
    if (olderThan) {
      this.errorLogs = this.errorLogs.filter(log => log.timestamp >= olderThan)
    } else {
      this.errorLogs = []
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    total: number
    byType: Record<string, number>
    recentErrors: number
  } {
    const byType: Record<string, number> = {}
    const oneHourAgo = Date.now() - 3600000

    for (const log of this.errorLogs) {
      byType[log.type] = (byType[log.type] || 0) + 1
    }

    const recentErrors = this.errorLogs.filter(
      log => log.timestamp >= oneHourAgo
    ).length

    return {
      total: this.errorLogs.length,
      byType,
      recentErrors
    }
  }

  /**
   * 判断是否需要降级处理
   */
  shouldDegrade(taskId: string): boolean {
    const recentErrors = this.getErrorLogs({
      taskId,
      since: Date.now() - 300000 // 最近5分钟
    })

    // 如果最近5分钟内错误超过10次，建议降级
    return recentErrors.length > 10
  }
}
