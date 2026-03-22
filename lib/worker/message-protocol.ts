/**
 * 消息协议 - 处理主线程与 Worker 线程之间的通信
 */

import { Message, MessageType, WorkerError, WorkerErrorType } from './types';

export class MessageProtocol {
  private messageQueue: Message[] = [];
  private retryAttempts = new Map<string, number>();
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1秒

  /**
   * 创建标准化消息
   */
  static createMessage(type: MessageType, payload?: any, id?: string): Message {
    return {
      type,
      id: id || this.generateId(),
      payload,
      timestamp: Date.now()
    };
  }

  /**
   * 生成唯一消息 ID
   */
  private static generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 序列化消息
   */
  static serialize(message: Message): string {
    try {
      return JSON.stringify(message);
    } catch (error) {
      throw new Error(`消息序列化失败: ${error}`);
    }
  }

  /**
   * 反序列化消息
   */
  static deserialize(data: string): Message {
    try {
      const message = JSON.parse(data);
      if (!this.validateMessage(message)) {
        throw new Error('消息格式无效');
      }
      return message;
    } catch (error) {
      throw new Error(`消息反序列化失败: ${error}`);
    }
  }

  /**
   * 验证消息格式
   */
  private static validateMessage(message: any): message is Message {
    return (
      message &&
      typeof message.type === 'string' &&
      typeof message.timestamp === 'number' &&
      Object.values(MessageType).includes(message.type as MessageType)
    );
  }

  /**
   * 批量创建消息（用于优化通信开销）
   */
  static createBatchMessage(messages: Array<{ type: MessageType; payload?: any }>): Message {
    return this.createMessage(MessageType.ADD_BARRAGE, {
      batch: true,
      messages: messages.map(msg => ({
        type: msg.type,
        payload: msg.payload,
        timestamp: Date.now()
      }))
    });
  }

  /**
   * 创建错误消息
   */
  static createErrorMessage(error: WorkerError): Message {
    return this.createMessage(MessageType.ERROR, { error });
  }

  /**
   * 发送消息（带重试机制）
   */
  async sendMessage(
    target: Worker | DedicatedWorkerGlobalScope,
    message: Message,
    transferable?: Transferable[]
  ): Promise<void> {
    const messageId = message.id!;
    
    try {
      if (transferable) {
        target.postMessage(message, transferable);
      } else {
        target.postMessage(message);
      }
      
      // 重置重试计数
      this.retryAttempts.delete(messageId);
    } catch (error) {
      await this.handleSendError(target, message, error, transferable);
    }
  }

  /**
   * 处理发送错误和重试
   */
  private async handleSendError(
    target: Worker | DedicatedWorkerGlobalScope,
    message: Message,
    error: any,
    transferable?: Transferable[]
  ): Promise<void> {
    const messageId = message.id!;
    const attempts = this.retryAttempts.get(messageId) || 0;

    if (attempts < this.maxRetries) {
      this.retryAttempts.set(messageId, attempts + 1);
      
      // 延迟重试
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      
      try {
        if (transferable) {
          target.postMessage(message, transferable);
        } else {
          target.postMessage(message);
        }
        this.retryAttempts.delete(messageId);
      } catch (retryError) {
        await this.handleSendError(target, message, retryError, transferable);
      }
    } else {
      // 重试次数用尽，发送通信错误
      const workerError: WorkerError = {
        type: WorkerErrorType.COMMUNICATION_ERROR,
        message: `消息发送失败，已重试 ${this.maxRetries} 次: ${error.message}`,
        originalError: error,
        timestamp: Date.now()
      };
      
      // 尝试发送错误消息（不重试）
      try {
        target.postMessage(MessageProtocol.createErrorMessage(workerError));
      } catch (errorSendError) {
        console.error('无法发送错误消息:', errorSendError);
      }
      
      this.retryAttempts.delete(messageId);
      throw new Error(workerError.message);
    }
  }

  /**
   * 处理接收到的消息
   */
  static handleReceivedMessage(
    event: MessageEvent,
    handlers: Partial<Record<MessageType, (payload: any) => void>>
  ): void {
    try {
      const message: Message = event.data;
      
      if (!this.validateMessage(message)) {
        console.error('收到无效消息:', event.data);
        return;
      }

      const handler = handlers[message.type];
      if (handler) {
        handler(message.payload);
      } else {
        console.warn(`未处理的消息类型: ${message.type}`);
      }
    } catch (error) {
      console.error('处理消息时发生错误:', error);
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.messageQueue.length = 0;
    this.retryAttempts.clear();
  }
}