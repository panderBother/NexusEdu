/**
 * ErrorHandler
 * 错误处理和恢复
 */

import type { VoiceChatError, ErrorCategory, RetryConfig } from '../types'
import { ERROR_CODES, ERROR_MESSAGES, defaultRetryConfig } from '../constants'

export class ErrorHandler {
  private retryConfig: RetryConfig
  private errorLog: VoiceChatError[] = []

  constructor(retryConfig?: RetryConfig) {
    this.retryConfig = retryConfig || defaultRetryConfig
  }

  /**
   * 处理错误
   */
  handleError(error: VoiceChatError): void {
    // 记录错误
    this.logError(error)

    // 通知用户
    this.notifyUser(error)

    // 尝试恢复
    if (error.recoverable) {
      this.attemptRecovery(error).catch(err => {
        console.error('Recovery failed:', err)
      })
    }
  }

  /**
   * 尝试恢复
   */
  async attemptRecovery(error: VoiceChatError): Promise<boolean> {
    switch (error.category) {
      case 'connection':
        return this.recoverConnection(error)
      case 'signaling':
        return this.recoverSignaling(error)
      case 'media':
        return this.recoverMedia(error)
      default:
        return false
    }
  }

  /**
   * 通知用户
   */
  notifyUser(error: VoiceChatError): void {
    const message = ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES] || error.message
    
    // 根据严重程度选择通知方式
    switch (error.severity) {
      case 'critical':
        console.error('[CRITICAL]', message, error)
        // TODO: 显示模态对话框
        break
      case 'high':
        console.error('[ERROR]', message, error)
        // TODO: 显示错误提示
        break
      case 'medium':
        console.warn('[WARNING]', message, error)
        // TODO: 显示警告提示
        break
      case 'low':
        console.info('[INFO]', message, error)
        break
    }
  }

  /**
   * 记录错误
   */
  logError(error: VoiceChatError): void {
    this.errorLog.push(error)
    
    // 保持最近 100 条错误记录
    if (this.errorLog.length > 100) {
      this.errorLog.shift()
    }

    // 输出到控制台
    console.error('[ErrorHandler]', {
      code: error.code,
      message: error.message,
      category: error.category,
      severity: error.severity,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString()
    })
  }

  /**
   * 创建错误对象
   */
  createError(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: VoiceChatError['severity'],
    recoverable: boolean,
    context: Record<string, any> = {}
  ): VoiceChatError {
    return {
      code,
      message,
      category,
      severity,
      recoverable,
      context,
      timestamp: Date.now()
    }
  }

  /**
   * 恢复连接
   */
  private async recoverConnection(error: VoiceChatError): Promise<boolean> {
    console.log('Attempting to recover connection...')
    
    // 实现连接恢复逻辑
    // TODO: 重新建立 WebRTC 连接
    
    return false
  }

  /**
   * 恢复信令
   */
  private async recoverSignaling(error: VoiceChatError): Promise<boolean> {
    console.log('Attempting to recover signaling...')
    
    // 实现信令恢复逻辑
    // TODO: 重新连接信令服务器
    
    return false
  }

  /**
   * 恢复媒体
   */
  private async recoverMedia(error: VoiceChatError): Promise<boolean> {
    console.log('Attempting to recover media...')
    
    // 实现媒体恢复逻辑
    // TODO: 重新获取媒体流
    
    return false
  }

  /**
   * 计算重试延迟
   */
  calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1)
    return Math.min(delay, this.retryConfig.maxDelay)
  }

  /**
   * 获取错误日志
   */
  getErrorLog(): VoiceChatError[] {
    return [...this.errorLog]
  }

  /**
   * 清除错误日志
   */
  clearErrorLog(): void {
    this.errorLog = []
  }
}

/**
 * 重试包装器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt < config.maxAttempts) {
        const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1)
        const actualDelay = Math.min(delay, config.maxDelay)
        
        if (onRetry) {
          onRetry(attempt, lastError)
        }
        
        await new Promise(resolve => setTimeout(resolve, actualDelay))
      }
    }
  }

  throw lastError
}
