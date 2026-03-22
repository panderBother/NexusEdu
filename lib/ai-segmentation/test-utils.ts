/**
 * AI 人体分割系统的测试工具和辅助函数
 */

import { SegmentationResult, PersonSegment, BoundingBox, MaskData } from './types';

/**
 * 创建模拟的视频元素
 */
export function createMockVideoElement(width = 640, height = 480): HTMLVideoElement {
  const video = document.createElement('video');
  video.width = width;
  video.height = height;
  video.currentTime = 0;
  video.paused = false;
  
  // 模拟视频元素的方法
  Object.defineProperty(video, 'videoWidth', { value: width, writable: false });
  Object.defineProperty(video, 'videoHeight', { value: height, writable: false });
  
  return video;
}

/**
 * 创建模拟的 Canvas ImageData
 */
export function createMockImageData(width = 640, height = 480): ImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = width;
  canvas.height = height;
  
  // 填充一些测试数据
  ctx.fillStyle = 'rgb(100, 150, 200)';
  ctx.fillRect(0, 0, width, height);
  
  return ctx.getImageData(0, 0, width, height);
}

/**
 * 创建模拟的分割结果
 */
export function createMockSegmentationResult(
  segmentCount = 1,
  confidence = 0.8
): SegmentationResult {
  const segments: PersonSegment[] = [];
  
  for (let i = 0; i < segmentCount; i++) {
    const boundingBox: BoundingBox = {
      x: 100 + i * 50,
      y: 100 + i * 50,
      width: 200,
      height: 300
    };
    
    const maskSize = boundingBox.width * boundingBox.height;
    const mask = new Uint8Array(maskSize);
    // 填充一些模拟的遮罩数据
    for (let j = 0; j < maskSize; j++) {
      mask[j] = Math.random() > 0.5 ? 255 : 0;
    }
    
    segments.push({
      id: `person_${i}`,
      boundingBox,
      mask,
      confidence: confidence + (Math.random() - 0.5) * 0.2,
      keypoints: []
    });
  }
  
  return {
    segments,
    confidence,
    processingTime: 15 + Math.random() * 10,
    frameId: `frame_${Date.now()}_${Math.random()}`
  };
}

/**
 * 创建模拟的遮罩数据
 */
export function createMockMaskData(
  width = 640,
  height = 480,
  type: 'ImageData' | 'BoundingBoxes' | 'PixelMask' = 'ImageData'
): MaskData {
  let data: ImageData | BoundingBox[] | Uint8Array;
  
  switch (type) {
    case 'ImageData':
      data = createMockImageData(width, height);
      break;
    case 'BoundingBoxes':
      data = [
        { x: 100, y: 100, width: 200, height: 300 },
        { x: 350, y: 150, width: 180, height: 280 }
      ];
      break;
    case 'PixelMask':
      data = new Uint8Array(width * height);
      // 创建一些模拟的像素遮罩
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() > 0.7 ? 255 : 0;
      }
      break;
  }
  
  return {
    type,
    data,
    timestamp: Date.now(),
    confidence: 0.8 + Math.random() * 0.2
  };
}

/**
 * 验证分割结果的有效性
 */
export function validateSegmentationResult(result: SegmentationResult): boolean {
  if (!result || typeof result !== 'object') return false;
  if (!Array.isArray(result.segments)) return false;
  if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) return false;
  if (typeof result.processingTime !== 'number' || result.processingTime < 0) return false;
  if (typeof result.frameId !== 'string' || result.frameId.length === 0) return false;
  
  // 验证每个分段
  for (const segment of result.segments) {
    if (!validatePersonSegment(segment)) return false;
  }
  
  return true;
}

/**
 * 验证人体分段的有效性
 */
export function validatePersonSegment(segment: PersonSegment): boolean {
  if (!segment || typeof segment !== 'object') return false;
  if (typeof segment.id !== 'string' || segment.id.length === 0) return false;
  if (typeof segment.confidence !== 'number' || segment.confidence < 0 || segment.confidence > 1) return false;
  if (!validateBoundingBox(segment.boundingBox)) return false;
  if (!(segment.mask instanceof Uint8Array)) return false;
  
  return true;
}

/**
 * 验证边界框的有效性
 */
export function validateBoundingBox(box: BoundingBox): boolean {
  if (!box || typeof box !== 'object') return false;
  if (typeof box.x !== 'number' || box.x < 0) return false;
  if (typeof box.y !== 'number' || box.y < 0) return false;
  if (typeof box.width !== 'number' || box.width <= 0) return false;
  if (typeof box.height !== 'number' || box.height <= 0) return false;
  
  return true;
}

/**
 * 验证遮罩数据的有效性
 */
export function validateMaskData(mask: MaskData): boolean {
  if (!mask || typeof mask !== 'object') return false;
  if (!['ImageData', 'BoundingBoxes', 'PixelMask'].includes(mask.type)) return false;
  if (typeof mask.timestamp !== 'number' || mask.timestamp <= 0) return false;
  if (typeof mask.confidence !== 'number' || mask.confidence < 0 || mask.confidence > 1) return false;
  
  // 根据类型验证数据
  switch (mask.type) {
    case 'ImageData':
      return mask.data instanceof ImageData;
    case 'BoundingBoxes':
      return Array.isArray(mask.data) && 
             (mask.data as BoundingBox[]).every(validateBoundingBox);
    case 'PixelMask':
      return mask.data instanceof Uint8Array;
    default:
      return false;
  }
}

/**
 * 计算两个边界框的重叠面积
 */
export function calculateBoundingBoxOverlap(box1: BoundingBox, box2: BoundingBox): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
  
  if (x2 <= x1 || y2 <= y1) return 0;
  
  return (x2 - x1) * (y2 - y1);
}

/**
 * 性能测试辅助函数
 */
export class PerformanceTestHelper {
  private startTime: number = 0;
  private measurements: number[] = [];
  
  start(): void {
    this.startTime = performance.now();
  }
  
  end(): number {
    const duration = performance.now() - this.startTime;
    this.measurements.push(duration);
    return duration;
  }
  
  getAverageTime(): number {
    if (this.measurements.length === 0) return 0;
    return this.measurements.reduce((sum, time) => sum + time, 0) / this.measurements.length;
  }
  
  getMinTime(): number {
    return this.measurements.length > 0 ? Math.min(...this.measurements) : 0;
  }
  
  getMaxTime(): number {
    return this.measurements.length > 0 ? Math.max(...this.measurements) : 0;
  }
  
  reset(): void {
    this.measurements = [];
  }
}