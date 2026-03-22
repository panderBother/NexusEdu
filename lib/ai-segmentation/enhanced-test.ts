/**
 * 测试增强的AI分割系统（置信度过滤和性能保护）
 */

import { AISegmentationSystem } from './ai-segmentation-system';
import { ModelManager } from './model-manager';

async function testEnhancedFeatures() {
  console.log('=== 测试增强的AI分割系统功能 ===\n');

  // 创建模拟的模型管理器
  const modelManager = new ModelManager();
  
  // 创建AI分割系统实例
  const aiSystem = new AISegmentationSystem(modelManager, {
    confidenceThreshold: 0.7,
    maxDetections: 3,
    enableKeypoints: false,
    modelPrecision: 'float32'
  });

  // 创建测试用的ImageData
  const width = 640;
  const height = 480;
  const imageData = new ImageData(width, height);

  console.log('1. 测试正常处理...');
  try {
    const result1 = await aiSystem.processFrame(imageData);
    console.log(`✓ 处理成功: ${result1.segments.length} 个分段, 置信度: ${result1.confidence.toFixed(3)}, 处理时间: ${result1.processingTime.toFixed(2)}ms`);
  } catch (error) {
    console.log(`✗ 处理失败: ${(error as Error).message}`);
  }

  console.log('\n2. 测试性能保护状态...');
  const perfStatus = aiSystem.getPerformanceProtectionStatus();
  console.log(`✓ 性能保护状态:`, {
    isActive: perfStatus.isActive,
    consecutiveTimeouts: perfStatus.consecutiveTimeouts,
    frameSkipCount: perfStatus.frameSkipCount,
    adaptiveThreshold: perfStatus.adaptiveThreshold.toFixed(3),
    lastProcessingTime: perfStatus.lastProcessingTime.toFixed(2) + 'ms'
  });

  console.log('\n3. 测试置信度统计...');
  const confStats = aiSystem.getConfidenceStats();
  console.log(`✓ 置信度统计:`, {
    currentThreshold: confStats.currentThreshold,
    adaptiveThreshold: confStats.adaptiveThreshold.toFixed(3),
    averageConfidence: confStats.averageConfidence.toFixed(3),
    historyLength: confStats.confidenceHistory.length
  });

  console.log('\n4. 测试多帧处理（观察自适应阈值变化）...');
  for (let i = 0; i < 5; i++) {
    try {
      const result = await aiSystem.processFrame(imageData);
      const stats = aiSystem.getConfidenceStats();
      console.log(`✓ 帧 ${i + 1}: ${result.segments.length} 分段, 置信度: ${result.confidence.toFixed(3)}, 自适应阈值: ${stats.adaptiveThreshold.toFixed(3)}`);
    } catch (error) {
      console.log(`✗ 帧 ${i + 1} 处理失败: ${(error as Error).message}`);
    }
  }

  console.log('\n5. 测试处理统计...');
  const stats = aiSystem.getProcessingStats();
  console.log(`✓ 处理统计:`, {
    totalFrames: stats.totalFrames,
    averageTime: stats.averageTime.toFixed(2) + 'ms',
    minTime: stats.minTime.toFixed(2) + 'ms',
    maxTime: stats.maxTime.toFixed(2) + 'ms'
  });

  console.log('\n6. 测试性能指标...');
  const metrics = aiSystem.getPerformanceMetrics();
  console.log(`✓ 性能指标:`, {
    frameProcessingTime: metrics.frameProcessingTime.toFixed(2) + 'ms',
    modelInferenceTime: metrics.modelInferenceTime.toFixed(2) + 'ms',
    maskGenerationTime: metrics.maskGenerationTime.toFixed(2) + 'ms',
    totalLatency: metrics.totalLatency.toFixed(2) + 'ms',
    memoryUsage: (metrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB'
  });

  console.log('\n=== 测试完成 ===');
}

// 运行测试
testEnhancedFeatures().catch(console.error);

export { testEnhancedFeatures };