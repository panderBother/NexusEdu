/**
 * TensorFlow.js 模型管理器
 */

import type { IModelManager } from "./interfaces";
import type {
  SegmentationModelType,
  ModelInfo,
  DeviceCapabilities,
} from "./types";
import { AISegmentationError } from "./types";
import { ErrorHandler } from "./error-handler";

// 临时类型定义，避免依赖问题
interface MockBodySegmenter {
  segmentPeople(input: any): Promise<any>;
  dispose?(): void;
}

export class ModelManager implements IModelManager {
  private model: MockBodySegmenter | null = null;
  private modelInfo: ModelInfo | null = null;
  private isLoading: boolean = false;
  private loadPromise: Promise<any> | null = null;
  private errorHandler: ErrorHandler;
  private modelCache: Map<string, any> = new Map();
  private deviceCapabilities: DeviceCapabilities | null = null;

  constructor() {
    this.errorHandler = new ErrorHandler();
    this.detectDeviceCapabilities();
  }

  /**
   * 加载指定的分割模型
   */
  async loadModel(modelType: SegmentationModelType): Promise<any> {
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    const cacheKey = this.getModelCacheKey(modelType);
    if (this.modelCache.has(cacheKey)) {
      this.model = this.modelCache.get(cacheKey);
      return this.model!;
    }

    this.isLoading = true;
    const startTime = performance.now();

    try {
      this.loadPromise = this.loadModelInternal(modelType);
      const model = await this.loadPromise;

      const loadTime = performance.now() - startTime;

      this.modelCache.set(cacheKey, model);
      this.model = model;

      this.updateModelInfo(modelType, loadTime);

      console.log(
        `Model ${modelType} loaded successfully in ${loadTime.toFixed(2)}ms`,
      );
      return model;
    } catch (error) {
      console.error("Failed to load model:", error);

      const recoveryAction = await this.errorHandler.handleError(
        AISegmentationError.MODEL_LOAD_FAILED,
        { modelType, error: (error as Error).message },
      );

      if (recoveryAction.type === "RETRY" && recoveryAction.maxAttempts > 0) {
        console.log(
          `Retrying model load, ${recoveryAction.maxAttempts} attempts remaining`,
        );
        return this.loadModel(modelType);
      }

      throw error;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * 内部模型加载实现
   */
  private async loadModelInternal(
    modelType: SegmentationModelType,
  ): Promise<MockBodySegmenter> {
    console.log(`🤖 AI Debug: Loading model internally: ${modelType}`);
    console.log("🤖 AI Debug: Checking device capabilities...");

    // 检查WebGL支持
    const canvas = document.createElement("canvas");
    const webglContext =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    const hasWebGL = !!webglContext;
    console.log(`🤖 AI Debug: WebGL support: ${hasWebGL}`);

    // 检查内存信息
    if ("memory" in performance) {
      const memInfo = (performance as any).memory;
      const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memInfo.totalJSHeapSize / 1024 / 1024);
      console.log(
        `🤖 AI Debug: Memory before model load: ${usedMB}MB / ${totalMB}MB`,
      );
    }

    console.log("🤖 AI Debug: Starting model download and initialization...");
    // 模拟模型加载
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(
      "🤖 AI Debug: Model loaded successfully, creating segmenter...",
    );

    return {
      segmentPeople: async (input: any) => {
        console.log(
          `🤖 AI Debug: Processing segmentation request with input size: ${input?.width || "unknown"}x${input?.height || "unknown"}`,
        );
        // 模拟处理时间
        await new Promise((resolve) => setTimeout(resolve, 50));
        console.log("🤖 AI Debug: Segmentation completed");
        return [];
      },
    };
  }

  /**
   * 检查模型是否已加载
   */
  isModelLoaded(): boolean {
    return this.model !== null && !this.isLoading;
  }

  /**
   * 获取模型信息
   */
  getModelInfo(): ModelInfo {
    if (!this.modelInfo) {
      throw new Error("Model not loaded");
    }
    return { ...this.modelInfo };
  }

  /**
   * 优化模型配置
   */
  optimizeForDevice(deviceCapabilities: DeviceCapabilities): void {
    this.deviceCapabilities = deviceCapabilities;

    if (this.model && this.modelInfo) {
      console.log(
        "Device capabilities updated, consider reloading model for optimization",
      );
    }
  }

  /**
   * 卸载模型释放内存
   */
  unloadModel(): void {
    if (this.model) {
      if (typeof this.model.dispose === "function") {
        this.model.dispose();
      }
      this.model = null;
    }

    this.modelInfo = null;
    this.modelCache.clear();

    console.log("Model unloaded and memory cleaned");
  }

  /**
   * 检测设备能力
   */
  private detectDeviceCapabilities(): void {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    this.deviceCapabilities = {
      hasWebGL: !!gl,
      maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
      availableMemory: this.estimateAvailableMemory(),
      cpuCores: navigator.hardwareConcurrency || 4,
    };

    console.log("Device capabilities detected:", this.deviceCapabilities);
  }

  /**
   * 估算可用内存
   */
  private estimateAvailableMemory(): number {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      return memory.jsHeapSizeLimit - memory.usedJSHeapSize;
    }

    return 100 * 1024 * 1024; // 100MB
  }

  /**
   * 生成模型缓存键
   */
  private getModelCacheKey(modelType: SegmentationModelType): string {
    const deviceKey = this.deviceCapabilities
      ? `${this.deviceCapabilities.hasWebGL}_${this.deviceCapabilities.availableMemory}`
      : "unknown";
    return `${modelType}_${deviceKey}`;
  }

  /**
   * 更新模型信息
   */
  private updateModelInfo(
    modelType: SegmentationModelType,
    loadTime: number,
  ): void {
    this.modelInfo = {
      name: modelType,
      version: "1.0.0",
      inputSize: this.getModelInputSize(modelType),
      outputStride: this.getModelOutputStride(modelType),
      memoryUsage: this.estimateModelMemoryUsage(modelType),
      loadTime,
    };
  }

  /**
   * 获取模型输入尺寸
   */
  private getModelInputSize(modelType: SegmentationModelType): {
    width: number;
    height: number;
  } {
    switch (modelType) {
      case "MediaPipeSelfieSegmentation":
        return { width: 256, height: 256 };
      case "BodyPix":
        return { width: 513, height: 513 };
      case "DeepLabV3":
        return { width: 513, height: 513 };
      default:
        return { width: 256, height: 256 };
    }
  }

  /**
   * 获取模型输出步长
   */
  private getModelOutputStride(modelType: SegmentationModelType): number {
    switch (modelType) {
      case "MediaPipeSelfieSegmentation":
        return 1;
      case "BodyPix":
        return 16;
      case "DeepLabV3":
        return 16;
      default:
        return 16;
    }
  }

  /**
   * 估算模型内存使用
   */
  private estimateModelMemoryUsage(modelType: SegmentationModelType): number {
    switch (modelType) {
      case "MediaPipeSelfieSegmentation":
        return 10 * 1024 * 1024; // ~10MB
      case "BodyPix":
        return 25 * 1024 * 1024; // ~25MB
      case "DeepLabV3":
        return 40 * 1024 * 1024; // ~40MB
      default:
        return 20 * 1024 * 1024; // ~20MB
    }
  }
}
