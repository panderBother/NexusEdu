/**
 * 重试策略
 * 实现指数退避算法
 */

export interface RetryStrategy {
  shouldRetry(retryCount: number, error: Error): boolean
  calculateDelay(retryCount: number): number
  isRetryableError(error: Error): boolean
}

/**
 * 指数退避重试策略
 */
export class ExponentialBackoffStrategy implements RetryStrategy {
  constructor(
    private maxRetries: number = 3,
    private baseDelay: number = 1000,
    private maxDelay: number = 30000
  ) {}

  /**
   * 判断是否应该重试
   */
  shouldRetry(retryCount: number, error: Error): boolean {
    return retryCount < this.maxRetries && this.isRetryableError(error)
  }

  /**
   * 计算重试延迟（指数退避）
   */
  calculateDelay(retryCount: number): number {
    const delay = this.baseDelay * Math.pow(2, retryCount)
    return Math.min(delay, this.maxDelay)
  }

  /**
   * 判断错误是否可重试
   */
  isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()

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

    // 检查 HTTP 状态码
    const statusMatch = message.match(/status[:\s]+(\d+)/)
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1], 10)

      // 5xx 服务器错误可重试
      if (statusCode >= 500 && statusCode < 600) {
        return true
      }

      // 408 请求超时可重试
      if (statusCode === 408) {
        return true
      }

      // 429 请求过多可重试
      if (statusCode === 429) {
        return true
      }

      // 4xx 客户端错误不可重试
      if (statusCode >= 400 && statusCode < 500) {
        return false
      }
    }

    // 默认可重试
    return true
  }

  /**
   * 获取最大重试次数
   */
  getMaxRetries(): number {
    return this.maxRetries
  }

  /**
   * 设置最大重试次数
   */
  setMaxRetries(maxRetries: number): void {
    this.maxRetries = maxRetries
  }
}
