/**
 * 错误恢复策略
 * 提供错误分类、降级和重试策略
 */

import type { StreamProtocol } from '@/types/adaptive-stream';

/**
 * 重试配置
 */
export interface RetryConfig {
  shouldRetry: boolean;
  delay: number;
}

/**
 * 错误恢复策略
 */
export class ErrorRecoveryStrategy {
  /**
   * 判断错误是否可恢复
   */
  static isRecoverable(error: Error): boolean {
    const recoverablePatterns = [
      /network.*timeout/i,
      /buffer.*underrun/i,
      /temporary.*failure/i,
      /connection.*lost/i,
      /stream.*interrupted/i
    ];

    return recoverablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * 获取下一个降级协议
   */
  static getNextProtocol(current: StreamProtocol): StreamProtocol | null {
    const fallbackChain: Record<StreamProtocol, StreamProtocol | null> = {
      webrtc: 'flv' as StreamProtocol,
      flv: 'hls' as StreamProtocol,
      hls: null
    };

    return fallbackChain[current];
  }

  /**
   * 获取重试配置
   */
  static getRetryConfig(errorCount: number): RetryConfig {
    if (errorCount >= 3) {
      return { shouldRetry: false, delay: 0 };
    }

    // 指数退避，最大 5 秒
    const delay = Math.min(1000 * Math.pow(2, errorCount), 5000);

    return {
      shouldRetry: true,
      delay
    };
  }

  /**
   * 获取错误类型
   */
  static getErrorType(error: Error): 'network' | 'player' | 'config' | 'resource' {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return 'network';
    }

    if (message.includes('config') || message.includes('invalid')) {
      return 'config';
    }

    if (message.includes('resource') || message.includes('not found')) {
      return 'resource';
    }

    return 'player';
  }

  /**
   * 获取错误严重程度
   */
  static getErrorSeverity(error: Error): 'warning' | 'error' | 'fatal' {
    if (this.isRecoverable(error)) {
      return 'warning';
    }

    const message = error.message.toLowerCase();

    if (message.includes('fatal') || message.includes('not supported')) {
      return 'fatal';
    }

    return 'error';
  }
}
