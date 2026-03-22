/**
 * AI 人体分割系统核心
 * 负责执行人体分割并生成分割结果
 */

import type { IAISegmentationSystem } from "./interfaces";
import { AISegmentationError } from "./types";
import type {
  SegmentationResult,
  SegmentationConfig,
  PerformanceMetrics,
  PersonSegment,
  BoundingBox,
} from "./types";
import { ModelManager } from "./model-manager";
import { ErrorHandler } from "./error-handler";

export class AISegmentationSystem implements IAISegmentationSystem {
  private modelManager: ModelManager;
  private errorHandler: ErrorHandler;
  private config: SegmentationConfig;
  private performanceMetrics: PerformanceMetrics;
  private isProcessing: boolean = false;
  private frameCounter: number = 0;
  private processingTimes: number[] = [];
  private readonly MAX_PROCESSING_TIME_HISTORY = 100;

  // 性能保护相关
  private readonly MAX_PROCESSING_TIME = 33; // 33ms for 30 FPS
  private readonly PERFORMANCE_TIMEOUT = 50; // 50ms timeout
  private consecutiveTimeouts: number = 0;
  private readonly MAX_CONSECUTIVE_TIMEOUTS = 3;
  private frameSkipCount: number = 0;
  private lastProcessingTime: number = 0;

  // 置信度过滤相关
  private confidenceHistory: number[] = [];
  private readonly CONFIDENCE_HISTORY_SIZE = 10;
  private adaptiveThreshold: number;

  constructor(
    modelManager: ModelManager,
    config?: Partial<SegmentationConfig>,
  ) {
    this.modelManager = modelManager;
    this.errorHandler = new ErrorHandler();

    // 默认配置
    this.config = {
      confidenceThreshold: 0.7,
      maxDetections: 5,
      enableKeypoints: false,
      modelPrecision: "float32",
      ...config,
    };

    // 初始化自适应置信度阈值
    this.adaptiveThreshold = this.config.confidenceThreshold;

    // 初始化性能指标
    this.performanceMetrics = {
      frameProcessingTime: 0,
      modelInferenceTime: 0,
      maskGenerationTime: 0,
      totalLatency: 0,
      memoryUsage: 0,
    };
  }

  /**
   * 处理单帧图像
   */
  async processFrame(imageData: ImageData): Promise<SegmentationResult> {
    if (this.isProcessing) {
      console.log(
        "🤖 AI Debug: Frame processing already in progress, rejecting new request",
      );
      throw new Error("Another frame is currently being processed");
    }

    // 性能保护：检查是否应该跳过此帧
    if (this.shouldSkipFrame()) {
      this.frameSkipCount++;
      console.log(
        `🤖 AI Debug: Skipping frame due to performance protection (skipped: ${this.frameSkipCount})`,
      );
      return this.createEmptyResult(`skipped_${Date.now()}`);
    }

    this.isProcessing = true;
    const startTime = performance.now();
    const frameId = `frame_${Date.now()}_${this.frameCounter++}`;

    console.log(
      `🤖 AI Debug: Starting frame processing - ID: ${frameId}, Size: ${imageData.width}x${imageData.height}`,
    );

    // 设置处理超时
    const timeoutPromise = new Promise<SegmentationResult>((_, reject) => {
      setTimeout(() => {
        console.log(
          `🤖 AI Debug: Processing timeout for frame ${frameId} after ${this.PERFORMANCE_TIMEOUT}ms`,
        );
        reject(
          new Error(`Processing timeout after ${this.PERFORMANCE_TIMEOUT}ms`),
        );
      }, this.PERFORMANCE_TIMEOUT);
    });

    try {
      console.log(`🤖 AI Debug: Validating input for frame ${frameId}...`);
      // 验证输入
      this.validateInput(imageData);

      // 检查模型是否已加载
      if (!this.modelManager.isModelLoaded()) {
        console.log("🤖 AI Debug: Model not loaded, throwing error");
        throw new Error("Model not loaded");
      }

      console.log(
        `🤖 AI Debug: Model is loaded, proceeding with segmentation for frame ${frameId}`,
      );

      // 使用 Promise.race 实现超时保护
      const processingPromise = this.performFrameProcessing(
        imageData,
        frameId,
        startTime,
      );
      const result = await Promise.race([processingPromise, timeoutPromise]);

      // 重置连续超时计数
      this.consecutiveTimeouts = 0;
      this.lastProcessingTime = performance.now() - startTime;

      return result;
    } catch (error) {
      console.error("Frame processing failed:", error);

      // 处理超时错误
      if ((error as Error).message.includes("timeout")) {
        this.consecutiveTimeouts++;
        console.warn(
          `Processing timeout (consecutive: ${this.consecutiveTimeouts}/${this.MAX_CONSECUTIVE_TIMEOUTS})`,
        );

        if (this.consecutiveTimeouts >= this.MAX_CONSECUTIVE_TIMEOUTS) {
          console.error(
            "Too many consecutive timeouts, triggering performance optimization",
          );
          await this.triggerPerformanceOptimization();
        }
      }

      // 处理错误
      const recoveryAction = await this.errorHandler.handleError(
        AISegmentationError.PROCESSING_TIMEOUT,
        { frameId, error: (error as Error).message },
      );

      if (recoveryAction.type === "RETRY") {
        // 对于分割处理，重试可能导致性能问题，所以返回空结果
        return this.createEmptyResult(frameId);
      }

      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 批量处理多帧
   */
  async processFrames(frames: ImageData[]): Promise<SegmentationResult[]> {
    const results: SegmentationResult[] = [];

    for (const frame of frames) {
      try {
        const result = await this.processFrame(frame);
        results.push(result);
      } catch (error) {
        console.warn("Failed to process frame in batch:", error);
        // 添加空结果以保持数组长度一致
        results.push(this.createEmptyResult(`batch_error_${Date.now()}`));
      }
    }

    return results;
  }

  /**
   * 设置分割参数
   */
  setSegmentationConfig(config: SegmentationConfig): void {
    this.config = { ...this.config, ...config };
    console.log("Segmentation config updated:", this.config);
  }

  /**
   * 获取处理性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * 验证输入数据
   */
  private validateInput(imageData: ImageData): void {
    if (!imageData) {
      throw new Error("Invalid input: ImageData required");
    }

    // 检查是否有必要的属性
    if (
      typeof imageData.width !== "number" ||
      typeof imageData.height !== "number"
    ) {
      throw new Error(
        "Invalid input: ImageData must have width and height properties",
      );
    }

    if (imageData.width <= 0 || imageData.height <= 0) {
      throw new Error("Invalid input: ImageData dimensions must be positive");
    }

    if (!imageData.data || imageData.data.length === 0) {
      throw new Error("Invalid input: ImageData contains no pixel data");
    }
  }

  /**
   * 执行人体分割
   */
  private async performSegmentation(imageData: ImageData): Promise<any[]> {
    // 模拟分割处理
    await new Promise((resolve) =>
      setTimeout(resolve, 10 + Math.random() * 20),
    );

    // 模拟检测到的人体数量（0-3个）
    const numPeople = Math.floor(Math.random() * 4);
    const results = [];

    for (let i = 0; i < numPeople; i++) {
      // 模拟分割结果
      const confidence = 0.6 + Math.random() * 0.4; // 0.6-1.0

      if (confidence >= this.config.confidenceThreshold) {
        results.push({
          confidence,
          boundingBox: this.generateRandomBoundingBox(
            imageData.width,
            imageData.height,
          ),
          mask: this.generateRandomMask(imageData.width, imageData.height),
        });
      }
    }

    return results.slice(0, this.config.maxDetections);
  }

  /**
   * 处理分割结果
   */
  private processSegmentationResults(
    rawResults: any[],
    _imageData: ImageData,
  ): PersonSegment[] {
    const segments: PersonSegment[] = [];

    rawResults.forEach((result, index) => {
      // 使用自适应阈值进行置信度过滤
      const effectiveThreshold = Math.max(
        this.adaptiveThreshold,
        this.config.confidenceThreshold,
      );

      if (result.confidence >= effectiveThreshold) {
        const segment: PersonSegment = {
          id: `person_${Date.now()}_${index}`,
          boundingBox: result.boundingBox,
          mask: result.mask,
          confidence: result.confidence,
          keypoints: this.config.enableKeypoints
            ? this.generateKeypoints()
            : undefined,
        };

        segments.push(segment);
      } else {
        console.log(
          `Filtered out segment with confidence ${result.confidence.toFixed(3)} (threshold: ${effectiveThreshold.toFixed(3)})`,
        );
      }
    });

    return segments;
  }

  /**
   * 生成随机边界框（用于模拟）
   */
  private generateRandomBoundingBox(
    width: number,
    height: number,
  ): BoundingBox {
    const x = Math.floor(Math.random() * width * 0.5);
    const y = Math.floor(Math.random() * height * 0.3);
    const w = Math.floor(width * 0.2 + Math.random() * width * 0.3);
    const h = Math.floor(height * 0.4 + Math.random() * height * 0.4);

    return {
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: Math.min(w, width - x),
      height: Math.min(h, height - y),
    };
  }

  /**
   * 生成随机遮罩（用于模拟）
   */
  private generateRandomMask(width: number, height: number): Uint8Array {
    const maskSize = width * height;
    const mask = new Uint8Array(maskSize);

    // 创建一个简单的椭圆形遮罩
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width * 0.3;
    const radiusY = height * 0.4;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;
        const distance = dx * dx + dy * dy;

        const index = y * width + x;
        mask[index] = distance <= 1 ? 255 : 0;
      }
    }

    return mask;
  }

  /**
   * 生成关键点（用于模拟）
   */
  private generateKeypoints() {
    const keypoints = [
      { x: 100, y: 50, confidence: 0.9, name: "nose" },
      { x: 90, y: 45, confidence: 0.8, name: "left_eye" },
      { x: 110, y: 45, confidence: 0.8, name: "right_eye" },
      { x: 85, y: 55, confidence: 0.7, name: "left_ear" },
      { x: 115, y: 55, confidence: 0.7, name: "right_ear" },
    ];

    return keypoints;
  }

  /**
   * 计算总体置信度
   */
  private calculateOverallConfidence(segments: PersonSegment[]): number {
    if (segments.length === 0) return 0;

    const totalConfidence = segments.reduce(
      (sum, segment) => sum + segment.confidence,
      0,
    );
    return totalConfidence / segments.length;
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(
    totalTime: number,
    inferenceTime: number,
    processTime: number,
  ): void {
    // 记录处理时间
    this.processingTimes.push(totalTime);
    if (this.processingTimes.length > this.MAX_PROCESSING_TIME_HISTORY) {
      this.processingTimes.shift();
    }

    // 更新指标
    this.performanceMetrics = {
      frameProcessingTime: totalTime,
      modelInferenceTime: inferenceTime,
      maskGenerationTime: processTime,
      totalLatency: totalTime,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * 估算内存使用
   */
  private estimateMemoryUsage(): number {
    // 简单的内存使用估算
    const baseMemory = 10 * 1024 * 1024; // 10MB 基础内存
    const historyMemory = this.processingTimes.length * 8; // 每个时间戳 8 字节
    return baseMemory + historyMemory;
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(frameId: string): SegmentationResult {
    return {
      segments: [],
      confidence: 0,
      processingTime: 0,
      frameId,
    };
  }

  /**
   * 获取平均处理时间
   */
  getAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) return 0;
    return (
      this.processingTimes.reduce((sum, time) => sum + time, 0) /
      this.processingTimes.length
    );
  }

  /**
   * 获取处理统计
   */
  getProcessingStats(): {
    totalFrames: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
  } {
    return {
      totalFrames: this.frameCounter,
      averageTime: this.getAverageProcessingTime(),
      minTime:
        this.processingTimes.length > 0 ? Math.min(...this.processingTimes) : 0,
      maxTime:
        this.processingTimes.length > 0 ? Math.max(...this.processingTimes) : 0,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.frameCounter = 0;
    this.processingTimes = [];
    this.confidenceHistory = [];
    this.consecutiveTimeouts = 0;
    this.frameSkipCount = 0;
    this.adaptiveThreshold = this.config.confidenceThreshold;
    this.performanceMetrics = {
      frameProcessingTime: 0,
      modelInferenceTime: 0,
      maskGenerationTime: 0,
      totalLatency: 0,
      memoryUsage: 0,
    };
  }

  /**
   * 检查是否应该跳过当前帧（性能保护）
   */
  private shouldSkipFrame(): boolean {
    // 如果连续超时次数过多，跳过帧
    if (this.consecutiveTimeouts >= this.MAX_CONSECUTIVE_TIMEOUTS) {
      return true;
    }

    // 如果上次处理时间过长，跳过帧
    if (this.lastProcessingTime > this.MAX_PROCESSING_TIME) {
      return true;
    }

    // 如果平均处理时间过长，跳过帧
    const avgTime = this.getAverageProcessingTime();
    if (
      avgTime > this.MAX_PROCESSING_TIME &&
      this.processingTimes.length >= 5
    ) {
      return true;
    }

    return false;
  }

  /**
   * 执行帧处理（分离出来以支持超时控制）
   */
  private async performFrameProcessing(
    imageData: ImageData,
    frameId: string,
    startTime: number,
  ): Promise<SegmentationResult> {
    // 执行人体分割
    const inferenceStartTime = performance.now();
    const rawResults = await this.performSegmentation(imageData);
    const inferenceTime = performance.now() - inferenceStartTime;

    // 处理分割结果（应用置信度过滤）
    const processStartTime = performance.now();
    const segments = this.processSegmentationResults(rawResults, imageData);
    const processTime = performance.now() - processStartTime;

    // 计算总体置信度并更新自适应阈值
    const overallConfidence = this.calculateOverallConfidence(segments);
    this.updateAdaptiveThreshold(overallConfidence);

    // 更新性能指标
    const totalTime = performance.now() - startTime;
    this.updatePerformanceMetrics(totalTime, inferenceTime, processTime);

    const result: SegmentationResult = {
      segments,
      confidence: overallConfidence,
      processingTime: totalTime,
      frameId,
    };

    console.log(
      `Frame ${frameId} processed in ${totalTime.toFixed(2)}ms, found ${segments.length} segments (confidence: ${overallConfidence.toFixed(3)})`,
    );
    return result;
  }

  /**
   * 更新自适应置信度阈值
   */
  private updateAdaptiveThreshold(confidence: number): void {
    // 记录置信度历史
    this.confidenceHistory.push(confidence);
    if (this.confidenceHistory.length > this.CONFIDENCE_HISTORY_SIZE) {
      this.confidenceHistory.shift();
    }

    // 计算平均置信度
    if (this.confidenceHistory.length >= 3) {
      const avgConfidence =
        this.confidenceHistory.reduce((sum, c) => sum + c, 0) /
        this.confidenceHistory.length;

      // 自适应调整阈值：如果平均置信度较高，可以适当提高阈值以提高精度
      // 如果平均置信度较低，降低阈值以保持检测能力
      const baseThreshold = this.config.confidenceThreshold;
      const adaptiveFactor = 0.1; // 调整幅度

      if (avgConfidence > baseThreshold + 0.1) {
        // 置信度较高，可以提高阈值
        this.adaptiveThreshold = Math.min(baseThreshold + adaptiveFactor, 0.9);
      } else if (avgConfidence < baseThreshold - 0.1) {
        // 置信度较低，降低阈值
        this.adaptiveThreshold = Math.max(baseThreshold - adaptiveFactor, 0.5);
      } else {
        // 保持在基础阈值附近
        this.adaptiveThreshold = baseThreshold;
      }
    }
  }

  /**
   * 触发性能优化
   */
  private async triggerPerformanceOptimization(): Promise<void> {
    console.log("Triggering performance optimization...");

    // 降低模型精度
    if (this.config.modelPrecision === "float32") {
      this.config.modelPrecision = "float16";
      console.log("Reduced model precision to float16");
    }

    // 提高置信度阈值以减少处理负载
    this.config.confidenceThreshold = Math.min(
      this.config.confidenceThreshold + 0.1,
      0.9,
    );
    console.log(
      `Increased confidence threshold to ${this.config.confidenceThreshold}`,
    );

    // 减少最大检测数量
    this.config.maxDetections = Math.max(this.config.maxDetections - 1, 1);
    console.log(`Reduced max detections to ${this.config.maxDetections}`);

    // 重置连续超时计数
    this.consecutiveTimeouts = 0;
  }

  /**
   * 获取性能保护状态
   */
  getPerformanceProtectionStatus(): {
    isActive: boolean;
    consecutiveTimeouts: number;
    frameSkipCount: number;
    adaptiveThreshold: number;
    lastProcessingTime: number;
  } {
    return {
      isActive: this.consecutiveTimeouts >= this.MAX_CONSECUTIVE_TIMEOUTS,
      consecutiveTimeouts: this.consecutiveTimeouts,
      frameSkipCount: this.frameSkipCount,
      adaptiveThreshold: this.adaptiveThreshold,
      lastProcessingTime: this.lastProcessingTime,
    };
  }

  /**
   * 获取置信度统计
   */
  getConfidenceStats(): {
    currentThreshold: number;
    adaptiveThreshold: number;
    averageConfidence: number;
    confidenceHistory: number[];
  } {
    const avgConfidence =
      this.confidenceHistory.length > 0
        ? this.confidenceHistory.reduce((sum, c) => sum + c, 0) /
          this.confidenceHistory.length
        : 0;

    return {
      currentThreshold: this.config.confidenceThreshold,
      adaptiveThreshold: this.adaptiveThreshold,
      averageConfidence: avgConfidence,
      confidenceHistory: [...this.confidenceHistory],
    };
  }
}
