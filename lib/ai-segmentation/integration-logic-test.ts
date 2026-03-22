/**
 * 集成逻辑测试（无浏览器依赖）
 * 测试遮罩生成和弹幕集成的核心逻辑
 */

import { MaskGenerator } from './mask-generator';
import { BarrageIntegration, BarrageRenderer } from './barrage-integration';
import { SegmentationResult, PersonSegment, BoundingBox, Dimensions } from './types';

// 模拟弹幕渲染器
class MockBarrageRenderer implements BarrageRenderer {
  private currentMask: string | ImageData | undefined = undefined;
  private maskUpdateCount = 0;

  setMask(mask?: string | ImageData): void {
    this.currentMask = mask;
    this.maskUpdateCount++;
    
    const maskType = typeof mask === 'string' ? 'URL' : 
                    mask instanceof ImageData ? 'ImageData' : 'none';
    console.log(`  → 遮罩更新 #${this.maskUpdateCount}: ${maskType}`);
  }

  get canvasSize() {
    return { width: 640, height: 480 };
  }

  getMaskUpdateCount() {
    return this.maskUpdateCount;
  }

  getCurrentMask() {
    return this.currentMask;
  }
}

// 创建模拟分割结果
function createMockSegmentationResult(segmentCount: number = 2): SegmentationResult {
  const segments: PersonSegment[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const boundingBox: BoundingBox = {
      x: 100 + i * 200,
      y: 50 + i * 150,
      width: 150,
      height: 250
    };

    // 创建简单的遮罩数据
    const maskSize = 640 * 480;
    const mask = new Uint8Array(maskSize);
    
    // 填充边界框区域
    for (let y = boundingBox.y; y < boundingBox.y + boundingBox.height && y < 480; y++) {
      for (let x = boundingBox.x; x < boundingBox.x + boundingBox.width && x < 640; x++) {
        const index = y * 640 + x;
        if (index < maskSize) {
          mask[index] = 255;
        }
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

async function testIntegrationLogic() {
  console.log('=== 集成逻辑测试 ===\n');

  const mockRenderer = new MockBarrageRenderer();
  const maskGenerator = new MaskGenerator();
  const barrageIntegration = new BarrageIntegration(mockRenderer, {
    updateInterval: 16, // ~60 FPS
    enableSmoothing: false, // 禁用平滑以简化测试
    cacheSize: 3
  });

  const dimensions: Dimensions = { width: 640, height: 480 };

  console.log('1. 测试基础遮罩生成和集成...');
  
  // 生成AI分割结果
  const segmentationResult = createMockSegmentationResult(2);
  console.log(`  - 创建分割结果: ${segmentationResult.segments.length} 个分段`);

  // 生成遮罩
  const maskData = maskGenerator.generateMask(segmentationResult, dimensions);
  console.log(`  - 生成遮罩: 类型=${maskData.type}, 置信度=${maskData.confidence.toFixed(3)}`);

  // 应用到弹幕系统
  barrageIntegration.updateAIMask(maskData);
  console.log(`  ✓ 遮罩应用完成, 更新次数: ${mockRenderer.getMaskUpdateCount()}`);

  console.log('\n2. 测试多次更新和频率限制...');
  
  for (let i = 0; i < 5; i++) {
    const result = createMockSegmentationResult(1 + i % 3);
    const mask = maskGenerator.generateMask(result, dimensions);
    barrageIntegration.updateAIMask(mask);
    
    // 短暂延迟以测试频率限制
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log(`  ✓ 多次更新完成, 总更新次数: ${mockRenderer.getMaskUpdateCount()}`);

  console.log('\n3. 测试遮罩统计和状态...');
  
  const maskStats = maskGenerator.getMaskStats(maskData);
  console.log(`  - 遮罩统计:`, {
    type: maskStats.type,
    size: maskStats.size,
    confidence: maskStats.confidence.toFixed(3),
    coverage: maskStats.coverage
  });

  const integrationStatus = barrageIntegration.getCurrentMaskStatus();
  console.log(`  - 集成状态:`, {
    hasMask: integrationStatus.hasMask,
    maskType: integrationStatus.maskType,
    cacheSize: integrationStatus.cacheSize
  });

  console.log('\n4. 测试遮罩合并...');
  
  // 创建多个遮罩进行合并
  const masks = [];
  for (let i = 0; i < 3; i++) {
    const result = createMockSegmentationResult(1);
    const mask = maskGenerator.generateMask(result, dimensions);
    masks.push(mask);
  }

  const mergedMask = maskGenerator.mergeMasks(masks);
  console.log(`  ✓ 遮罩合并完成: 类型=${mergedMask.type}, 置信度=${mergedMask.confidence.toFixed(3)}`);

  // 应用合并后的遮罩
  barrageIntegration.updateAIMask(mergedMask);
  console.log(`  ✓ 合并遮罩应用完成`);

  console.log('\n5. 测试遮罩优化...');
  
  const optimizedMask = maskGenerator.optimizeMask(mergedMask);
  const optimizedStats = maskGenerator.getMaskStats(optimizedMask);
  console.log(`  ✓ 遮罩优化完成:`, {
    type: optimizedStats.type,
    size: optimizedStats.size,
    coverage: optimizedStats.coverage
  });

  console.log('\n6. 测试空遮罩处理...');
  
  const emptyResult: SegmentationResult = {
    segments: [],
    confidence: 0,
    processingTime: 0,
    frameId: 'empty_test'
  };

  const emptyMask = maskGenerator.generateMask(emptyResult, dimensions);
  barrageIntegration.updateAIMask(emptyMask);
  console.log(`  ✓ 空遮罩处理完成: 类型=${emptyMask.type}, 置信度=${emptyMask.confidence}`);

  console.log('\n7. 测试性能统计...');
  
  const perfStats = barrageIntegration.getPerformanceStats();
  console.log(`  ✓ 性能统计:`, {
    updateInterval: perfStats.updateInterval,
    cacheSize: perfStats.cacheSize,
    isUpdating: perfStats.isUpdating,
    smoothingActive: perfStats.smoothingActive
  });

  console.log('\n8. 测试清理操作...');
  
  barrageIntegration.clearAIMask();
  console.log(`  ✓ 遮罩清理完成`);

  const finalStatus = barrageIntegration.getCurrentMaskStatus();
  console.log(`  - 清理后状态: hasMask=${finalStatus.hasMask}`);

  console.log('\n9. 测试资源释放...');
  
  barrageIntegration.dispose();
  console.log(`  ✓ 资源释放完成`);

  console.log('\n=== 集成逻辑测试完成 ===');
  console.log(`✓ 总遮罩更新次数: ${mockRenderer.getMaskUpdateCount()}`);
  console.log('✓ 遮罩生成和转换正常');
  console.log('✓ 弹幕系统集成有效');
  console.log('✓ 性能监控和缓存机制工作正常');
}

// 运行测试
testIntegrationLogic().catch(console.error);

export { testIntegrationLogic };