/**
 * AI分割系统与弹幕系统集成
 * 负责将AI生成的遮罩数据集成到现有弹幕系统中
 */

import { MaskData, Dimensions, BoundingBox } from './types';

export interface BarrageIntegrationOptions {
  // 遮罩更新频率（毫秒）
  updateInterval: number;
  // 是否启用遮罩平滑过渡
  enableSmoothing: boolean;
  // 平滑过渡时间（毫秒）
  smoothingDuration: number;
  // 遮罩缓存大小
  cacheSize: number;
  // 是否启用性能优化
  enableOptimization: boolean;
}

export interface BarrageRenderer {
  setMask(mask?: string | ImageData): void;
  canvasSize: { width: number; height: number };
}

export class BarrageIntegration {
  private renderer: BarrageRenderer;
  private options: BarrageIntegrationOptions;
  private maskCache: Map<string, ImageData> = new Map();
  private currentMask: MaskData | null = null;
  private lastUpdateTime: number = 0;
  private smoothingTimer: number | null = null;
  private isUpdating: boolean = false;

  private readonly DEFAULT_OPTIONS: BarrageIntegrationOptions = {
    updateInterval: 33, // ~30 FPS
    enableSmoothing: true,
    smoothingDuration: 200,
    cacheSize: 10,
    enableOptimization: true
  };

  constructor(renderer: BarrageRenderer, options?: Partial<BarrageIntegrationOptions>) {
    this.renderer = renderer;
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
  }

  /**
   * 更新AI生成的遮罩
   */
  updateAIMask(maskData: MaskData): void {
    const now = Date.now();
    
    // 检查更新频率限制
    if (now - this.lastUpdateTime < this.options.updateInterval) {
      console.log('🤖 AI Debug: Mask update skipped due to rate limiting');
      return;
    }

    if (this.isUpdating) {
      console.log('🤖 AI Debug: Mask update skipped - already updating');
      return; // 避免并发更新
    }

    this.isUpdating = true;
    this.lastUpdateTime = now;

    console.log(`🤖 AI Debug: Updating AI mask - Type: ${maskData.type}, Confidence: ${maskData.confidence}`);

    try {
      // 缓存当前遮罩
      this.currentMask = maskData;

      // 转换遮罩数据为ImageData格式
      const conversionStart = performance.now();
      const imageData = this.convertMaskToImageData(maskData);
      const conversionTime = performance.now() - conversionStart;
      console.log(`🤖 AI Debug: Mask conversion completed in ${Math.round(conversionTime)}ms`);
      
      if (imageData) {
        console.log(`🤖 AI Debug: Applying mask to renderer - Size: ${imageData.width}x${imageData.height}`);
        
        // 应用平滑过渡
        if (this.options.enableSmoothing) {
          console.log('🤖 AI Debug: Applying smooth transition');
          this.applySmoothTransition(imageData);
        } else {
          this.renderer.setMask(imageData);
        }

        // 缓存遮罩数据
        this.cacheMask(maskData.timestamp.toString(), imageData);
        console.log(`🤖 AI Debug: Mask cached, cache size: ${this.maskCache.size}`);
      } else {
        console.log('🤖 AI Debug: No mask data, clearing renderer mask');
        // 清除遮罩
        this.renderer.setMask(undefined);
      }

    } catch (error) {
      console.error('🤖 AI Debug: Failed to update AI mask:', error);
      // 发生错误时清除遮罩
      this.renderer.setMask(undefined);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 合并AI遮罩和手动遮罩
   */
  mergeWithManualMask(aiMask: MaskData, manualMask?: string | ImageData): void {
    if (!manualMask) {
      this.updateAIMask(aiMask);
      return;
    }

    // 如果有手动遮罩，需要合并两个遮罩
    this.mergeAIAndManualMasks(aiMask, manualMask);
  }

  /**
   * 清除AI遮罩
   */
  clearAIMask(): void {
    this.currentMask = null;
    this.renderer.setMask(undefined);
    
    if (this.smoothingTimer) {
      clearTimeout(this.smoothingTimer);
      this.smoothingTimer = null;
    }
  }

  /**
   * 获取当前遮罩状态
   */
  getCurrentMaskStatus(): {
    hasMask: boolean;
    maskType: string | null;
    lastUpdate: number;
    cacheSize: number;
  } {
    return {
      hasMask: this.currentMask !== null,
      maskType: this.currentMask?.type || null,
      lastUpdate: this.lastUpdateTime,
      cacheSize: this.maskCache.size
    };
  }

  /**
   * 转换遮罩数据为ImageData格式
   */
  private convertMaskToImageData(maskData: MaskData): ImageData | null {
    const canvasSize = this.renderer.canvasSize;
    const dimensions: Dimensions = {
      width: canvasSize.width,
      height: canvasSize.height
    };

    switch (maskData.type) {
      case 'ImageData':
        return this.resizeImageData(maskData.data as ImageData, dimensions);
      
      case 'BoundingBoxes':
        return this.boundingBoxesToImageData(maskData.data as BoundingBox[], dimensions);
      
      case 'PixelMask':
        return this.pixelMaskToImageData(maskData.data as Uint8Array, dimensions);
      
      default:
        console.warn('Unsupported mask type:', maskData.type);
        return null;
    }
  }

  /**
   * 调整ImageData尺寸
   */
  private resizeImageData(imageData: ImageData, targetDimensions: Dimensions): ImageData {
    if (imageData.width === targetDimensions.width && imageData.height === targetDimensions.height) {
      return imageData;
    }

    // 创建临时canvas进行缩放
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    // 创建目标canvas
    const targetCanvas = document.createElement('canvas');
    const targetCtx = targetCanvas.getContext('2d')!;
    targetCanvas.width = targetDimensions.width;
    targetCanvas.height = targetDimensions.height;

    // 缩放绘制
    targetCtx.drawImage(canvas, 0, 0, targetDimensions.width, targetDimensions.height);
    
    return targetCtx.getImageData(0, 0, targetDimensions.width, targetDimensions.height);
  }

  /**
   * 将边界框转换为ImageData
   */
  private boundingBoxesToImageData(boxes: BoundingBox[], dimensions: Dimensions): ImageData {
    const imageData = new ImageData(dimensions.width, dimensions.height);
    const data = imageData.data;

    // 将所有边界框区域设置为白色（遮罩区域）
    boxes.forEach(box => {
      const startX = Math.max(0, Math.floor(box.x));
      const startY = Math.max(0, Math.floor(box.y));
      const endX = Math.min(dimensions.width, Math.ceil(box.x + box.width));
      const endY = Math.min(dimensions.height, Math.ceil(box.y + box.height));

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const index = (y * dimensions.width + x) * 4;
          data[index] = 255;     // R
          data[index + 1] = 255; // G
          data[index + 2] = 255; // B
          data[index + 3] = 255; // A
        }
      }
    });

    return imageData;
  }

  /**
   * 将像素遮罩转换为ImageData
   */
  private pixelMaskToImageData(pixelMask: Uint8Array, dimensions: Dimensions): ImageData {
    const imageData = new ImageData(dimensions.width, dimensions.height);
    const data = imageData.data;

    const expectedSize = dimensions.width * dimensions.height;
    const actualSize = Math.min(pixelMask.length, expectedSize);

    for (let i = 0; i < actualSize; i++) {
      const maskValue = pixelMask[i];
      const pixelIndex = i * 4;
      
      if (maskValue > 0) {
        data[pixelIndex] = 255;     // R
        data[pixelIndex + 1] = 255; // G
        data[pixelIndex + 2] = 255; // B
        data[pixelIndex + 3] = maskValue; // A
      }
    }

    return imageData;
  }

  /**
   * 应用平滑过渡
   */
  private applySmoothTransition(newImageData: ImageData): void {
    // 立即应用新遮罩
    this.renderer.setMask(newImageData);

    // 如果有正在进行的平滑过渡，取消它
    if (this.smoothingTimer) {
      clearTimeout(this.smoothingTimer);
    }

    // 设置平滑过渡完成的回调
    this.smoothingTimer = window.setTimeout(() => {
      this.smoothingTimer = null;
    }, this.options.smoothingDuration);
  }

  /**
   * 合并AI遮罩和手动遮罩
   */
  private async mergeAIAndManualMasks(aiMask: MaskData, manualMask: string | ImageData): Promise<void> {
    try {
      // 转换AI遮罩为ImageData
      const aiImageData = this.convertMaskToImageData(aiMask);
      if (!aiImageData) {
        // 如果AI遮罩转换失败，只使用手动遮罩
        this.renderer.setMask(manualMask);
        return;
      }

      let manualImageData: ImageData;

      if (typeof manualMask === 'string') {
        // 加载图片URL
        manualImageData = await this.loadImageAsImageData(manualMask);
      } else {
        manualImageData = manualMask;
      }

      // 合并两个ImageData
      const mergedImageData = this.mergeImageData(aiImageData, manualImageData);
      this.renderer.setMask(mergedImageData);

    } catch (error) {
      console.error('Failed to merge AI and manual masks:', error);
      // 发生错误时只使用AI遮罩
      this.updateAIMask(aiMask);
    }
  }

  /**
   * 加载图片URL为ImageData
   */
  private loadImageAsImageData(url: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };
      
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  /**
   * 合并两个ImageData
   */
  private mergeImageData(imageData1: ImageData, imageData2: ImageData): ImageData {
    const canvasSize = this.renderer.canvasSize;
    const mergedImageData = new ImageData(canvasSize.width, canvasSize.height);
    const mergedData = mergedImageData.data;

    // 调整两个ImageData到相同尺寸
    const resized1 = this.resizeImageData(imageData1, canvasSize);
    const resized2 = this.resizeImageData(imageData2, canvasSize);

    const data1 = resized1.data;
    const data2 = resized2.data;

    // 合并像素数据（取最大值）
    for (let i = 0; i < mergedData.length; i += 4) {
      mergedData[i] = Math.max(data1[i], data2[i]);         // R
      mergedData[i + 1] = Math.max(data1[i + 1], data2[i + 1]); // G
      mergedData[i + 2] = Math.max(data1[i + 2], data2[i + 2]); // B
      mergedData[i + 3] = Math.max(data1[i + 3], data2[i + 3]); // A
    }

    return mergedImageData;
  }

  /**
   * 缓存遮罩数据
   */
  private cacheMask(key: string, imageData: ImageData): void {
    // 如果缓存已满，删除最旧的条目
    if (this.maskCache.size >= this.options.cacheSize) {
      const firstKey = this.maskCache.keys().next().value;
      if (firstKey) {
        this.maskCache.delete(firstKey);
      }
    }

    this.maskCache.set(key, imageData);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.clearAIMask();
    this.maskCache.clear();
    
    if (this.smoothingTimer) {
      clearTimeout(this.smoothingTimer);
      this.smoothingTimer = null;
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    updateInterval: number;
    lastUpdateTime: number;
    cacheSize: number;
    isUpdating: boolean;
    smoothingActive: boolean;
  } {
    return {
      updateInterval: this.options.updateInterval,
      lastUpdateTime: this.lastUpdateTime,
      cacheSize: this.maskCache.size,
      isUpdating: this.isUpdating,
      smoothingActive: this.smoothingTimer !== null
    };
  }
}