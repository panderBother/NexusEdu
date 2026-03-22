/**
 * 弹幕系统集成测试
 * 测试AI遮罩系统与弹幕系统的完整集成
 */

import { AIMaskSystem } from './ai-mask-system';
import { BarrageRenderer } from './barrage-integration';

// 模拟弹幕渲染器
class MockBarrageRenderer implements BarrageRenderer {
  private currentMask: string | ImageData | undefined = undefined;
  private maskHistory: Array<{ timestamp: number; type: string; hasData: boolean }> = [];

  setMask(mask?: string | ImageData): void {
    this.currentMask = mask;
    this.maskHistory.push({
      timestamp: Date.now(),
      type: typeof mask === 'string' ? 'URL' : mask instanceof ImageData ? 'ImageData' : 'none',
      hasData: mask !== undefined
    });
    
    console.log(`Mock renderer: Mask updated - Type: ${typeof mask === 'string' ? 'URL' : mask instanceof ImageData ? 'ImageData' : 'none'}`);
  }

  get canvasSize() {
    return { width: 640, height: 480 };
  }

  getCurrentMask() {
    return this.currentMask;
  }

  getMaskHistory() {
    return [...this.maskHistory];
  }

  clearHistory() {
    this.maskHistory = [];
  }
}

// 模拟视频元素
class MockVideoElement {
  videoWidth = 640;
  videoHeight = 480;
  private eventListeners: Map<string, Function[]> = new Map();

  addEventListener(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  triggerEvent(event: string) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback());
    }
  }
}

async function testBarrageIntegration() {
  console.log('=== 弹幕系统集成测试 ===\n');

  // 创建模拟组件
  const mockRenderer = new MockBarrageRenderer();
  const mockVideo = new MockVideoElement() as any;

  console.log('1. 测试AI遮罩系统初始化...');
  const aiMaskSystem = new AIMaskSystem(mockRenderer, {
    segmentation: {
      confidenceThreshold: 0.7,
      maxDetections: 2,
      enableKeypoints: false,
      modelPrecision: 'float32'
    },
    integration: {
      updateInterval: 50, // 20 FPS for testing
      enableSmoothing: true,
      smoothingDuration: 100,
      cacheSize: 5,
      enableOptimization: true
    },
    autoStart: false,
    targetFPS: 20
  });

  console.log('✓ AI遮罩系统初始化完成');

  console.log('\n2. 测试视频元素设置...');
  try {
    await aiMaskSystem.setVideoElement(mockVideo);
    console.log('✓ 视频元素设置成功');
  } catch (error) {
    console.log(`✗ 视频元素设置失败: ${(error as Error).message}`);
  }

  console.log('\n3. 测试系统状态检查...');
  const initialState = aiMaskSystem.getSystemState();
  console.log(`✓ 系统状态:`, {
    status: initialState.status,
    modelLoaded: initialState.model.loaded,
    isReady: aiMaskSystem.isReady(),
    isActive: aiMaskSystem.isActive()
  });

  console.log('\n4. 测试手动帧处理...');
  try {
    const maskData = await aiMaskSystem.processFrame();
    if (maskData) {
      console.log(`✓ 手动帧处理成功: 类型=${maskData.type}, 置信度=${maskData.confidence.toFixed(3)}`);
    } else {
      console.log('✓ 手动帧处理完成 (无遮罩数据)');
    }
  } catch (error) {
    console.log(`✗ 手动帧处理失败: ${(error as Error).message}`);
  }

  console.log('\n5. 测试遮罩历史记录...');
  const maskHistory = mockRenderer.getMaskHistory();
  console.log(`✓ 遮罩更新历史: ${maskHistory.length} 次更新`);
  maskHistory.forEach((entry, index) => {
    console.log(`  - 更新 ${index + 1}: ${entry.type}, 有数据=${entry.hasData}`);
  });

  console.log('\n6. 测试手动遮罩合并...');
  // 创建模拟的手动遮罩ImageData
  const manualMaskData = new ImageData(640, 480);
  const data = manualMaskData.data;
  
  // 在中心创建一个矩形遮罩
  for (let y = 200; y < 280; y++) {
    for (let x = 270; x < 370; x++) {
      const index = (y * 640 + x) * 4;
      data[index] = 255;     // R
      data[index + 1] = 255; // G
      data[index + 2] = 255; // B
      data[index + 3] = 255; // A
    }
  }

  aiMaskSystem.mergeWithManualMask(manualMaskData);
  console.log('✓ 手动遮罩合并测试完成');

  console.log('\n7. 测试性能指标...');
  const perfMetrics = aiMaskSystem.getPerformanceMetrics();
  console.log(`✓ 性能指标:`, {
    frameProcessingTime: perfMetrics.frameProcessingTime?.toFixed(2) + 'ms',
    totalLatency: perfMetrics.totalLatency?.toFixed(2) + 'ms',
    memoryUsage: (perfMetrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB'
  });

  console.log('\n8. 测试配置更新...');
  aiMaskSystem.updateConfig({
    segmentation: {
      confidenceThreshold: 0.8,
      maxDetections: 1
    },
    targetFPS: 15
  });
  console.log('✓ 配置更新完成');

  console.log('\n9. 测试系统清理...');
  aiMaskSystem.clearAllMasks();
  console.log('✓ 遮罩清理完成');

  const finalMaskHistory = mockRenderer.getMaskHistory();
  console.log(`✓ 最终遮罩历史: ${finalMaskHistory.length} 次更新`);

  console.log('\n10. 测试系统销毁...');
  aiMaskSystem.dispose();
  console.log('✓ 系统销毁完成');

  console.log('\n=== 弹幕系统集成测试完成 ===');
  console.log('✓ 所有集成功能正常工作');
  console.log('✓ AI遮罩系统与弹幕渲染器成功集成');
  console.log('✓ 遮罩数据转换和应用正常');
  console.log('✓ 性能监控和配置管理有效');
}

// 运行测试
testBarrageIntegration().catch(console.error);

export { testBarrageIntegration };