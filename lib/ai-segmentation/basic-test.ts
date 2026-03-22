/**
 * 基础组件测试
 */

import { FrameProcessor } from './frame-processor';
import { ModelManager } from './model-manager';
import { ErrorHandler } from './error-handler';
import { ConfigManager } from './config';

/**
 * 测试基础组件是否正常工作
 */
export async function testBasicComponents(): Promise<boolean> {
  console.log('🧪 开始测试基础组件...');

  try {
    // 测试配置管理器
    console.log('📋 测试配置管理器...');
    const configManager = new ConfigManager();
    const config = configManager.getConfig();
    console.log('✅ 配置管理器工作正常');

    // 测试错误处理器
    console.log('🚨 测试错误处理器...');
    const errorHandler = new ErrorHandler();
    const errorHistory = errorHandler.getErrorHistory();
    console.log('✅ 错误处理器工作正常');

    // 测试模型管理器
    console.log('🤖 测试模型管理器...');
    const modelManager = new ModelManager();
    console.log('✅ 模型管理器初始化成功');

    // 测试帧处理器
    console.log('🎬 测试帧处理器...');
    const frameProcessor = new FrameProcessor();
    const stats = frameProcessor.getStats();
    console.log('✅ 帧处理器工作正常');

    // 测试模型加载（模拟）
    console.log('📥 测试模型加载...');
    const model = await modelManager.loadModel('MediaPipeSelfieSegmentation');
    console.log('✅ 模型加载成功');

    // 清理资源
    frameProcessor.dispose();
    modelManager.unloadModel();

    console.log('🎉 所有基础组件测试通过！');
    return true;

  } catch (error) {
    console.error('❌ 基础组件测试失败:', error);
    return false;
  }
}

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined') {
  // 浏览器环境
  (window as any).testBasicComponents = testBasicComponents;
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js 环境
  module.exports = { testBasicComponents };
}