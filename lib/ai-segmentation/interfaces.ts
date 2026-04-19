/**
 * AI 人体分割系统的核心接口定义
 */

import type {
  FrameProcessingStats,
  ModelInfo,
  DeviceCapabilities,
  SegmentationResult,
  SegmentationConfig,
  PerformanceMetrics,
  MaskData,
  Dimensions,
  PaddingConfig,
  SystemMetrics,
  PerformanceThresholds,
  PerformanceEvent,
  RecoveryAction,
  SegmentationModelType,
} from "./types";
import { AISegmentationError } from "./types";
/**
 * 帧处理器接口
 */
export interface IFrameProcessor {
  // 初始化处理器
  initialize(videoElement: HTMLVideoElement): Promise<void>;

  // 捕获当前帧
  captureFrame(): ImageData | null;

  // 设置目标帧率
  setTargetFPS(fps: number): void;

  // 获取当前处理统计
  getStats(): FrameProcessingStats;

  // 清理资源
  dispose(): void;
}

/**
 * 模型管理器接口
 */
export interface IModelManager {
  // 加载指定的分割模型
  loadModel(modelType: SegmentationModelType): Promise<any>;

  // 检查模型是否已加载
  isModelLoaded(): boolean;

  // 获取模型信息
  getModelInfo(): ModelInfo;

  // 优化模型配置
  optimizeForDevice(deviceCapabilities: DeviceCapabilities): void;

  // 卸载模型释放内存
  unloadModel(): void;
}

/**
 * AI 分割系统接口
 */
export interface IAISegmentationSystem {
  // 处理单帧图像
  processFrame(imageData: ImageData): Promise<SegmentationResult>;

  // 批量处理多帧
  processFrames(frames: ImageData[]): Promise<SegmentationResult[]>;

  // 设置分割参数
  setSegmentationConfig(config: SegmentationConfig): void;

  // 获取处理性能指标
  getPerformanceMetrics(): PerformanceMetrics;
}

/**
 * 遮罩生成器接口
 */
export interface IMaskGenerator {
  // 从分割结果生成遮罩
  generateMask(
    segmentationResult: SegmentationResult,
    dimensions: Dimensions,
  ): MaskData;

  // 合并多个遮罩
  mergeMasks(masks: MaskData[]): MaskData;

  // 应用遮罩填充
  applyPadding(mask: MaskData, padding: PaddingConfig): MaskData;

  // 优化遮罩数据
  optimizeMask(mask: MaskData): MaskData;
}

/**
 * 性能监控器接口
 */
export interface IPerformanceMonitor {
  // 开始监控
  startMonitoring(): void;

  // 停止监控
  stopMonitoring(): void;

  // 获取当前性能指标
  getCurrentMetrics(): SystemMetrics;

  // 设置性能阈值
  setThresholds(thresholds: PerformanceThresholds): void;

  // 注册性能事件监听器
  onPerformanceEvent(callback: (event: PerformanceEvent) => void): void;
}

/**
 * 错误处理器接口
 */
export interface IErrorHandler {
  handleError(
    error: AISegmentationError,
    context: any,
  ): Promise<RecoveryAction>;
}
