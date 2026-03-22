/**
 * 兼容性层 - 保持现有 API 的兼容性，透明地处理 Worker 模式和主线程模式
 */

import { WorkerManager } from './worker-manager';
import { WorkerConfig, WorkerBarrageData, WorkerError } from './types';
import { BarrageOptions } from '../barrage';
import BarrageRenderer from '../index';

export class CompatibilityLayer {
  private workerManager: WorkerManager;
  private fallbackRenderer: BarrageRenderer | null = null;
  private isWorkerMode: boolean = false;
  private isInitialized: boolean = false;
  private canvas: HTMLCanvasElement | null = null;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private config: WorkerConfig | null = null;

  constructor() {
    this.workerManager = new WorkerManager();
    this.setupErrorHandling();
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    this.workerManager.on('error', (error: WorkerError) => {
      console.error('Worker 错误，回退到主线程渲染:', error);
      this.fallbackToMainThread();
    });
  }

  /**
   * 初始化兼容性层
   * 注意：不能对已有 rendering context 的 canvas 调用 transferControlToOffscreen，
   * 因此这里创建一个独立的 overlay canvas 供 Worker 使用。
   */
  async initialize(
    canvas: HTMLCanvasElement, 
    originalRenderer: BarrageRenderer,
    enableWorkerMode: boolean = true
  ): Promise<void> {
    this.canvas = canvas;
    this.fallbackRenderer = originalRenderer;
    
    // 从原始渲染器提取配置
    this.config = this.extractConfig(originalRenderer);

    if (enableWorkerMode && this.workerManager.getBrowserSupport()) {
      try {
        await this.enableWorkerMode();
      } catch (error) {
        console.warn('Worker 模式启用失败，使用主线程模式:', error);
        this.isWorkerMode = false;
      }
    } else {
      this.isWorkerMode = false;
    }

    this.isInitialized = true;
  }

  /**
   * 创建一个叠加在原始 canvas 上的独立 overlay canvas，供 Worker 使用
   */
  private createOverlayCanvas(referenceCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const overlay = document.createElement('canvas');
    overlay.width = referenceCanvas.width;
    overlay.height = referenceCanvas.height;
    overlay.style.position = 'absolute';
    overlay.style.left = referenceCanvas.style.left || '0px';
    overlay.style.top = referenceCanvas.style.top || '0px';
    overlay.style.width = referenceCanvas.style.width;
    overlay.style.height = referenceCanvas.style.height;
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '1';
    referenceCanvas.parentElement?.appendChild(overlay);
    this.overlayCanvas = overlay;
    return overlay;
  }

  /**
   * 从原始渲染器提取配置
   */
  private extractConfig(renderer: BarrageRenderer): WorkerConfig {
    // 用展开运算符确保返回 plain object，避免 Vue Proxy 包装导致 structuredClone 失败
    return {
      canvasWidth: renderer.canvasSize.width,
      canvasHeight: renderer.canvasSize.height,
      fps: 60,
      maxBarrages: 1000,
      enableOptimization: true,
      speed: renderer.renderConfig.speed,
      opacity: renderer.renderConfig.opacity,
      fontFamily: renderer.renderConfig.fontFamily,
      fontWeight: renderer.renderConfig.fontWeight,
      avoidOverlap: renderer.renderConfig.avoidOverlap,
      minSpace: renderer.renderConfig.minSpace ?? 10,
    };
  }

  /**
   * 启用 Worker 模式（使用独立的 overlay canvas，避免与已有 context 冲突）
   */
  async enableWorkerMode(): Promise<void> {
    if (!this.canvas || !this.config) {
      throw new Error('Canvas 或配置未初始化');
    }

    // 创建独立的 overlay canvas，避免 transferControlToOffscreen 与已有 context 冲突
    const overlayCanvas = this.createOverlayCanvas(this.canvas);

    const success = await this.workerManager.initialize(overlayCanvas, this.config);
    if (success) {
      this.isWorkerMode = true;
      console.log('Worker 离屏渲染模式已启用（overlay canvas）');
    } else {
      overlayCanvas.parentElement?.removeChild(overlayCanvas);
      throw new Error('Worker 初始化失败');
    }
  }

  /**
   * 禁用 Worker 模式，回退到主线程
   */
  async disableWorkerMode(): Promise<void> {
    if (this.isWorkerMode) {
      // 获取当前状态
      let currentState = null;
      try {
        currentState = await this.workerManager.getState();
      } catch (error) {
        console.warn('无法获取 Worker 状态:', error);
      }

      // 终止 Worker
      this.workerManager.terminate();
      this.isWorkerMode = false;

      // 清理 overlay canvas
      if (this.overlayCanvas) {
        this.overlayCanvas.parentElement?.removeChild(this.overlayCanvas);
        this.overlayCanvas = null;
      }

      // 如果有状态，同步到主线程渲染器
      if (currentState && this.fallbackRenderer) {
        this.syncStateToMainThread(currentState);
      }

      console.log('已切换到主线程渲染模式');
    }
  }

  /**
   * 回退到主线程渲染
   */
  private async fallbackToMainThread(): Promise<void> {
    await this.disableWorkerMode();
  }

  /**
   * 同步状态到主线程渲染器
   */
  private syncStateToMainThread(state: any): void {
    if (!this.fallbackRenderer) return;

    // 将 Worker 弹幕数据转换为主线程格式
    const barrages = state.barrages.map((barrage: WorkerBarrageData) => 
      this.convertWorkerBarrageToOriginal(barrage)
    );

    // 设置弹幕数据
    this.fallbackRenderer.setBarrages(barrages);

    // 同步配置
    this.fallbackRenderer.setRenderConfig({
      speed: state.config.speed,
      opacity: state.config.opacity,
      fontFamily: state.config.fontFamily,
      fontWeight: state.config.fontWeight,
      avoidOverlap: state.config.avoidOverlap,
      minSpace: state.config.minSpace
    });
  }

  /**
   * 动态切换渲染模式
   */
  async setWorkerMode(enabled: boolean): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('兼容性层未初始化');
    }

    if (enabled && !this.isWorkerMode) {
      await this.enableWorkerMode();
    } else if (!enabled && this.isWorkerMode) {
      await this.disableWorkerMode();
    }
  }

  /**
   * 添加弹幕 - 兼容原始 API
   */
  async addBarrage(barrage: BarrageOptions): Promise<void> {
    if (this.isWorkerMode) {
      const workerBarrage = this.convertOriginalBarrageToWorker(barrage);
      await this.workerManager.addBarrage(workerBarrage);
    } else if (this.fallbackRenderer) {
      this.fallbackRenderer.send(barrage);
    }
  }

  /**
   * 批量添加弹幕
   */
  async addBarrages(barrages: BarrageOptions[]): Promise<void> {
    if (this.isWorkerMode) {
      const workerBarrages = barrages.map(barrage => 
        this.convertOriginalBarrageToWorker(barrage)
      );
      await this.workerManager.addBarrages(workerBarrages);
    } else if (this.fallbackRenderer) {
      this.fallbackRenderer.setBarrages(barrages);
    }
  }

  /**
   * 移除弹幕
   */
  async removeBarrage(id: string): Promise<void> {
    if (this.isWorkerMode) {
      await this.workerManager.removeBarrage(id);
    } else {
      // 主线程模式下的移除逻辑（需要扩展原始渲染器）
      console.warn('主线程模式下暂不支持单独移除弹幕');
    }
  }

  /**
   * 清空所有弹幕
   */
  async clearBarrages(): Promise<void> {
    if (this.isWorkerMode) {
      await this.workerManager.clearBarrages();
    } else if (this.fallbackRenderer) {
      this.fallbackRenderer.setBarrages([]);
    }
  }

  /**
   * 暂停弹幕
   */
  async pause(): Promise<void> {
    if (this.isWorkerMode) {
      await this.workerManager.pause();
    } else if (this.fallbackRenderer) {
      this.fallbackRenderer.pause();
    }
  }

  /**
   * 恢复弹幕
   */
  async resume(): Promise<void> {
    if (this.isWorkerMode) {
      await this.workerManager.resume();
    } else if (this.fallbackRenderer) {
      this.fallbackRenderer.play();
    }
  }

  /**
   * 更新渲染配置
   */
  async updateConfig(config: Partial<WorkerConfig>): Promise<void> {
    if (this.config) {
      Object.assign(this.config, config);
    }

    if (this.isWorkerMode) {
      await this.workerManager.updateConfig(config);
    } else if (this.fallbackRenderer) {
      // 转换配置格式
      const originalConfig: any = {};
      if (config.speed !== undefined) originalConfig.speed = config.speed;
      if (config.opacity !== undefined) originalConfig.opacity = config.opacity;
      if (config.fontFamily !== undefined) originalConfig.fontFamily = config.fontFamily;
      if (config.fontWeight !== undefined) originalConfig.fontWeight = config.fontWeight;
      if (config.avoidOverlap !== undefined) originalConfig.avoidOverlap = config.avoidOverlap;
      if (config.minSpace !== undefined) originalConfig.minSpace = config.minSpace;
      
      this.fallbackRenderer.setRenderConfig(originalConfig);
    }
  }

  /**
   * 调整尺寸
   */
  async resize(width: number, height: number): Promise<void> {
    if (this.config) {
      this.config.canvasWidth = width;
      this.config.canvasHeight = height;
    }

    if (this.isWorkerMode) {
      await this.workerManager.resize(width, height);
    } else if (this.fallbackRenderer) {
      this.fallbackRenderer.resize();
    }
  }

  /**
   * 转换原始弹幕格式到 Worker 格式
   */
  private convertOriginalBarrageToWorker(barrage: BarrageOptions): WorkerBarrageData {
    const baseData: WorkerBarrageData = {
      id: barrage.id,
      text: barrage.text,
      x: 0, // 将在 Worker 中计算
      y: 0, // 将在 Worker 中计算
      speed: this.config?.speed || 200,
      color: barrage.color,
      fontSize: barrage.fontSize,
      fontFamily: this.config?.fontFamily || 'Arial',
      opacity: this.config?.opacity || 1,
      timestamp: barrage.time,
      barrageType: (barrage.barrageType === 'top' || barrage.barrageType === 'bottom') ? 'fixed' : barrage.barrageType as 'scroll' | 'senior' | 'fixed'
    };

    // 根据弹幕类型添加特定属性
    switch (barrage.barrageType) {
      case 'scroll':
        // 滚动弹幕特有属性
        break;
      case 'top':
      case 'bottom':
        baseData.barrageType = 'fixed';
        baseData.duration = (barrage as any).duration;
        baseData.position = barrage.barrageType;
        break;
      case 'senior':
        baseData.seniorConfig = (barrage as any).seniorBarrageConfig;
        break;
    }

    return baseData;
  }

  /**
   * 转换 Worker 弹幕格式到原始格式
   */
  private convertWorkerBarrageToOriginal(barrage: WorkerBarrageData): BarrageOptions {
    const baseOptions: any = {
      id: barrage.id,
      text: barrage.text,
      time: barrage.timestamp,
      fontSize: barrage.fontSize,
      color: barrage.color,
      lineHeight: 1.2 // 默认行高
    };

    // 根据弹幕类型设置特定属性
    switch (barrage.barrageType) {
      case 'scroll':
        baseOptions.barrageType = 'scroll';
        break;
      case 'fixed':
        baseOptions.barrageType = barrage.position || 'top';
        baseOptions.duration = barrage.duration;
        break;
      case 'senior':
        baseOptions.barrageType = 'senior';
        baseOptions.seniorBarrageConfig = barrage.seniorConfig;
        break;
    }

    return baseOptions as BarrageOptions;
  }

  /**
   * 获取当前模式
   */
  getCurrentMode(): 'worker' | 'main' {
    return this.isWorkerMode ? 'worker' : 'main';
  }

  /**
   * 检查是否支持 Worker 模式
   */
  isWorkerSupported(): boolean {
    return this.workerManager.getBrowserSupport();
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.isWorkerMode) {
      this.workerManager.terminate();
    }
    if (this.overlayCanvas) {
      this.overlayCanvas.parentElement?.removeChild(this.overlayCanvas);
      this.overlayCanvas = null;
    }
    this.isInitialized = false;
    this.canvas = null;
    this.config = null;
  }
}