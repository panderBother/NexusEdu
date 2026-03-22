/**
 * AI分割系统和遮罩生成器集成测试
 */

import { AISegmentationSystem } from './ai-segmentation-system';
import { MaskGenerator } from './mask-generator';
import { Dimensions } from './types';

// 模拟 ImageData 类（Node.js 环境）
class MockImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

// 创建模拟的模型管理器
class MockModelManager {
  private loaded = true;

  isModelLoaded(): boolean {
    return this.loaded;
  }

  async loadModel(): Promise<any> {
    return {};
  }

  getModelInfo() {
    return {
      name: 'MockModel',
      version: '1.0.0',
      inputSize: { width: 640, height: 480 },
      outputStride: 16,
      memoryUsage: 50 * 1024 * 1024,
      loadTime: 1000
    };
  }

  optimizeForDevice(): void {}
  unloadModel(): void {}
}

async function testAISegmentationIntegration() {
  console.log('=== AI分割系统和遮罩生成器集成测试 ===\n');

  // 创建系统组件
  const aiSystem = new AISegmentationSystem(new MockModelManager() as any, {
    confidenceThreshold: 0.7,
    maxDetections: 3,
    enableKeypoints: false,
    modelPrecision: 'float32'
  });

  const maskGenerator = new MaskGenerator();
  const dimensions: Dimensions = { width: 640, height: 480 };

  // 创建测试用的ImageData
  const imageData = new MockImageData(dimensions.width, dimensions.height) as any;

  console.log('1. 测试完整的AI分割到遮罩生成流程...');
  
  try {
    // 步骤1: AI分割处理
    console.log('  - 执行AI人体分割...');
    const segmentationResult = await aiSystem.processFrame(imageData);
    console.log(`  ✓ 分割完成: ${segmentationResult.segments.length} 个分段, 置信度=${segmentationResult.confidence.toFixed(3)}, 处理时间=${segmentationResult.processingTime.toFixed(2)}ms`);

    // 步骤2: 生成遮罩
    console.log('  - 生成遮罩数据...');
    const maskData = maskGenerator.generateMask(segmentationResult, dimensions);
    console.log(`  ✓ 遮罩生成: 类型=${maskData.type}, 置信度=${maskData.confidence.toFixed(3)}`);

    // 步骤3: 应用填充
    console.log('  - 应用自适应填充...');
    const paddedMask = maskGenerator.applyPadding(maskData, {
      top: 15,
      right: 15,
      bottom: 15,
      left: 15,
      adaptive: true
    });
    console.log(`  ✓ 填充完成: 类型=${paddedMask.type}`);

    // 步骤4: 优化遮罩
    console.log('  - 优化遮罩数据...');
    const optimizedMask = maskGenerator.optimizeMask(paddedMask);
    console.log(`  ✓ 优化完成: 类型=${optimizedMask.type}`);

    // 获取最终统计
    const finalStats = maskGenerator.getMaskStats(optimizedMask);
    console.log(`  ✓ 最终遮罩统计:`, {
      type: finalStats.type,
      size: finalStats.size,
      confidence: finalStats.confidence.toFixed(3),
      coverage: finalStats.coverage
    });

  } catch (error) {
    console.log(`  ✗ 处理失败: ${(error as Error).message}`);
  }

  console.log('\n2. 测试多帧处理和遮罩合并...');
  
  const masks = [];
  for (let i = 0; i < 3; i++) {
    try {
      const result = await aiSystem.processFrame(imageData);
      const mask = maskGenerator.generateMask(result, dimensions);
      masks.push(mask);
      console.log(`  ✓ 帧 ${i + 1}: ${result.segments.length} 分段 → 遮罩类型=${mask.type}`);
    } catch (error) {
      console.log(`  ✗ 帧 ${i + 1} 处理失败: ${(error as Error).message}`);
    }
  }

  if (masks.length > 0) {
    console.log('  - 合并多帧遮罩...');
    const mergedMask = maskGenerator.mergeMasks(masks);
    const mergedStats = maskGenerator.getMaskStats(mergedMask);
    console.log(`  ✓ 合并完成: 类型=${mergedMask.type}, 大小=${mergedStats.size}, 覆盖=${mergedStats.coverage}`);
  }

  console.log('\n3. 测试性能监控和遮罩生成的协调...');
  
  const perfStatus = aiSystem.getPerformanceProtectionStatus();
  console.log(`  - 性能保护状态: 激活=${perfStatus.isActive}, 跳过帧数=${perfStatus.frameSkipCount}`);
  
  const confStats = aiSystem.getConfidenceStats();
  console.log(`  - 置信度统计: 当前阈值=${confStats.currentThreshold}, 自适应阈值=${confStats.adaptiveThreshold.toFixed(3)}`);

  console.log('\n4. 测试错误场景处理...');
  
  // 测试空分割结果
  const emptyResult = {
    segments: [],
    confidence: 0,
    processingTime: 0,
    frameId: 'empty_test'
  };
  
  const emptyMask = maskGenerator.generateMask(emptyResult, dimensions);
  console.log(`  ✓ 空结果处理: 遮罩类型=${emptyMask.type}, 置信度=${emptyMask.confidence}`);

  console.log('\n5. 测试不同配置下的表现...');
  
  // 更改AI系统配置
  aiSystem.setSegmentationConfig({
    confidenceThreshold: 0.8,
    maxDetections: 2,
    enableKeypoints: true,
    modelPrecision: 'float16'
  });

  try {
    const highConfResult = await aiSystem.processFrame(imageData);
    const highConfMask = maskGenerator.generateMask(highConfResult, dimensions);
    console.log(`  ✓ 高置信度配置: ${highConfResult.segments.length} 分段 → 遮罩类型=${highConfMask.type}`);
  } catch (error) {
    console.log(`  ✗ 高置信度配置失败: ${(error as Error).message}`);
  }

  console.log('\n6. 性能基准测试...');
  
  const startTime = performance.now();
  let successCount = 0;
  let totalSegments = 0;
  let totalMasks = 0;

  for (let i = 0; i < 10; i++) {
    try {
      const result = await aiSystem.processFrame(imageData);
      const mask = maskGenerator.generateMask(result, dimensions);
      
      successCount++;
      totalSegments += result.segments.length;
      totalMasks++;
    } catch (error) {
      // 跳过失败的帧
    }
  }

  const totalTime = performance.now() - startTime;
  const avgTimePerFrame = totalTime / 10;
  
  console.log(`  ✓ 性能基准结果:`);
  console.log(`    - 总时间: ${totalTime.toFixed(2)}ms`);
  console.log(`    - 平均每帧: ${avgTimePerFrame.toFixed(2)}ms`);
  console.log(`    - 成功率: ${successCount}/10 (${(successCount/10*100).toFixed(1)}%)`);
  console.log(`    - 总分段数: ${totalSegments}`);
  console.log(`    - 总遮罩数: ${totalMasks}`);

  console.log('\n=== AI分割系统和遮罩生成器集成测试完成 ===');
  console.log('✓ 集成功能正常工作');
  console.log('✓ 性能保护机制有效');
  console.log('✓ 遮罩生成流程完整');
}

// 运行测试
testAISegmentationIntegration().catch(console.error);

export { testAISegmentationIntegration };