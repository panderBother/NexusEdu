# AI人体分割遮罩系统

## 概述

AI人体分割遮罩系统是Fly Barrage弹幕库的高级功能，使用TensorFlow.js和MediaPipe技术实现实时人体分割，自动生成智能遮罩，防止弹幕遮挡视频中的人物。

## 核心特性

### 🤖 智能人体识别
- 使用MediaPipe SelfieSegmentation模型进行实时人体分割
- 支持多人检测和处理
- 自动置信度过滤，确保识别准确性

### ⚡ 高性能处理
- GPU加速支持（WebGL后端）
- 自动回退到CPU处理
- 智能帧率控制，目标30+ FPS
- 内存使用优化和垃圾回收

### 🎯 精确遮罩生成
- 多种遮罩类型支持（边界框、像素级、ImageData）
- 遮罩合并和平滑过渡
- 与手动遮罩无缝集成

### 🔧 灵活配置
- 可调节的置信度阈值
- 自定义处理参数
- 性能监控和自适应优化

## 快速开始

### 基础用法

```typescript
import BarrageRenderer from 'fly-barrage';

const renderer = new BarrageRenderer({
  container: 'barrage-container',
  video: videoElement,
  enableAIMask: true,
  aiMaskOptions: {
    segmentation: {
      confidenceThreshold: 0.7,
      maxDetections: 3
    },
    targetFPS: 30,
    autoStart: false
  }
});

// 启动AI遮罩系统
await renderer.enableAIMaskSystem();
```

### 高级配置

```typescript
const renderer = new BarrageRenderer({
  container: 'barrage-container',
  video: videoElement,
  enableAIMask: true,
  aiMaskOptions: {
    segmentation: {
      confidenceThreshold: 0.8,
      maxDetections: 5,
      enableKeypoints: false,
      modelPrecision: 'float32'
    },
    integration: {
      updateInterval: 33,
      enableSmoothing: true,
      smoothingDuration: 200,
      cacheSize: 10,
      enableOptimization: true
    },
    targetFPS: 30,
    autoStart: true
  }
});
```

## API 参考

### AIMaskSystemOptions

```typescript
interface AIMaskSystemOptions {
  // AI分割配置
  segmentation?: {
    confidenceThreshold: number;    // 置信度阈值 (0-1)
    maxDetections: number;          // 最大检测人数
    enableKeypoints: boolean;       // 是否启用关键点检测
    modelPrecision: 'float32' | 'float16'; // 模型精度
  };
  
  // 弹幕集成配置
  integration?: {
    updateInterval: number;         // 更新间隔 (ms)
    enableSmoothing: boolean;       // 启用平滑过渡
    smoothingDuration: number;      // 平滑时长 (ms)
    cacheSize: number;             // 缓存大小
    enableOptimization: boolean;    // 启用优化
  };
  
  // 其他配置
  autoStart?: boolean;            // 自动启动
  videoElement?: HTMLVideoElement; // 视频元素
  targetFPS?: number;             // 目标帧率
}
```

### 主要方法

#### enableAIMaskSystem()
启用AI遮罩系统
```typescript
const success = await renderer.enableAIMaskSystem();
```

#### disableAIMaskSystem()
禁用AI遮罩系统
```typescript
await renderer.disableAIMaskSystem();
```

#### getAIMaskSystemStatus()
获取系统状态
```typescript
const status = renderer.getAIMaskSystemStatus();
console.log('AI系统状态:', status);
```

#### updateAIMaskConfig()
更新配置
```typescript
renderer.updateAIMaskConfig({
  segmentation: {
    confidenceThreshold: 0.8
  },
  targetFPS: 25
});
```

## 系统架构

### 核心组件

1. **FrameProcessor** - 视频帧处理器
   - 实时捕获视频帧
   - 处理不同分辨率和宽高比
   - 错误处理和自适应功能

2. **ModelManager** - 模型管理器
   - TensorFlow.js模型加载和缓存
   - GPU/CPU自适应处理
   - 内存优化

3. **AISegmentationSystem** - AI分割系统
   - 人体分割处理核心
   - 置信度过滤
   - 性能保护机制

4. **MaskGenerator** - 遮罩生成器
   - 分割结果转换为遮罩数据
   - 多种遮罩类型支持
   - 遮罩合并算法

5. **BarrageIntegration** - 弹幕系统集成
   - 与现有弹幕系统无缝集成
   - 遮罩平滑过渡
   - 性能优化

### 处理流程

```
视频帧 → 帧处理器 → AI分割系统 → 遮罩生成器 → 弹幕集成 → 渲染
   ↓         ↓          ↓           ↓          ↓        ↓
 捕获帧   → 预处理   → 人体检测   → 生成遮罩  → 应用遮罩 → 显示
```

## 性能优化

### GPU加速
系统自动检测WebGL支持并启用GPU加速：
```typescript
// 自动检测和配置
const modelManager = new ModelManager();
await modelManager.loadModel('MediaPipeSelfieSegmentation');
```

### 内存管理
- 自动垃圾回收
- 遮罩数据缓存
- 模型内存优化

### 帧率控制
```typescript
// 设置目标帧率
renderer.updateAIMaskConfig({
  targetFPS: 30
});
```

## 兼容性

### 浏览器支持
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

### 硬件要求
- **推荐**: 支持WebGL的GPU
- **最低**: 现代CPU（自动回退）
- **内存**: 建议4GB+

## 故障排除

### 常见问题

1. **模型加载失败**
   ```typescript
   // 检查网络连接和CORS设置
   console.log('模型加载状态:', renderer.getAIMaskSystemStatus());
   ```

2. **性能问题**
   ```typescript
   // 降低帧率或置信度阈值
   renderer.updateAIMaskConfig({
     targetFPS: 15,
     segmentation: { confidenceThreshold: 0.6 }
   });
   ```

3. **内存泄漏**
   ```typescript
   // 确保正确清理资源
   renderer.destroy();
   ```

### 调试模式
```typescript
const renderer = new BarrageRenderer({
  // ...其他配置
  devConfig: {
    isRenderFPS: true,
    isLogKeyData: true
  }
});
```

## 示例

完整的使用示例请参考：
- [AI遮罩演示页面](../../examples/ai-mask-demo.html)
- [集成测试](./integration-test.ts)

## 开发状态

当前状态：**已完成核心功能**

已完成：
- ✅ 项目结构和类型定义
- ✅ 帧处理器实现
- ✅ 模型管理器实现
- ✅ AI分割系统实现
- ✅ 遮罩生成器实现
- ✅ 弹幕系统集成
- ✅ 主要API集成

待完善：
- 🔄 性能监控器
- 🔄 错误处理系统
- 🔄 配置持久化
- 🔄 完整测试覆盖

## 依赖项

- `@tensorflow/tfjs`: TensorFlow.js 核心库
- `@tensorflow/tfjs-backend-webgl`: WebGL 后端支持
- `@tensorflow-models/body-segmentation`: 人体分割模型

## 许可证

MIT License - 详见 [LICENSE](../../LICENSE) 文件