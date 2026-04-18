/**
 * Worker 管理器 - 负责 Worker 生命周期管理和通信
 */

import { MessageProtocol } from "./message-protocol";
import type {
  Message,
  WorkerConfig,
  WorkerError,
  InitPayload,
  AddBarragePayload,
  RemoveBarragePayload,
  UpdateConfigPayload,
  ResizePayload,
  WorkerBarrageData,
  WorkerState,
} from "./types";
import { WorkerErrorType, MessageType } from "./types";

export class WorkerManager {
  private worker: Worker | null = null;
  private offscreenCanvas: OffscreenCanvas | null = null;
  private messageProtocol: MessageProtocol;
  private isInitialized: boolean = false;
  private isSupported: boolean = false;
  private eventHandlers: Map<string, Function> = new Map();

  constructor() {
    this.messageProtocol = new MessageProtocol();
    this.checkBrowserSupport();
  }

  /**
   * 检查浏览器支持情况
   */
  private checkBrowserSupport(): void {
    this.isSupported =
      typeof Worker !== "undefined" &&
      typeof OffscreenCanvas !== "undefined" &&
      HTMLCanvasElement.prototype.transferControlToOffscreen !== undefined;

    if (!this.isSupported) {
      console.warn("浏览器不支持 Worker 离屏渲染功能");
    }
  }

  /**
   * 获取浏览器支持状态
   */
  getBrowserSupport(): boolean {
    return this.isSupported;
  }

  /**
   * 初始化 Worker 和 OffscreenCanvas
   */
  async initialize(
    canvas: HTMLCanvasElement,
    config: WorkerConfig,
  ): Promise<boolean> {
    if (!this.isSupported) {
      throw new Error("浏览器不支持 Worker 离屏渲染");
    }

    try {
      // 创建 Worker
      this.worker = new Worker(
        new URL("./barrage-worker.ts", import.meta.url),
        {
          type: "module",
        },
      );

      // 设置错误处理
      this.worker.onerror = this.handleWorkerError.bind(this);
      this.worker.onmessageerror = this.handleWorkerMessageError.bind(this);
      this.worker.onmessage = this.handleWorkerMessage.bind(this);

      // 转移 Canvas 控制权
      this.offscreenCanvas = canvas.transferControlToOffscreen();

      // config 可能是 Vue Proxy 对象，必须先转成 plain object 才能被结构化克隆
      const plainConfig: WorkerConfig = JSON.parse(JSON.stringify(config));

      // 发送 INIT 消息，canvas 通过 transfer 传递
      this.worker.postMessage(
        {
          type: MessageType.INIT,
          timestamp: Date.now(),
          canvas: this.offscreenCanvas,
          config: plainConfig,
        },
        [this.offscreenCanvas],
      );

      // 等待 Worker 准备就绪
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Worker 初始化超时"));
        }, 5000);

        const readyHandler = () => {
          clearTimeout(timeout);
          this.isInitialized = true;
          resolve(true);
        };

        this.eventHandlers.set("ready", readyHandler);
      });
    } catch (error) {
      const workerError: WorkerError = {
        type: WorkerErrorType.INITIALIZATION_FAILED,
        message: `Worker 初始化失败: ${error}`,
        originalError: error as Error,
        timestamp: Date.now(),
      };

      this.handleError(workerError);
      return false;
    }
  }

  /**
   * 添加弹幕
   */
  async addBarrage(barrage: WorkerBarrageData): Promise<void> {
    if (!this.isInitialized || !this.worker) {
      throw new Error("Worker 未初始化");
    }

    const message = MessageProtocol.createMessage(MessageType.ADD_BARRAGE, {
      barrage,
    } as AddBarragePayload);

    await this.messageProtocol.sendMessage(this.worker, message);
  }

  /**
   * 批量添加弹幕
   */
  async addBarrages(barrages: WorkerBarrageData[]): Promise<void> {
    if (!this.isInitialized || !this.worker) {
      throw new Error("Worker 未初始化");
    }

    // 使用批量消息优化通信
    const batchMessage = MessageProtocol.createBatchMessage(
      barrages.map((barrage) => ({
        type: MessageType.ADD_BARRAGE,
        payload: { barrage },
      })),
    );

    await this.messageProtocol.sendMessage(this.worker, batchMessage);
  }

  /**
   * 移除弹幕
   */
  async removeBarrage(id: string): Promise<void> {
    if (!this.isInitialized || !this.worker) {
      throw new Error("Worker 未初始化");
    }

    const message = MessageProtocol.createMessage(MessageType.REMOVE_BARRAGE, {
      id,
    } as RemoveBarragePayload);

    await this.messageProtocol.sendMessage(this.worker, message);
  }

  /**
   * 清空所有弹幕
   */
  async clearBarrages(): Promise<void> {
    if (!this.isInitialized || !this.worker) {
      throw new Error("Worker 未初始化");
    }

    const message = MessageProtocol.createMessage(MessageType.CLEAR_BARRAGES);
    await this.messageProtocol.sendMessage(this.worker, message);
  }

  /**
   * 暂停渲染
   */
  async pause(): Promise<void> {
    if (!this.isInitialized || !this.worker) {
      throw new Error("Worker 未初始化");
    }

    const message = MessageProtocol.createMessage(MessageType.PAUSE);
    await this.messageProtocol.sendMessage(this.worker, message);
  }

  /**
   * 恢复渲染
   */
  async resume(): Promise<void> {
    if (!this.isInitialized || !this.worker) {
      throw new Error("Worker 未初始化");
    }

    const message = MessageProtocol.createMessage(MessageType.RESUME);
    await this.messageProtocol.sendMessage(this.worker, message);
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<WorkerConfig>): Promise<void> {
    if (!this.isInitialized || !this.worker) {
      throw new Error("Worker 未初始化");
    }

    const message = MessageProtocol.createMessage(MessageType.UPDATE_CONFIG, {
      config,
    } as UpdateConfigPayload);

    await this.messageProtocol.sendMessage(this.worker, message);
  }

  /**
   * 调整 Canvas 尺寸
   */
  async resize(width: number, height: number): Promise<void> {
    if (!this.isInitialized || !this.worker) {
      throw new Error("Worker 未初始化");
    }

    const message = MessageProtocol.createMessage(MessageType.RESIZE, {
      width,
      height,
    } as ResizePayload);

    await this.messageProtocol.sendMessage(this.worker, message);
  }

  /**
   * 获取当前状态
   */
  async getState(): Promise<WorkerState> {
    if (!this.isInitialized || !this.worker) {
      throw new Error("Worker 未初始化");
    }

    const message = MessageProtocol.createMessage(MessageType.SYNC_STATE);
    await this.messageProtocol.sendMessage(this.worker, message);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("获取状态超时"));
      }, 3000);

      const stateHandler = (state: WorkerState) => {
        clearTimeout(timeout);
        resolve(state);
      };

      this.eventHandlers.set("state_response", stateHandler);
    });
  }

  /**
   * 终止 Worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.offscreenCanvas = null;
    this.isInitialized = false;
    this.messageProtocol.cleanup();
    this.eventHandlers.clear();
  }

  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(event: MessageEvent): void {
    MessageProtocol.handleReceivedMessage(event, {
      [MessageType.READY]: () => {
        const handler = this.eventHandlers.get("ready");
        if (handler) {
          handler();
          this.eventHandlers.delete("ready");
        }
      },
      [MessageType.ERROR]: (payload: { error: WorkerError }) => {
        this.handleError(payload.error);
      },
      [MessageType.STATE_RESPONSE]: (payload: WorkerState) => {
        const handler = this.eventHandlers.get("state_response");
        if (handler) {
          handler(payload);
          this.eventHandlers.delete("state_response");
        }
      },
    });
  }

  /**
   * 处理 Worker 错误
   */
  private handleWorkerError(error: ErrorEvent): void {
    const workerError: WorkerError = {
      type: WorkerErrorType.WORKER_CRASHED,
      message: `Worker 运行时错误: ${error.message}`,
      originalError: new Error(error.message),
      timestamp: Date.now(),
    };

    this.handleError(workerError);
  }

  /**
   * 处理 Worker 消息错误
   */
  private handleWorkerMessageError(error: MessageEvent): void {
    const workerError: WorkerError = {
      type: WorkerErrorType.COMMUNICATION_ERROR,
      message: `Worker 消息错误: ${error}`,
      timestamp: Date.now(),
    };

    this.handleError(workerError);
  }

  /**
   * 统一错误处理
   */
  private handleError(error: WorkerError): void {
    console.error("Worker 错误:", error);

    // 触发错误回调
    const errorHandler = this.eventHandlers.get("error");
    if (errorHandler) {
      errorHandler(error);
    }

    // 严重错误时自动终止 Worker
    if (error.type === WorkerErrorType.WORKER_CRASHED) {
      this.terminate();
    }
  }

  /**
   * 注册事件处理器
   */
  on(event: string, handler: Function): void {
    this.eventHandlers.set(event, handler);
  }

  /**
   * 移除事件处理器
   */
  off(event: string): void {
    this.eventHandlers.delete(event);
  }

  /**
   * 获取初始化状态
   */
  isWorkerInitialized(): boolean {
    return this.isInitialized;
  }
}
