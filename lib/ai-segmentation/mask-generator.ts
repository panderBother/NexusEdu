/**
 * 遮罩生成器
 * 将AI分割结果转换为弹幕系统可用的遮罩数据
 */

import { IMaskGenerator } from './interfaces';
import { 
  SegmentationResult, 
  MaskData, 
  Dimensions, 
  PaddingConfig, 
  BoundingBox,
  PersonSegment
} from './types';

export class MaskGenerator implements IMaskGenerator {
  private readonly DEFAULT_PADDING: PaddingConfig = {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
    adaptive: true
  };

  /**
   * 从分割结果生成遮罩
   */
  generateMask(segmentationResult: SegmentationResult, dimensions: Dimensions): MaskData {
    if (!segmentationResult || segmentationResult.segments.length === 0) {
      return this.createEmptyMask(dimensions);
    }

    // 根据分段数量选择最佳遮罩类型
    const maskType = this.determineMaskType(segmentationResult.segments, dimensions);
    
    switch (maskType) {
      case 'BoundingBoxes':
        return this.generateBoundingBoxMask(segmentationResult, dimensions);
      case 'PixelMask':
        return this.generatePixelMask(segmentationResult, dimensions);
      case 'ImageData':
        return this.generateImageDataMask(segmentationResult, dimensions);
      default:
        return this.generateBoundingBoxMask(segmentationResult, dimensions);
    }
  }

  /**
   * 合并多个遮罩
   */
  mergeMasks(masks: MaskData[]): MaskData {
    if (masks.length === 0) {
      throw new Error('Cannot merge empty mask array');
    }

    if (masks.length === 1) {
      return masks[0];
    }

    // 按类型分组遮罩
    const boundingBoxMasks = masks.filter(m => m.type === 'BoundingBoxes');
    const pixelMasks = masks.filter(m => m.type === 'PixelMask');
    const imageDataMasks = masks.filter(m => m.type === 'ImageData');

    // 优先合并边界框遮罩（最高效）
    if (boundingBoxMasks.length > 0) {
      return this.mergeBoundingBoxMasks(boundingBoxMasks);
    }

    // 其次合并像素遮罩
    if (pixelMasks.length > 0) {
      return this.mergePixelMasks(pixelMasks);
    }

    // 最后合并图像数据遮罩
    if (imageDataMasks.length > 0) {
      return this.mergeImageDataMasks(imageDataMasks);
    }

    return masks[0];
  }

  /**
   * 应用遮罩填充
   */
  applyPadding(mask: MaskData, padding: PaddingConfig): MaskData {
    const effectivePadding = { ...this.DEFAULT_PADDING, ...padding };

    switch (mask.type) {
      case 'BoundingBoxes':
        return this.applyBoundingBoxPadding(mask, effectivePadding);
      case 'PixelMask':
        return this.applyPixelMaskPadding(mask, effectivePadding);
      case 'ImageData':
        return this.applyImageDataPadding(mask, effectivePadding);
      default:
        return mask;
    }
  }

  /**
   * 优化遮罩数据
   */
  optimizeMask(mask: MaskData): MaskData {
    switch (mask.type) {
      case 'BoundingBoxes':
        return this.optimizeBoundingBoxMask(mask);
      case 'PixelMask':
        return this.optimizePixelMask(mask);
      case 'ImageData':
        return this.optimizeImageDataMask(mask);
      default:
        return mask;
    }
  }

  /**
   * 确定最佳遮罩类型
   */
  private determineMaskType(segments: PersonSegment[], dimensions: Dimensions): MaskData['type'] {
    const totalPixels = dimensions.width * dimensions.height;
    const segmentCount = segments.length;

    // 如果分段较少且图像较大，使用边界框
    if (segmentCount <= 3 && totalPixels > 640 * 480) {
      return 'BoundingBoxes';
    }

    // 如果分段较多或需要精确遮罩，使用像素遮罩
    if (segmentCount > 3 || totalPixels <= 320 * 240) {
      return 'PixelMask';
    }

    // 默认使用边界框（性能最佳）
    return 'BoundingBoxes';
  }

  /**
   * 生成边界框遮罩
   */
  private generateBoundingBoxMask(segmentationResult: SegmentationResult, dimensions: Dimensions): MaskData {
    const boundingBoxes: BoundingBox[] = [];

    segmentationResult.segments.forEach(segment => {
      // 应用自适应填充
      const padding = this.calculateAdaptivePadding(segment.confidence);
      const paddedBox = this.expandBoundingBox(segment.boundingBox, padding, dimensions);
      boundingBoxes.push(paddedBox);
    });

    return {
      type: 'BoundingBoxes',
      data: boundingBoxes,
      timestamp: Date.now(),
      confidence: segmentationResult.confidence
    };
  }

  /**
   * 生成像素遮罩
   */
  private generatePixelMask(segmentationResult: SegmentationResult, dimensions: Dimensions): MaskData {
    const maskSize = dimensions.width * dimensions.height;
    const combinedMask = new Uint8Array(maskSize);

    segmentationResult.segments.forEach(segment => {
      // 合并分段遮罩
      for (let i = 0; i < segment.mask.length && i < maskSize; i++) {
        combinedMask[i] = Math.max(combinedMask[i], segment.mask[i]);
      }
    });

    return {
      type: 'PixelMask',
      data: combinedMask,
      timestamp: Date.now(),
      confidence: segmentationResult.confidence
    };
  }

  /**
   * 生成图像数据遮罩
   */
  private generateImageDataMask(segmentationResult: SegmentationResult, dimensions: Dimensions): MaskData {
    const imageData = new ImageData(dimensions.width, dimensions.height);
    const data = imageData.data;

    segmentationResult.segments.forEach(segment => {
      const mask = segment.mask;
      
      for (let i = 0; i < mask.length; i++) {
        const pixelIndex = i * 4;
        const maskValue = mask[i];
        
        if (maskValue > 0) {
          // 设置为不透明白色（遮罩区域）
          data[pixelIndex] = 255;     // R
          data[pixelIndex + 1] = 255; // G
          data[pixelIndex + 2] = 255; // B
          data[pixelIndex + 3] = maskValue; // A (使用遮罩值作为透明度)
        }
      }
    });

    return {
      type: 'ImageData',
      data: imageData,
      timestamp: Date.now(),
      confidence: segmentationResult.confidence
    };
  }

  /**
   * 计算自适应填充
   */
  private calculateAdaptivePadding(confidence: number): PaddingConfig {
    // 置信度越高，填充越小（更精确）
    // 置信度越低，填充越大（更安全）
    const basePadding = 15;
    const confidenceFactor = Math.max(0.5, Math.min(1.0, confidence));
    const adaptivePadding = Math.round(basePadding * (1.5 - confidenceFactor));

    return {
      top: adaptivePadding,
      right: adaptivePadding,
      bottom: adaptivePadding,
      left: adaptivePadding,
      adaptive: true
    };
  }

  /**
   * 扩展边界框
   */
  private expandBoundingBox(box: BoundingBox, padding: PaddingConfig, dimensions: Dimensions): BoundingBox {
    return {
      x: Math.max(0, box.x - padding.left),
      y: Math.max(0, box.y - padding.top),
      width: Math.min(dimensions.width - Math.max(0, box.x - padding.left), box.width + padding.left + padding.right),
      height: Math.min(dimensions.height - Math.max(0, box.y - padding.top), box.height + padding.top + padding.bottom)
    };
  }

  /**
   * 合并边界框遮罩
   */
  private mergeBoundingBoxMasks(masks: MaskData[]): MaskData {
    const allBoxes: BoundingBox[] = [];
    let totalConfidence = 0;
    let latestTimestamp = 0;

    masks.forEach(mask => {
      if (Array.isArray(mask.data)) {
        allBoxes.push(...mask.data);
        totalConfidence += mask.confidence;
        latestTimestamp = Math.max(latestTimestamp, mask.timestamp);
      }
    });

    // 合并重叠的边界框
    const mergedBoxes = this.mergeOverlappingBoxes(allBoxes);

    return {
      type: 'BoundingBoxes',
      data: mergedBoxes,
      timestamp: latestTimestamp,
      confidence: totalConfidence / masks.length
    };
  }

  /**
   * 合并重叠的边界框
   */
  private mergeOverlappingBoxes(boxes: BoundingBox[]): BoundingBox[] {
    if (boxes.length <= 1) return boxes;

    const merged: BoundingBox[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < boxes.length; i++) {
      if (processed.has(i)) continue;

      let currentBox = { ...boxes[i] };
      processed.add(i);

      // 查找与当前框重叠的其他框
      for (let j = i + 1; j < boxes.length; j++) {
        if (processed.has(j)) continue;

        if (this.boxesOverlap(currentBox, boxes[j])) {
          currentBox = this.mergeTwoBoxes(currentBox, boxes[j]);
          processed.add(j);
        }
      }

      merged.push(currentBox);
    }

    return merged;
  }

  /**
   * 检查两个边界框是否重叠
   */
  private boxesOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
    return !(box1.x + box1.width < box2.x || 
             box2.x + box2.width < box1.x || 
             box1.y + box1.height < box2.y || 
             box2.y + box2.height < box1.y);
  }

  /**
   * 合并两个边界框
   */
  private mergeTwoBoxes(box1: BoundingBox, box2: BoundingBox): BoundingBox {
    const minX = Math.min(box1.x, box2.x);
    const minY = Math.min(box1.y, box2.y);
    const maxX = Math.max(box1.x + box1.width, box2.x + box2.width);
    const maxY = Math.max(box1.y + box1.height, box2.y + box2.height);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * 合并像素遮罩
   */
  private mergePixelMasks(masks: MaskData[]): MaskData {
    if (masks.length === 0) throw new Error('No masks to merge');

    const firstMask = masks[0].data as Uint8Array;
    const mergedMask = new Uint8Array(firstMask.length);
    let totalConfidence = 0;
    let latestTimestamp = 0;

    masks.forEach(mask => {
      const maskData = mask.data as Uint8Array;
      for (let i = 0; i < mergedMask.length && i < maskData.length; i++) {
        mergedMask[i] = Math.max(mergedMask[i], maskData[i]);
      }
      totalConfidence += mask.confidence;
      latestTimestamp = Math.max(latestTimestamp, mask.timestamp);
    });

    return {
      type: 'PixelMask',
      data: mergedMask,
      timestamp: latestTimestamp,
      confidence: totalConfidence / masks.length
    };
  }

  /**
   * 合并图像数据遮罩
   */
  private mergeImageDataMasks(masks: MaskData[]): MaskData {
    if (masks.length === 0) throw new Error('No masks to merge');

    const firstImageData = masks[0].data as ImageData;
    const mergedImageData = new ImageData(firstImageData.width, firstImageData.height);
    const mergedData = mergedImageData.data;
    let totalConfidence = 0;
    let latestTimestamp = 0;

    masks.forEach(mask => {
      const imageData = mask.data as ImageData;
      const data = imageData.data;
      
      for (let i = 0; i < mergedData.length; i += 4) {
        // 合并 alpha 通道（遮罩值）
        mergedData[i + 3] = Math.max(mergedData[i + 3], data[i + 3]);
        
        // 如果有遮罩值，设置为白色
        if (mergedData[i + 3] > 0) {
          mergedData[i] = 255;     // R
          mergedData[i + 1] = 255; // G
          mergedData[i + 2] = 255; // B
        }
      }
      
      totalConfidence += mask.confidence;
      latestTimestamp = Math.max(latestTimestamp, mask.timestamp);
    });

    return {
      type: 'ImageData',
      data: mergedImageData,
      timestamp: latestTimestamp,
      confidence: totalConfidence / masks.length
    };
  }

  /**
   * 应用边界框填充
   */
  private applyBoundingBoxPadding(mask: MaskData, padding: PaddingConfig): MaskData {
    const boxes = mask.data as BoundingBox[];
    const paddedBoxes = boxes.map(box => ({
      x: Math.max(0, box.x - padding.left),
      y: Math.max(0, box.y - padding.top),
      width: box.width + padding.left + padding.right,
      height: box.height + padding.top + padding.bottom
    }));

    return {
      ...mask,
      data: paddedBoxes,
      timestamp: Date.now()
    };
  }

  /**
   * 应用像素遮罩填充
   */
  private applyPixelMaskPadding(mask: MaskData, _padding: PaddingConfig): MaskData {
    // 像素遮罩填充需要知道图像尺寸，这里简化处理
    // 实际实现中应该传入尺寸参数
    return {
      ...mask,
      timestamp: Date.now()
    };
  }

  /**
   * 应用图像数据填充
   */
  private applyImageDataPadding(mask: MaskData, _padding: PaddingConfig): MaskData {
    // 图像数据填充的复杂实现
    // 这里简化处理，实际应该进行形态学膨胀操作
    return {
      ...mask,
      timestamp: Date.now()
    };
  }

  /**
   * 优化边界框遮罩
   */
  private optimizeBoundingBoxMask(mask: MaskData): MaskData {
    const boxes = mask.data as BoundingBox[];
    const optimizedBoxes = this.mergeOverlappingBoxes(boxes);

    return {
      ...mask,
      data: optimizedBoxes,
      timestamp: Date.now()
    };
  }

  /**
   * 优化像素遮罩
   */
  private optimizePixelMask(mask: MaskData): MaskData {
    // 可以实现遮罩压缩、噪声去除等优化
    return {
      ...mask,
      timestamp: Date.now()
    };
  }

  /**
   * 优化图像数据遮罩
   */
  private optimizeImageDataMask(mask: MaskData): MaskData {
    // 可以实现图像压缩、滤波等优化
    return {
      ...mask,
      timestamp: Date.now()
    };
  }

  /**
   * 创建空遮罩
   */
  private createEmptyMask(_dimensions: Dimensions): MaskData {
    return {
      type: 'BoundingBoxes',
      data: [],
      timestamp: Date.now(),
      confidence: 0
    };
  }

  /**
   * 获取遮罩统计信息
   */
  getMaskStats(mask: MaskData): {
    type: string;
    size: number;
    confidence: number;
    coverage: number;
  } {
    let size = 0;
    let coverage = 0;

    switch (mask.type) {
      case 'BoundingBoxes':
        const boxes = mask.data as BoundingBox[];
        size = boxes.length;
        coverage = boxes.reduce((sum, box) => sum + (box.width * box.height), 0);
        break;
      case 'PixelMask':
        const pixelMask = mask.data as Uint8Array;
        size = pixelMask.length;
        coverage = pixelMask.filter(pixel => pixel > 0).length;
        break;
      case 'ImageData':
        const imageData = mask.data as ImageData;
        size = imageData.width * imageData.height;
        const data = imageData.data;
        let nonZeroPixels = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) nonZeroPixels++;
        }
        coverage = nonZeroPixels;
        break;
    }

    return {
      type: mask.type,
      size,
      confidence: mask.confidence,
      coverage
    };
  }
}