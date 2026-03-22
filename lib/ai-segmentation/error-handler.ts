/**
 * AI 分割系统错误处理器
 */

import { IErrorHandler } from './interfaces';
import { AISegmentationError, RecoveryAction, OptimizationStrategy, ErrorRecord } from './types';

export class ErrorHandler implements IErrorHandler {
  private errorHistory: ErrorRecord[] = [];
  private readonly MAX_HISTORY_SIZE = 50;
  private retryAttempts: Map<string, number> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * 处理错误并返回恢复动作
   */
  async handleError(error: AISegmentationError, context: any): Promise<RecoveryAction> {
    const errorRecord: ErrorRecord = {
      timestamp: Date.now(),
      error: new Error(error),
      context: JSON.stringify(context),
      recovered: false
    };

    this.addErrorRecord(errorRecord);

    switch (error) {
      case AISegmentationError.MODEL_LOAD_FAILED:
        return this.handleModelLoadError(context);
      
      case AISegmentationError.WEBGL_CONTEXT_LOST:
        return this.handleWebGLError(context);
      
      case AISegmentationError.INSUFFICIENT_MEMORY:
        return this.handleMemoryError(context);
      
      case AISegmentationError.PROCESSING_TIMEOUT:
        return this.handleTimeoutError(context);
      
      case AISegmentationError.INVALID_INPUT:
        return this.handleInvalidInputError(context);
      
      case AISegmentationError.NETWORK_ERROR:
        return this.handleNetworkError(context);
      
      default:
        return { type: 'FALLBACK', fallbackSystem: 'traditional-mask' };
    }
  }

  /**
   * 处理模型加载失败
   */
  private handleModelLoadError(context: any): RecoveryAction {
    const retryKey = 'model_load';
    const attempts = this.getRetryAttempts(retryKey);

    if (attempts < this.MAX_RETRY_ATTEMPTS) {
      this.incrementRetryAttempts(retryKey);
      return { type: 'RETRY', maxAttempts: this.MAX_RETRY_ATTEMPTS - attempts };
    }

    return { type: 'FALLBACK', fallbackSystem: 'traditional-mask' };
  }

  /**
   * 处理 WebGL 上下文丢失
   */
  private handleWebGLError(context: any): RecoveryAction {
    const strategy: OptimizationStrategy = {
      reduceModelPrecision: false,
      decreaseProcessingFrequency: false,
      enableCPUFallback: true,
      clearMemoryCache: true
    };

    return { type: 'OPTIMIZE', strategy };
  }

  /**
   * 处理内存不足错误
   */
  private handleMemoryError(context: any): RecoveryAction {
    const strategy: OptimizationStrategy = {
      reduceModelPrecision: true,
      decreaseProcessingFrequency: true,
      enableCPUFallback: false,
      clearMemoryCache: true
    };

    return { type: 'OPTIMIZE', strategy };
  }

  /**
   * 处理处理超时错误
   */
  private handleTimeoutError(context: any): RecoveryAction {
    const strategy: OptimizationStrategy = {
      reduceModelPrecision: true,
      decreaseProcessingFrequency: true,
      enableCPUFallback: false,
      clearMemoryCache: false
    };

    return { type: 'OPTIMIZE', strategy };
  }

  /**
   * 处理无效输入错误
   */
  private handleInvalidInputError(context: any): RecoveryAction {
    return { type: 'ABORT', reason: 'Invalid input data provided' };
  }

  /**
   * 处理网络错误
   */
  private handleNetworkError(context: any): RecoveryAction {
    const retryKey = 'network';
    const attempts = this.getRetryAttempts(retryKey);

    if (attempts < 2) { // 网络错误重试次数较少
      this.incrementRetryAttempts(retryKey);
      return { type: 'RETRY', maxAttempts: 2 - attempts };
    }

    return { type: 'FALLBACK', fallbackSystem: 'traditional-mask' };
  }

  /**
   * 添加错误记录
   */
  private addErrorRecord(record: ErrorRecord): void {
    this.errorHistory.push(record);
    
    // 保持历史记录大小限制
    if (this.errorHistory.length > this.MAX_HISTORY_SIZE) {
      this.errorHistory.shift();
    }
  }

  /**
   * 获取重试次数
   */
  private getRetryAttempts(key: string): number {
    return this.retryAttempts.get(key) || 0;
  }

  /**
   * 增加重试次数
   */
  private incrementRetryAttempts(key: string): void {
    const current = this.getRetryAttempts(key);
    this.retryAttempts.set(key, current + 1);
  }

  /**
   * 重置重试次数
   */
  resetRetryAttempts(key?: string): void {
    if (key) {
      this.retryAttempts.delete(key);
    } else {
      this.retryAttempts.clear();
    }
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ErrorRecord[] {
    return [...this.errorHistory];
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * 标记错误已恢复
   */
  markErrorRecovered(timestamp: number): void {
    const record = this.errorHistory.find(r => r.timestamp === timestamp);
    if (record) {
      record.recovered = true;
    }
  }
}