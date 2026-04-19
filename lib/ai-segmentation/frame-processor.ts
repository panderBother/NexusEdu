/**
 * 视频帧处理器
 * 负责从视频元素捕获帧数据并转换为 AI 模型可处理的格式
 */

import type { IFrameProcessor } from './interfaces';
import { type FrameProcessingStats, AISegmentationError } from './types';
import { ErrorHandler } from './error-handler';

export class FrameProcessor implements IFrameProcessor {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private targetFPS: number = 30;
  private stats: FrameProcessingStats;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private droppedFrames: number = 0;
  private processingTimes: number[] = [];
  private isDisposed: boolean = false;
  private errorHandler: ErrorHandler;
  private consecutiveErrors: number = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 5;
  private adaptiveQuality: boolean = true;
  private currentMaxSize: number = 640;

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: false // 优化性能，不需要透明度
    });
    
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    
    this.ctx = context;
    this.stats = this.initializeStats();
    this.errorHandler = new ErrorHandler();
  }

  /**
   * 初始化处理器
   */
  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    if (this.isDisposed) {
      console.log('🤖 AI Debug: FrameProcessor has been disposed, cannot initialize');
      throw new Error('FrameProcessor has been disposed');
    }

    console.log('🤖 AI Debug: Initializing FrameProcessor...');
    console.log(`🤖 AI Debug: Video element dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);

    this.videoElement = videoElement;
    this.updateCanvasSize();
    
    console.log(`🤖 AI Debug: Canvas size set to: ${this.canvas.width}x${this.canvas.height}`);
    
    // 监听视频尺寸变化
    this.videoElement.addEventListener('loadedmetadata', this.handleVideoMetadataLoaded.bind(this));
    this.videoElement.addEventListener('resize', this.handleVideoResize.bind(this));
    
    // 重置统计信息
    this.resetStats();
    
    console.log('🤖 AI Debug: FrameProcessor initialized successfully');
  }

  /**
   * 捕获当前帧
   */
  captureFrame(): ImageData | null {
    if (!this.videoElement || this.isDisposed) {
      console.log('🤖 AI Debug: Cannot capture frame - video element not available or disposed');
      return null;
    }

    // 检查视频是否准备就绪
    if (this.videoElement.readyState < 2) {
      console.log('🤖 AI Debug: Video not ready for frame capture (readyState < 2)');
      return null;
    }

    // 如果连续错误过多，暂时停止处理
    if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      console.warn('🤖 AI Debug: Too many consecutive frame processing errors, temporarily stopping');
      return null;
    }

    console.log('🤖 AI Debug: Capturing video frame...');

    // 帧率控制
    const now = performance.now();
    const frameInterval = 1000 / this.targetFPS;
    
    if (now - this.lastFrameTime < frameInterval) {
      this.droppedFrames++;
      return null;
    }

    const startTime = performance.now();

    try {
      // 更新 Canvas 尺寸（如果需要）
      this.updateCanvasSize();

      // 检查视频尺寸是否有效
      if (this.videoElement.videoWidth === 0 || this.videoElement.videoHeight === 0) {
        throw new Error('Invalid video dimensions');
      }

      // 绘制视频帧到 Canvas
      this.ctx.drawImage(
        this.videoElement,
        0, 0, this.videoElement.videoWidth, this.videoElement.videoHeight,
        0, 0, this.canvas.width, this.canvas.height
      );

      // 获取图像数据
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

      // 验证图像数据
      if (!imageData || imageData.data.length === 0) {
        throw new Error('Failed to get valid image data');
      }

      // 更新统计信息
      const processingTime = performance.now() - startTime;
      this.updateStats(processingTime);
      this.lastFrameTime = now;
      this.frameCount++;
      
      // 重置连续错误计数
      this.consecutiveErrors = 0;

      return imageData;
    } catch (error) {
      console.error('Failed to capture frame:', error);
      this.consecutiveErrors++;
      this.droppedFrames++;
      
      // 处理错误并尝试恢复
      this.handleFrameProcessingError(error as Error);
      
      return null;
    }
  }

  /**
   * 设置目标帧率
   */
  setTargetFPS(fps: number): void {
    if (fps <= 0 || fps > 120) {
      throw new Error('Target FPS must be between 1 and 120');
    }
    this.targetFPS = fps;
  }

  /**
   * 获取当前处理统计
   */
  getStats(): FrameProcessingStats {
    return { ...this.stats };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.isDisposed) return;

    if (this.videoElement) {
      this.videoElement.removeEventListener('loadedmetadata', this.handleVideoMetadataLoaded.bind(this));
      this.videoElement.removeEventListener('resize', this.handleVideoResize.bind(this));
    }

    this.videoElement = null;
    this.isDisposed = true;
  }

  /**
   * 更新 Canvas 尺寸以匹配视频
   */
  private updateCanvasSize(): void {
    if (!this.videoElement) return;

    const videoWidth = this.videoElement.videoWidth;
    const videoHeight = this.videoElement.videoHeight;

    if (videoWidth > 0 && videoHeight > 0) {
      // 计算合适的 Canvas 尺寸，保持宽高比
      const maxSize = this.currentMaxSize; // 使用自适应的最大尺寸
      let canvasWidth = videoWidth;
      let canvasHeight = videoHeight;

      if (videoWidth > maxSize || videoHeight > maxSize) {
        const aspectRatio = videoWidth / videoHeight;
        if (videoWidth > videoHeight) {
          canvasWidth = maxSize;
          canvasHeight = Math.round(maxSize / aspectRatio);
        } else {
          canvasHeight = maxSize;
          canvasWidth = Math.round(maxSize * aspectRatio);
        }
      }

      // 只在尺寸发生变化时更新
      if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        // 设置图像平滑
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = this.adaptiveQuality ? 'medium' : 'low';
      }
    }
  }

  /**
   * 处理视频元数据加载完成事件
   */
  private handleVideoMetadataLoaded(): void {
    this.updateCanvasSize();
    this.resetStats();
  }

  /**
   * 处理视频尺寸变化事件
   */
  private handleVideoResize(): void {
    this.updateCanvasSize();
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(): FrameProcessingStats {
    return {
      currentFPS: 0,
      droppedFrames: 0,
      averageProcessingTime: 0,
      lastFrameTimestamp: 0
    };
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.stats = this.initializeStats();
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.processingTimes = [];
    this.lastFrameTime = 0;
  }

  /**
   * 更新统计信息
   */
  private updateStats(processingTime: number): void {
    // 记录处理时间
    this.processingTimes.push(processingTime);
    
    // 保持最近 100 次的处理时间记录
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }

    // 计算平均处理时间
    this.stats.averageProcessingTime = this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;

    // 计算当前 FPS（基于最近 10 帧）
    const now = performance.now();
    if (this.frameCount > 0 && this.frameCount % 10 === 0) {
      const timeDiff = now - this.stats.lastFrameTimestamp;
      if (timeDiff > 0) {
        this.stats.currentFPS = Math.round(10000 / timeDiff); // 10 帧的时间差
      }
    }

    this.stats.droppedFrames = this.droppedFrames;
    this.stats.lastFrameTimestamp = now;
  }

  /**
   * 获取当前 Canvas 尺寸
   */
  getCanvasSize(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  /**
   * 获取视频原始尺寸
   */
  getVideoSize(): { width: number; height: number } | null {
    if (!this.videoElement) return null;
    
    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight
    };
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.videoElement !== null && !this.isDisposed;
  }

  /**
   * 获取视频当前时间
   */
  getCurrentVideoTime(): number {
    return this.videoElement?.currentTime || 0;
  }

  /**
   * 检查视频是否正在播放
   */
  isVideoPlaying(): boolean {
    return this.videoElement ? !this.videoElement.paused : false;
  }

  /**
   * 处理帧处理错误
   */
  private async handleFrameProcessingError(error: Error): Promise<void> {
    try {
      const recoveryAction = await this.errorHandler.handleError(
        AISegmentationError.INVALID_INPUT,
        { error: error.message, frameCount: this.frameCount }
      );

      switch (recoveryAction.type) {
        case 'OPTIMIZE':
          this.applyOptimizationStrategy(recoveryAction.strategy);
          break;
        case 'RETRY':
          // 对于帧处理，重试意味着继续尝试下一帧
          break;
        case 'FALLBACK':
          console.warn('Frame processing falling back to reduced quality');
          this.reduceQuality();
          break;
        case 'ABORT':
          console.error('Frame processing aborted:', recoveryAction.reason);
          break;
      }
    } catch (handlerError) {
      console.error('Error in frame processing error handler:', handlerError);
    }
  }

  /**
   * 应用优化策略
   */
  private applyOptimizationStrategy(strategy: any): void {
    if (strategy.decreaseProcessingFrequency) {
      this.targetFPS = Math.max(10, this.targetFPS * 0.8);
      console.log(`Reduced target FPS to ${this.targetFPS}`);
    }

    if (strategy.clearMemoryCache) {
      // 清理 Canvas 缓存
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (strategy.reduceModelPrecision && this.adaptiveQuality) {
      this.reduceQuality();
    }
  }

  /**
   * 降低处理质量
   */
  private reduceQuality(): void {
    if (this.currentMaxSize > 320) {
      this.currentMaxSize = Math.max(320, this.currentMaxSize * 0.8);
      console.log(`Reduced canvas max size to ${this.currentMaxSize}`);
      this.updateCanvasSize();
    }
  }

  /**
   * 恢复处理质量
   */
  private restoreQuality(): void {
    this.currentMaxSize = 640;
    this.targetFPS = 30;
    this.consecutiveErrors = 0;
    this.updateCanvasSize();
  }

  /**
   * 启用/禁用自适应质量
   */
  setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQuality = enabled;
    if (!enabled) {
      this.restoreQuality();
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): { consecutiveErrors: number; totalErrors: number } {
    return {
      consecutiveErrors: this.consecutiveErrors,
      totalErrors: this.errorHandler.getErrorHistory().length
    };
  }

  /**
   * 重置错误计数
   */
  resetErrorCount(): void {
    this.consecutiveErrors = 0;
    this.errorHandler.clearErrorHistory();
  }

  /**
   * 检查处理器健康状态
   */
  isHealthy(): boolean {
    return this.consecutiveErrors < this.MAX_CONSECUTIVE_ERRORS && 
           this.stats.currentFPS > this.targetFPS * 0.5;
  }
}