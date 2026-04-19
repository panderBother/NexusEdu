/**
 * AI 人体分割系统的配置管理
 */

import type { AISegmentationConfig, SegmentationModelType } from './types';

// 默认配置
export const DEFAULT_AI_SEGMENTATION_CONFIG: AISegmentationConfig = {
  model: {
    type: 'MediaPipeSelfieSegmentation' as SegmentationModelType,
    precision: 'float32',
    backend: 'auto'
  },
  
  processing: {
    targetFPS: 30,
    maxLatency: 50, // ms
    confidenceThreshold: 0.7,
    enableBatching: false,
    batchSize: 1
  },
  
  mask: {
    padding: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
      adaptive: true
    },
    smoothing: true,
    optimization: 'balanced'
  },
  
  performance: {
    enableMonitoring: true,
    autoOptimization: true,
    fallbackThreshold: 0.8, // CPU 使用率阈值
    memoryLimit: 200 * 1024 * 1024 // 200MB
  },
  
  debug: {
    enableLogging: false,
    showVisualization: false,
    saveDebugFrames: false
  }
};

// 性能预设配置
export const PERFORMANCE_PRESETS = {
  // 低端设备配置
  LOW_END: {
    model: {
      type: 'MediaPipeSelfieSegmentation' as SegmentationModelType,
      precision: 'float16',
      backend: 'cpu'
    },
    processing: {
      targetFPS: 15,
      maxLatency: 100,
      confidenceThreshold: 0.6,
      enableBatching: false,
      batchSize: 1
    },
    mask: {
      optimization: 'speed'
    }
  },
  
  // 中端设备配置
  MEDIUM: {
    model: {
      type: 'MediaPipeSelfieSegmentation' as SegmentationModelType,
      precision: 'float32',
      backend: 'auto'
    },
    processing: {
      targetFPS: 24,
      maxLatency: 66,
      confidenceThreshold: 0.7,
      enableBatching: false,
      batchSize: 1
    },
    mask: {
      optimization: 'balanced'
    }
  },
  
  // 高端设备配置
  HIGH_END: {
    model: {
      type: 'MediaPipeSelfieSegmentation' as SegmentationModelType,
      precision: 'float32',
      backend: 'webgl'
    },
    processing: {
      targetFPS: 30,
      maxLatency: 33,
      confidenceThreshold: 0.8,
      enableBatching: true,
      batchSize: 2
    },
    mask: {
      optimization: 'quality'
    }
  }
};

/**
 * 配置管理器
 */
export class ConfigManager {
  private config: AISegmentationConfig;
  private readonly STORAGE_KEY = 'ai-segmentation-config';

  constructor(initialConfig?: Partial<AISegmentationConfig>) {
    this.config = this.mergeConfig(DEFAULT_AI_SEGMENTATION_CONFIG, initialConfig);
    this.loadFromStorage();
  }

  /**
   * 获取当前配置
   */
  getConfig(): AISegmentationConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<AISegmentationConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.saveToStorage();
  }

  /**
   * 应用性能预设
   */
  applyPreset(preset: keyof typeof PERFORMANCE_PRESETS): void {
    const presetConfig = PERFORMANCE_PRESETS[preset];
    this.updateConfig(presetConfig);
  }

  /**
   * 根据设备能力自动选择配置
   */
  autoConfigureForDevice(deviceCapabilities: {
    hasWebGL: boolean;
    availableMemory: number;
    cpuCores: number;
  }): void {
    let preset: keyof typeof PERFORMANCE_PRESETS;

    if (!deviceCapabilities.hasWebGL || deviceCapabilities.availableMemory < 100 * 1024 * 1024) {
      preset = 'LOW_END';
    } else if (deviceCapabilities.cpuCores >= 4 && deviceCapabilities.availableMemory >= 200 * 1024 * 1024) {
      preset = 'HIGH_END';
    } else {
      preset = 'MEDIUM';
    }

    this.applyPreset(preset);
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.config = { ...DEFAULT_AI_SEGMENTATION_CONFIG };
    this.saveToStorage();
  }

  /**
   * 从本地存储加载配置
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const storedConfig = JSON.parse(stored);
        this.config = this.mergeConfig(this.config, storedConfig);
      }
    } catch (error) {
      console.warn('Failed to load AI segmentation config from storage:', error);
    }
  }

  /**
   * 保存配置到本地存储
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save AI segmentation config to storage:', error);
    }
  }

  /**
   * 深度合并配置对象
   */
  private mergeConfig(base: AISegmentationConfig, updates?: Partial<AISegmentationConfig>): AISegmentationConfig {
    if (!updates) return base;

    const result = { ...base };

    for (const key in updates) {
      const updateValue = updates[key as keyof AISegmentationConfig];
      if (updateValue !== undefined) {
        if (typeof updateValue === 'object' && updateValue !== null && !Array.isArray(updateValue)) {
          result[key as keyof AISegmentationConfig] = {
            ...result[key as keyof AISegmentationConfig],
            ...updateValue
          } as any;
        } else {
          result[key as keyof AISegmentationConfig] = updateValue as any;
        }
      }
    }

    return result;
  }
}