/**
 * AI 人体分割系统的类型定义
 */

// TensorFlow.js 相关类型
export type SegmentationModelType = 'MediaPipeSelfieSegmentation' | 'BodyPix' | 'DeepLabV3';

// 设备能力检测
export interface DeviceCapabilities {
  hasWebGL: boolean;
  maxTextureSize: number;
  availableMemory: number;
  cpuCores: number;
}

// 模型信息
export interface ModelInfo {
  name: string;
  version: string;
  inputSize: { width: number; height: number };
  outputStride: number;
  memoryUsage: number;
  loadTime: number;
}

// 关键点信息
export interface Keypoint {
  x: number;
  y: number;
  confidence: number;
  name: string;
}

// 边界框
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 人体分段信息
export interface PersonSegment {
  id: string;
  boundingBox: BoundingBox;
  mask: Uint8Array;
  confidence: number;
  keypoints?: Keypoint[];
}

// 分割结果
export interface SegmentationResult {
  segments: PersonSegment[];
  confidence: number;
  processingTime: number;
  frameId: string;
}

// 分割配置
export interface SegmentationConfig {
  confidenceThreshold: number;
  maxDetections: number;
  enableKeypoints: boolean;
  modelPrecision: 'float16' | 'float32';
}

// 帧处理统计
export interface FrameProcessingStats {
  currentFPS: number;
  droppedFrames: number;
  averageProcessingTime: number;
  lastFrameTimestamp: number;
}

// 尺寸信息
export interface Dimensions {
  width: number;
  height: number;
}

// 填充配置
export interface PaddingConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
  adaptive: boolean; // 根据检测置信度自适应调整
}

// 遮罩数据
export interface MaskData {
  type: 'ImageData' | 'BoundingBoxes' | 'PixelMask';
  data: ImageData | BoundingBox[] | Uint8Array;
  timestamp: number;
  confidence: number;
}

// 性能指标
export interface PerformanceMetrics {
  frameProcessingTime: number;
  modelInferenceTime: number;
  maskGenerationTime: number;
  totalLatency: number;
  memoryUsage: number;
  cpuUsage?: number;
  gpuUsage?: number;
}

// 系统性能指标
export interface SystemMetrics {
  cpu: {
    usage: number;
    temperature?: number;
  };
  memory: {
    used: number;
    available: number;
    heapUsed: number;
  };
  gpu: {
    usage?: number;
    memoryUsed?: number;
  };
  fps: {
    current: number;
    average: number;
    target: number;
  };
  latency: {
    frameCapture: number;
    aiProcessing: number;
    maskGeneration: number;
    total: number;
  };
}

// 性能阈值
export interface PerformanceThresholds {
  maxCpuUsage: number;
  maxMemoryUsage: number;
  minFPS: number;
  maxLatency: number;
}

// 性能事件类型
export type PerformanceEvent = 
  | { type: 'CPU_HIGH'; usage: number }
  | { type: 'MEMORY_HIGH'; usage: number }
  | { type: 'FPS_LOW'; fps: number }
  | { type: 'LATENCY_HIGH'; latency: number }
  | { type: 'OPTIMIZATION_TRIGGERED'; strategy: string };

// 错误类型
export enum AISegmentationError {
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
  WEBGL_CONTEXT_LOST = 'WEBGL_CONTEXT_LOST',
  INSUFFICIENT_MEMORY = 'INSUFFICIENT_MEMORY',
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',
  INVALID_INPUT = 'INVALID_INPUT',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

// 恢复动作类型
export type RecoveryAction = 
  | { type: 'RETRY'; maxAttempts: number }
  | { type: 'FALLBACK'; fallbackSystem: string }
  | { type: 'OPTIMIZE'; strategy: OptimizationStrategy }
  | { type: 'ABORT'; reason: string };

// 优化策略
export interface OptimizationStrategy {
  reduceModelPrecision: boolean;
  decreaseProcessingFrequency: boolean;
  enableCPUFallback: boolean;
  clearMemoryCache: boolean;
}

// 错误记录
export interface ErrorRecord {
  timestamp: number;
  error: Error;
  context: string;
  recovered: boolean;
}

// AI 分割配置
export interface AISegmentationConfig {
  // 模型配置
  model: {
    type: SegmentationModelType;
    precision: 'float16' | 'float32';
    backend: 'webgl' | 'cpu' | 'auto';
  };
  
  // 处理配置
  processing: {
    targetFPS: number;
    maxLatency: number;
    confidenceThreshold: number;
    enableBatching: boolean;
    batchSize: number;
  };
  
  // 遮罩配置
  mask: {
    padding: PaddingConfig;
    smoothing: boolean;
    optimization: 'speed' | 'quality' | 'balanced';
  };
  
  // 性能配置
  performance: {
    enableMonitoring: boolean;
    autoOptimization: boolean;
    fallbackThreshold: number;
    memoryLimit: number;
  };
  
  // 调试配置
  debug: {
    enableLogging: boolean;
    showVisualization: boolean;
    saveDebugFrames: boolean;
  };
}

// AI 分割状态
export interface AISegmentationState {
  // 系统状态
  status: 'initializing' | 'ready' | 'processing' | 'error' | 'fallback';
  
  // 模型状态
  model: {
    loaded: boolean;
    type: SegmentationModelType;
    loadTime: number;
    memoryUsage: number;
  };
  
  // 处理状态
  processing: {
    isActive: boolean;
    currentFPS: number;
    averageLatency: number;
    totalFramesProcessed: number;
    errorsCount: number;
  };
  
  // 性能状态
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage?: number;
    lastOptimization?: string;
  };
  
  // 错误状态
  errors: {
    lastError?: Error;
    errorHistory: ErrorRecord[];
  };
}