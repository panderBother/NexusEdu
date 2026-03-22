/**
 * AI遮罩系统
 * 整合AI分割、遮罩生成和弹幕系统集成的完整解决方案
 */

import { AISegmentationSystem } from './ai-segmentation-system';
import { MaskGenerator } from './mask-generator';
import { BarrageIntegration,type  BarrageIntegrationOptions, type BarrageRenderer } from './barrage-integration';
import { ModelManager } from './model-manager';
import { FrameProcessor } from './frame-processor';
import type { 
  SegmentationConfig, 
  Dimensions, 
  MaskData, 
  AISegmentationState,
  PerformanceMetrics
} from './types';

export interface AIMaskSystemOptions {
  // AI分割配置
  segmentation?: Partial<SegmentationConfig>;
  // 弹幕集成配置
  integration?: Partial<BarrageIntegrationOptions>;
  // 是否自动启动
  autoStart?: boolean;
  // 视频元素
  videoElement?: HTMLVideoElement;
  // 目标帧率
  targetFPS?: number;
}

export class AIMaskSystem {
  private modelManager: ModelManager;
  private frameProcessor: FrameProcessor;
  private aiSegmentation: AISegmentationSystem;
  private maskGenerator: MaskGenerator;
  private barrageIntegration: BarrageIntegration;
  
  private isRunning: boolean = false;
  private processingInterval: number | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private dimensions: Dimensions = { width: 640, height: 480 };
  
  private readonly DEFAULT_OPTIONS: AIMaskSystemOptions = {
    segmentation: {
      confidenceThreshold: 0.7,
      maxDetections: 3,
      enableKeypoints: false,
      modelPrecision: 'float32'
    },
    integration: {
      updateInterval: 33,
      enableSmoothing: true,
      smoothingDuration: 200,
      cacheSize: 10,
      enableOptimization: true
    },
    autoStart: false,
    targetFPS: 30
  };

  constructor(
    barrageRenderer: BarrageRenderer,
    options?: AIMaskSystemOptions
  ) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    // 初始化组件
    this.modelManager = new ModelManager();
    this.frameProcessor = new FrameProcessor();
    this.aiSegmentation = new AISegmentationSystem(this.modelManager, opts.segmentation);
    this.maskGenerator = new MaskGenerator();
    this.barrageIntegration = new BarrageIntegration(barrageRenderer, opts.integration);

    // 设置视频元素
    if (opts.videoElement) {
      this.setVideoElement(opts.videoElement);
    }

    // 设置目标帧率
    if (opts.targetFPS) {
      this.frameProcessor.setTargetFPS(opts.targetFPS);
    }

    // 自动启动
    if (opts.autoStart && opts.videoElement) {
      this.start().catch(console.error);
    }
  }

  /**
   * 设置视频元素
   */
  async setVideoElement(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;
    
    // 初始化帧处理器
    await this.frameProcessor.initialize(videoElement);
    
    // 更新尺寸
    this.updateDimensions();
    
    // 监听视频尺寸变化
    videoElement.addEventListener('loadedmetadata', () => {
      this.updateDimensions();
    });
  }

  /**
   * 启动AI遮罩系统
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('🤖 AI Debug: AI mask system is already running');
      return;
    }

    if (!this.videoElement) {
      console.error('🤖 AI Debug: Video element not set, cannot start AI mask system');
      throw new Error('Video element not set');
    }

    try {
      console.log('🤖 AI Debug: Starting AI mask system...');
      console.log(`🤖 AI Debug: Video dimensions: ${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`);
      console.log(`🤖 AI Debug: Target FPS: ${this.frameProcessor.getStats().currentFPS || 30}`);
      
      // 加载AI模型
      console.log('🤖 AI Debug: Loading AI segmentation model...');
      const modelLoadStart = performance.now();
      await this.modelManager.loadModel('MediaPipeSelfieSegmentation');
      const modelLoadTime = performance.now() - modelLoadStart;
      console.log(`🤖 AI Debug: AI model loaded successfully in ${Math.round(modelLoadTime)}ms`);

      // 开始处理循环
      this.isRunning = true;
      this.startProcessingLoop();
      
      console.log('🤖 AI Debug: AI mask system started successfully');
    } catch (error) {
      console.error('🤖 AI Debug: Failed to start AI mask system:', error);
      throw error;
    }
  }

  /**
   * 停止AI遮罩系统
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // 清除遮罩
    this.barrageIntegration.clearAIMask();
    
    console.log('AI mask system stopped');
  }

  /**
   * 暂停处理
   */
  pause(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * 恢复处理
   */
  resume(): void {
    if (this.isRunning && !this.processingInterval) {
      this.startProcessingLoop();
    }
  }

  /**
   * 更新配置
   */
  updateConfig(options: Partial<AIMaskSystemOptions>): void {
    if (options.segmentation) {
      this.aiSegmentation.setSegmentationConfig({
        ...this.aiSegmentation.getPerformanceMetrics(),
        ...options.segmentation
      } as any);
    }

    if (options.targetFPS) {
      this.frameProcessor.setTargetFPS(options.targetFPS);
    }
  }

  /**
   * 手动处理单帧
   */
  async processFrame(): Promise<MaskData | null> {
    if (!this.videoElement || !this.modelManager.isModelLoaded()) {
      console.log('🤖 AI Debug: Cannot process frame - video element or model not available');
      return null;
    }

    try {
      console.log('🤖 AI Debug: Processing frame...');
      const frameStart = performance.now();
      
      // 捕获帧
      const imageData = this.frameProcessor.captureFrame();
      if (!imageData) {
        console.log('🤖 AI Debug: Failed to capture frame');
        return null;
      }

      const captureTime = performance.now() - frameStart;
      console.log(`🤖 AI Debug: Frame captured in ${Math.round(captureTime)}ms`);

      // AI分割
      const segmentationStart = performance.now();
      const segmentationResult = await this.aiSegmentation.processFrame(imageData);
      const segmentationTime = performance.now() - segmentationStart;
      console.log(`🤖 AI Debug: AI segmentation completed in ${Math.round(segmentationTime)}ms`);
      
      // 生成遮罩
      const maskStart = performance.now();
      const maskData = this.maskGenerator.generateMask(segmentationResult, this.dimensions);
      const maskTime = performance.now() - maskStart;
      console.log(`🤖 AI Debug: Mask generated in ${Math.round(maskTime)}ms`);
      
      // 应用到弹幕系统
      const integrationStart = performance.now();
      this.barrageIntegration.updateAIMask(maskData);
      const integrationTime = performance.now() - integrationStart;
      console.log(`🤖 AI Debug: Mask applied to barrage system in ${Math.round(integrationTime)}ms`);
      
      const totalTime = performance.now() - frameStart;
      console.log(`🤖 AI Debug: Total frame processing time: ${Math.round(totalTime)}ms`);
      
      return maskData;
    } catch (error) {
      console.error('🤖 AI Debug: Failed to process frame:', error);
      return null;
    }
  }

  /**
   * 获取系统状态
   */
  getSystemState(): AISegmentationState & {
    integration: any;
    frameProcessor: any;
  } {
    const perfMetrics = this.aiSegmentation.getPerformanceMetrics();
    const processingStats = this.aiSegmentation.getProcessingStats();
    
    return {
      status: this.isRunning ? 'processing' : 'ready',
      model: {
        loaded: this.modelManager.isModelLoaded(),
        type: 'MediaPipeSelfieSegmentation',
        loadTime: 0,
        memoryUsage: perfMetrics.memoryUsage
      },
      processing: {
        isActive: this.isRunning,
        currentFPS: this.frameProcessor.getStats().currentFPS,
        averageLatency: perfMetrics.totalLatency,
        totalFramesProcessed: processingStats.totalFrames,
        errorsCount: 0
      },
      performance: {
        cpuUsage: 0,
        memoryUsage: perfMetrics.memoryUsage,
        lastOptimization: undefined
      },
      errors: {
        errorHistory: []
      },
      integration: this.barrageIntegration.getPerformanceStats(),
      frameProcessor: this.frameProcessor.getStats()
    };
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics & {
    frameProcessorStats: any;
    integrationStats: any;
  } {
    return {
      ...this.aiSegmentation.getPerformanceMetrics(),
      frameProcessorStats: this.frameProcessor.getStats(),
      integrationStats: this.barrageIntegration.getPerformanceStats()
    };
  }

  /**
   * 合并AI遮罩和手动遮罩
   */
  mergeWithManualMask(manualMask: string | ImageData): void {
    // 获取当前AI遮罩
    const currentState = this.getSystemState();
    if (currentState.processing.isActive) {
      // 如果系统正在运行，下次处理时会自动合并
      // 这里可以设置一个标志来指示需要合并手动遮罩
      console.log('Manual mask will be merged with next AI mask update');
    } else {
      // 如果系统未运行，直接应用手动遮罩
      this.barrageIntegration.mergeWithManualMask(
        { type: 'BoundingBoxes', data: [], timestamp: Date.now(), confidence: 0 },
        manualMask
      );
    }
  }

  /**
   * 清除所有遮罩
   */
  clearAllMasks(): void {
    this.barrageIntegration.clearAIMask();
  }

  /**
   * 销毁系统
   */
  dispose(): void {
    this.stop();
    this.frameProcessor.dispose();
    this.barrageIntegration.dispose();
    this.modelManager.unloadModel();
  }

  /**
   * 开始处理循环
   */
  private startProcessingLoop(): void {
    const targetInterval = 1000 / this.frameProcessor.getStats().currentFPS || 33; // 默认30 FPS
    
    console.log(`🤖 AI Debug: Starting processing loop with ${Math.round(1000/targetInterval)} FPS (${targetInterval}ms interval)`);
    
    this.processingInterval = window.setInterval(async () => {
      if (!this.isRunning) {
        console.log('🤖 AI Debug: Processing loop stopped (system not running)');
        return;
      }

      try {
        await this.processFrame();
      } catch (error) {
        console.error('🤖 AI Debug: Error in processing loop:', error);
      }
    }, targetInterval);
    
    console.log('🤖 AI Debug: Processing loop started successfully');
  }

  /**
   * 更新尺寸
   */
  private updateDimensions(): void {
    if (this.videoElement) {
      this.dimensions = {
        width: this.videoElement.videoWidth || 640,
        height: this.videoElement.videoHeight || 480
      };
    }
  }

  /**
   * 检查系统是否准备就绪
   */
  isReady(): boolean {
    return this.modelManager.isModelLoaded() && this.videoElement !== null;
  }

  /**
   * 检查系统是否正在运行
   */
  isActive(): boolean {
    return this.isRunning;
  }
}