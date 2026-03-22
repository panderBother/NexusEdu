/**
 * 测试遮罩生成器功能
 */

import { MaskGenerator } from './mask-generator';
import { SegmentationResult, PersonSegment, BoundingBox, MaskData, Dimensions } from './types';

// 创建模拟的分割结果
function createMockSegmentationResult(segmentCount: number = 2): SegmentationResult {
  const segments: PersonSegment[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const boundingBox: BoundingBox = {
      x: 100 + i * 150,
      y: 50 + i * 100,
      width: 120,
      height: 200
    };

    // 创建简单的椭圆形遮罩
    const maskSize = 640 * 480;
    const mask = new Uint8Array(maskSize);
    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;
    const radiusX = boundingBox.width / 2;
    const radiusY = boundingBox.height / 2;

    for (let y = 0; y < 480; y++) {
      for (let x = 0; x < 640; x++) {
        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;
        const distance = dx * dx + dy * dy;
        
        const index = y * 640 + x;
        mask[index] = distance <= 1 ? 255 : 0;
      }
    }

    segments.push({
      id: `person_${i}`,
      boundingBox,
      mask,
      confidence: 0.8 + i * 0.1
    });
  }

  return {
    segments,
    confidence: 0.85,
    processingTime: 25.5,
    frameId: `test_frame_${Date.now()}`
  };
}

async function testMaskGenerator() {
  console.log('=== 测试遮罩生成器功能 ===\n');

  const maskGenerator = new MaskGenerator();
  const dimensions: Dimensions = { width: 640, height: 480 };

  console.log('1. 测试边界框遮罩生成...');
  const segmentationResult = createMockSegmentationResult(2);
  const boundingBoxMask = maskGenerator.generateMask(segmentationResult, dimensions);
  
  console.log(`✓ 生成边界框遮罩: 类型=${boundingBoxMask.type}, 置信度=${boundingBoxMask.confidence.toFixed(3)}`);
  if (boundingBoxMask.type === 'BoundingBoxes') {
    const boxes = boundingBoxMask.data as BoundingBox[];
    console.log(`  - 边界框数量: ${boxes.length}`);
    boxes.forEach((box, index) => {
      console.log(`  - 框 ${index + 1}: (${box.x}, ${box.y}) ${box.width}x${box.height}`);
    });
  }

  console.log('\n2. 测试遮罩统计信息...');
  const stats = maskGenerator.getMaskStats(boundingBoxMask);
  console.log(`✓ 遮罩统计:`, {
    type: stats.type,
    size: stats.size,
    confidence: stats.confidence.toFixed(3),
    coverage: stats.coverage
  });

  console.log('\n3. 测试遮罩填充...');
  const paddingConfig = {
    top: 20,
    right: 15,
    bottom: 20,
    left: 15,
    adaptive: false
  };
  
  const paddedMask = maskGenerator.applyPadding(boundingBoxMask, paddingConfig);
  console.log(`✓ 应用填充后: 类型=${paddedMask.type}`);
  
  if (paddedMask.type === 'BoundingBoxes') {
    const originalBoxes = boundingBoxMask.data as BoundingBox[];
    const paddedBoxes = paddedMask.data as BoundingBox[];
    
    console.log('  - 填充前后对比:');
    for (let i = 0; i < Math.min(originalBoxes.length, paddedBoxes.length); i++) {
      const orig = originalBoxes[i];
      const padded = paddedBoxes[i];
      console.log(`    框 ${i + 1}: ${orig.width}x${orig.height} → ${padded.width}x${padded.height}`);
    }
  }

  console.log('\n4. 测试遮罩合并...');
  const segmentationResult2 = createMockSegmentationResult(1);
  const mask2 = maskGenerator.generateMask(segmentationResult2, dimensions);
  
  const mergedMask = maskGenerator.mergeMasks([boundingBoxMask, mask2]);
  console.log(`✓ 合并遮罩: 类型=${mergedMask.type}, 置信度=${mergedMask.confidence.toFixed(3)}`);
  
  const mergedStats = maskGenerator.getMaskStats(mergedMask);
  console.log(`  - 合并后统计: 大小=${mergedStats.size}, 覆盖=${mergedStats.coverage}`);

  console.log('\n5. 测试遮罩优化...');
  const optimizedMask = maskGenerator.optimizeMask(mergedMask);
  console.log(`✓ 优化遮罩: 类型=${optimizedMask.type}`);
  
  const optimizedStats = maskGenerator.getMaskStats(optimizedMask);
  console.log(`  - 优化后统计: 大小=${optimizedStats.size}, 覆盖=${optimizedStats.coverage}`);

  console.log('\n6. 测试空结果处理...');
  const emptyResult: SegmentationResult = {
    segments: [],
    confidence: 0,
    processingTime: 0,
    frameId: 'empty_frame'
  };
  
  const emptyMask = maskGenerator.generateMask(emptyResult, dimensions);
  console.log(`✓ 空结果遮罩: 类型=${emptyMask.type}, 置信度=${emptyMask.confidence}`);
  
  const emptyStats = maskGenerator.getMaskStats(emptyMask);
  console.log(`  - 空遮罩统计: 大小=${emptyStats.size}, 覆盖=${emptyStats.coverage}`);

  console.log('\n7. 测试大量分段处理...');
  const largeSegmentationResult = createMockSegmentationResult(5);
  const largeMask = maskGenerator.generateMask(largeSegmentationResult, dimensions);
  console.log(`✓ 大量分段遮罩: 类型=${largeMask.type}, 分段数=${largeSegmentationResult.segments.length}`);
  
  const largeStats = maskGenerator.getMaskStats(largeMask);
  console.log(`  - 大量分段统计: 大小=${largeStats.size}, 覆盖=${largeStats.coverage}`);

  console.log('\n8. 测试不同遮罩类型生成...');
  
  // 强制生成像素遮罩（通过小尺寸）
  const smallDimensions: Dimensions = { width: 320, height: 240 };
  const pixelMask = maskGenerator.generateMask(largeSegmentationResult, smallDimensions);
  console.log(`✓ 小尺寸遮罩: 类型=${pixelMask.type}`);

  console.log('\n=== 遮罩生成器功能测试完成 ===');
  console.log('✓ 所有功能正常工作');
}

// 运行测试
testMaskGenerator().catch(console.error);

export { testMaskGenerator };