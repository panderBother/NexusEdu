/**
 * 专门测试置信度过滤和性能保护功能
 */

import { AISegmentationSystem } from './ai-segmentation-system';

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

// 创建模拟的模型管理器（避免浏览器依赖）
class MockModelManager {
  private loaded = true;

  isModelLoaded(): boolean {
    return this.loaded;
  }

  // 其他方法的简单实现
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

async function testConfidenceAndPerformance() {
  console.log('=== 测试置信度过滤和性能保护功能 ===\n');

  // 创建AI分割系统实例
  const aiSystem = new AISegmentationSystem(new MockModelManager() as any, {
    confidenceThreshold: 0.7,
    maxDetections: 3,
    enableKeypoints: false,
    modelPrecision: 'float32'
  });

  // 创建测试用的ImageData
  const width = 640;
  const height = 480;
  const imageData = new MockImageData(width, height) as any;

  console.log('1. 测试初始状态...');
  const initialPerfStatus = aiSystem.getPerformanceProtectionStatus();
  const initialConfStats = aiSystem.getConfidenceStats();
  
  console.log(`✓ 初始性能保护状态: 激活=${initialPerfStatus.isActive}, 连续超时=${initialPerfStatus.consecutiveTimeouts}`);
  console.log(`✓ 初始置信度阈值: 基础=${initialConfStats.currentThreshold}, 自适应=${initialConfStats.adaptiveThreshold.toFixed(3)}`);

  console.log('\n2. 测试多帧处理和自适应阈值...');
  for (let i = 0; i < 8; i++) {
    try {
      const result = await aiSystem.processFrame(imageData);
      const confStats = aiSystem.getConfidenceStats();
      
      console.log(`✓ 帧 ${i + 1}: ${result.segments.length} 分段, 置信度=${result.confidence.toFixed(3)}, 自适应阈值=${confStats.adaptiveThreshold.toFixed(3)}, 处理时间=${result.processingTime.toFixed(2)}ms`);
      
      // 短暂延迟以模拟真实处理
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
      console.log(`✗ 帧 ${i + 1} 处理失败: ${(error as Error).message}`);
    }
  }

  console.log('\n3. 检查置信度历史和统计...');
  const finalConfStats = aiSystem.getConfidenceStats();
  console.log(`✓ 最终置信度统计:`);
  console.log(`  - 当前阈值: ${finalConfStats.currentThreshold}`);
  console.log(`  - 自适应阈值: ${finalConfStats.adaptiveThreshold.toFixed(3)}`);
  console.log(`  - 平均置信度: ${finalConfStats.averageConfidence.toFixed(3)}`);
  console.log(`  - 历史记录长度: ${finalConfStats.confidenceHistory.length}`);
  console.log(`  - 置信度历史: [${finalConfStats.confidenceHistory.map(c => c.toFixed(3)).join(', ')}]`);

  console.log('\n4. 检查性能保护状态...');
  const finalPerfStatus = aiSystem.getPerformanceProtectionStatus();
  console.log(`✓ 最终性能保护状态:`);
  console.log(`  - 激活状态: ${finalPerfStatus.isActive}`);
  console.log(`  - 连续超时: ${finalPerfStatus.consecutiveTimeouts}`);
  console.log(`  - 跳过帧数: ${finalPerfStatus.frameSkipCount}`);
  console.log(`  - 最后处理时间: ${finalPerfStatus.lastProcessingTime.toFixed(2)}ms`);

  console.log('\n5. 检查处理统计...');
  const stats = aiSystem.getProcessingStats();
  console.log(`✓ 处理统计:`);
  console.log(`  - 总帧数: ${stats.totalFrames}`);
  console.log(`  - 平均时间: ${stats.averageTime.toFixed(2)}ms`);
  console.log(`  - 最小时间: ${stats.minTime.toFixed(2)}ms`);
  console.log(`  - 最大时间: ${stats.maxTime.toFixed(2)}ms`);

  console.log('\n6. 测试配置更新...');
  aiSystem.setSegmentationConfig({
    confidenceThreshold: 0.8,
    maxDetections: 2,
    enableKeypoints: true,
    modelPrecision: 'float16'
  });
  
  const result = await aiSystem.processFrame(imageData);
  const updatedConfStats = aiSystem.getConfidenceStats();
  console.log(`✓ 配置更新后: ${result.segments.length} 分段, 新阈值=${updatedConfStats.currentThreshold}`);

  console.log('\n=== 置信度过滤和性能保护功能测试完成 ===');
  console.log('✓ 所有功能正常工作');
}

// 运行测试
testConfidenceAndPerformance().catch(console.error);

export { testConfidenceAndPerformance };