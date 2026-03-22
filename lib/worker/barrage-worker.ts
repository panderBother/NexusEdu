/**
 * 弹幕 Worker 线程 - 负责离屏渲染
 */

import { MessageProtocol } from './message-protocol';
import { 
  Message, 
  MessageType, 
  WorkerConfig, 
  WorkerBarrageData, 
  WorkerError, 
  WorkerErrorType,
  WorkerState,
  InitPayload,
  AddBarragePayload,
  RemoveBarragePayload,
  UpdateConfigPayload,
  ResizePayload
} from './types';

// Worker 渲染引擎
class WorkerRenderEngine {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private barrages: Map<string, BarrageItem> = new Map();
  private config: WorkerConfig | null = null;
  private animationId: number = 0;
  private isPaused: boolean = false;
  private lastFrameTime: number = 0;
  private frameInterval: number = 16.67; // 60 FPS

  /**
   * 初始化渲染引擎
   */
  initialize(canvas: OffscreenCanvas, config: WorkerConfig): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.frameInterval = 1000 / config.fps;

    if (!this.ctx) {
      throw new Error('无法获取 OffscreenCanvas 2D 上下文');
    }

    // 设置 Canvas 尺寸
    this.canvas.width = config.canvasWidth;
    this.canvas.height = config.canvasHeight;

    // 设置默认样式
    this.ctx.textBaseline = 'top';
    this.ctx.globalAlpha = config.opacity;

    // 开始渲染循环
    this.startRenderLoop();
  }

  /**
   * 添加弹幕
   */
  addBarrage(barrage: WorkerBarrageData): void {
    const barrageItem = new BarrageItem(barrage, this.config!);
    this.barrages.set(barrage.id, barrageItem);

    // 性能优化：如果弹幕数量超过阈值，启用优化策略
    if (this.config!.enableOptimization && this.barrages.size > this.config!.maxBarrages) {
      this.optimizeBarrages();
    }
  }

  /**
   * 批量添加弹幕
   */
  addBarrages(barrages: WorkerBarrageData[]): void {
    barrages.forEach(barrage => {
      const barrageItem = new BarrageItem(barrage, this.config!);
      this.barrages.set(barrage.id, barrageItem);
    });

    if (this.config!.enableOptimization && this.barrages.size > this.config!.maxBarrages) {
      this.optimizeBarrages();
    }
  }

  /**
   * 移除弹幕
   */
  removeBarrage(id: string): void {
    this.barrages.delete(id);
  }

  /**
   * 清空所有弹幕
   */
  clearBarrages(): void {
    this.barrages.clear();
  }

  /**
   * 暂停渲染
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * 恢复渲染
   */
  resume(): void {
    this.isPaused = false;
    if (this.animationId === 0) {
      this.startRenderLoop();
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<WorkerConfig>): void {
    if (this.config) {
      Object.assign(this.config, newConfig);
      
      // 更新帧率
      if (newConfig.fps) {
        this.frameInterval = 1000 / newConfig.fps;
      }
      
      // 更新透明度
      if (newConfig.opacity !== undefined && this.ctx) {
        this.ctx.globalAlpha = newConfig.opacity;
      }
    }
  }

  /**
   * 调整 Canvas 尺寸
   */
  resize(width: number, height: number): void {
    if (this.canvas && this.config) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.config.canvasWidth = width;
      this.config.canvasHeight = height;
    }
  }

  /**
   * 获取当前状态
   */
  getState(): WorkerState {
    const barrageData: WorkerBarrageData[] = [];
    this.barrages.forEach(item => {
      barrageData.push(item.data);
    });

    return {
      barrages: barrageData,
      config: this.config!,
      isPaused: this.isPaused,
      currentTime: Date.now()
    };
  }

  /**
   * 开始渲染循环
   */
  private startRenderLoop(): void {
    const render = (currentTime: number) => {
      if (this.isPaused) {
        this.animationId = 0;
        return;
      }

      // 控制帧率
      if (currentTime - this.lastFrameTime >= this.frameInterval) {
        this.render(currentTime - this.lastFrameTime);
        this.lastFrameTime = currentTime;
      }

      this.animationId = requestAnimationFrame(render);
    };

    this.animationId = requestAnimationFrame(render);
  }

  /**
   * 渲染一帧
   */
  private render(deltaTime: number): void {
    if (!this.ctx || !this.canvas) return;

    try {
      // 清空画布
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // 更新和渲染弹幕
      const barragesToRemove: string[] = [];
      
      this.barrages.forEach((barrage, id) => {
        barrage.update(deltaTime);
        
        if (barrage.isOutOfBounds(this.canvas!.width)) {
          barragesToRemove.push(id);
        } else if (barrage.isActive) {
          barrage.render(this.ctx!);
        }
      });

      // 移除超出边界的弹幕
      barragesToRemove.forEach(id => {
        this.barrages.delete(id);
      });

    } catch (error) {
      // 发送渲染错误到主线程
      const workerError: WorkerError = {
        type: WorkerErrorType.RENDER_ERROR,
        message: `渲染错误: ${error}`,
        originalError: error as Error,
        timestamp: Date.now()
      };
      
      this.sendErrorToMain(workerError);
    }
  }

  /**
   * 性能优化策略
   */
  private optimizeBarrages(): void {
    // 移除最旧的弹幕
    const barrageArray = Array.from(this.barrages.entries());
    barrageArray.sort((a, b) => a[1].data.timestamp - b[1].data.timestamp);
    
    const removeCount = this.barrages.size - this.config!.maxBarrages;
    for (let i = 0; i < removeCount; i++) {
      this.barrages.delete(barrageArray[i][0]);
    }
  }

  /**
   * 发送错误到主线程
   */
  private sendErrorToMain(error: WorkerError): void {
    const errorMessage = MessageProtocol.createErrorMessage(error);
    self.postMessage(errorMessage);
  }
}

// 弹幕项类
class BarrageItem {
  data: WorkerBarrageData;
  currentX: number;
  currentY: number;
  isActive: boolean = true;
  private startTime: number;

  constructor(data: WorkerBarrageData, config: WorkerConfig) {
    this.data = data;
    this.currentX = data.x;
    this.currentY = data.y;
    this.startTime = Date.now();

    // 根据弹幕类型初始化位置
    if (data.barrageType === 'scroll') {
      this.currentX = config.canvasWidth; // 从右侧开始
    }
  }

  /**
   * 更新弹幕位置
   */
  update(deltaTime: number): void {
    if (!this.isActive) return;

    const deltaSeconds = deltaTime / 1000;

    switch (this.data.barrageType) {
      case 'scroll':
        // 滚动弹幕从右向左移动
        this.currentX -= this.data.speed * deltaSeconds;
        break;
        
      case 'fixed':
        // 固定弹幕检查是否超时
        if (this.data.duration) {
          const elapsed = Date.now() - this.startTime;
          if (elapsed > this.data.duration) {
            this.isActive = false;
          }
        }
        break;
        
      case 'senior':
        // 高级弹幕的复杂运动逻辑
        if (this.data.seniorConfig) {
          this.updateSeniorBarrage(deltaSeconds);
        }
        break;
    }
  }

  /**
   * 更新高级弹幕位置
   */
  private updateSeniorBarrage(deltaSeconds: number): void {
    const config = this.data.seniorConfig!;
    const elapsed = Date.now() - this.startTime;
    
    if (elapsed < config.delay) {
      // 延迟阶段，保持在起始位置
      this.currentX = config.startLocation.x;
      this.currentY = config.startLocation.y;
    } else if (elapsed < config.delay + config.motionDuration) {
      // 运动阶段
      const motionProgress = (elapsed - config.delay) / config.motionDuration;
      this.currentX = config.startLocation.x + 
        (config.endLocation.x - config.startLocation.x) * motionProgress;
      this.currentY = config.startLocation.y + 
        (config.endLocation.y - config.startLocation.y) * motionProgress;
    } else if (elapsed < config.totalDuration) {
      // 结束阶段，保持在结束位置
      this.currentX = config.endLocation.x;
      this.currentY = config.endLocation.y;
    } else {
      // 超时，标记为非活跃
      this.isActive = false;
    }
  }

  /**
   * 渲染弹幕
   */
  render(ctx: OffscreenCanvasRenderingContext2D): void {
    if (!this.isActive) return;

    ctx.save();
    
    // 设置字体样式
    ctx.font = `${this.data.fontSize}px ${this.data.fontFamily}`;
    ctx.fillStyle = this.data.color;
    ctx.globalAlpha = this.data.opacity;
    
    // 绘制文本
    ctx.fillText(this.data.text, this.currentX, this.currentY);
    
    ctx.restore();
  }

  /**
   * 检查是否超出边界
   */
  isOutOfBounds(canvasWidth: number): boolean {
    switch (this.data.barrageType) {
      case 'scroll':
        // 滚动弹幕完全移出左侧边界
        return this.currentX + this.getTextWidth() < 0;
      case 'fixed':
      case 'senior':
        // 固定和高级弹幕通过时间控制
        return !this.isActive;
      default:
        return false;
    }
  }

  /**
   * 获取文本宽度（简单估算）
   */
  private getTextWidth(): number {
    // 简单估算，实际应该使用 measureText
    return this.data.text.length * this.data.fontSize * 0.6;
  }
}

// Worker 全局实例
const renderEngine = new WorkerRenderEngine();

// 处理主线程消息
self.onmessage = (event: MessageEvent) => {
  const data = event.data;

  // INIT 消息：canvas 和 config 一起到达
  if (data?.type === MessageType.INIT) {
    try {
      const canvas = data.canvas as OffscreenCanvas;
      const config = data.config;
      console.log('[Worker] received INIT, canvas:', canvas, 'config:', config);
      if (!canvas) throw new Error('canvas 为空');
      renderEngine.initialize(canvas, config);
      self.postMessage(MessageProtocol.createMessage(MessageType.READY));
    } catch (error) {
      const workerError: WorkerError = {
        type: WorkerErrorType.INITIALIZATION_FAILED,
        message: `Worker 初始化失败: ${error}`,
        originalError: error as Error,
        timestamp: Date.now()
      };
      self.postMessage(MessageProtocol.createErrorMessage(workerError));
    }
    return;
  }

  MessageProtocol.handleReceivedMessage(event, {
    [MessageType.ADD_BARRAGE]: (payload: any) => {
      if (payload.batch) {
        // 批量添加
        const barrages = payload.messages
          .filter((msg: any) => msg.type === MessageType.ADD_BARRAGE)
          .map((msg: any) => msg.payload.barrage);
        renderEngine.addBarrages(barrages);
      } else {
        // 单个添加
        renderEngine.addBarrage(payload.barrage);
      }
    },

    [MessageType.REMOVE_BARRAGE]: (payload: RemoveBarragePayload) => {
      renderEngine.removeBarrage(payload.id);
    },

    [MessageType.CLEAR_BARRAGES]: () => {
      renderEngine.clearBarrages();
    },

    [MessageType.PAUSE]: () => {
      renderEngine.pause();
    },

    [MessageType.RESUME]: () => {
      renderEngine.resume();
    },

    [MessageType.UPDATE_CONFIG]: (payload: UpdateConfigPayload) => {
      renderEngine.updateConfig(payload.config);
    },

    [MessageType.RESIZE]: (payload: ResizePayload) => {
      renderEngine.resize(payload.width, payload.height);
    },

    [MessageType.SYNC_STATE]: () => {
      const state = renderEngine.getState();
      const stateMessage = MessageProtocol.createMessage(MessageType.STATE_RESPONSE, state);
      self.postMessage(stateMessage);
    }
  });
};