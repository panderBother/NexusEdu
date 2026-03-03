/**
 * 网络监测模块
 * 负责实时监测网络状态，计算网络质量等级
 */

import type {
  NetworkMetrics,
  NetworkQuality,
  NetworkMonitorConfig,
  EventHandler
} from '@/types/adaptive-stream';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: NetworkMonitorConfig = {
  sampleInterval: 2000,
  rttThresholds: {
    good: 100,
    poor: 300
  },
  packetLossThresholds: {
    good: 0.01,
    poor: 0.05
  },
  bandwidthThresholds: {
    good: 2,
    poor: 1
  }
};

/**
 * 网络监测器
 */
export class NetworkMonitor {
  private config: NetworkMonitorConfig;
  private currentMetrics: NetworkMetrics | null = null;
  private currentQuality: NetworkQuality = 'fair' as NetworkQuality;
  private timerId: number | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();

  constructor(config?: Partial<NetworkMonitorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 启动网络监测
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isPaused = false;
    this.scheduleNextSample();
  }

  /**
   * 停止网络监测
   */
  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * 暂停网络监测（降低采样频率）
   */
  pause(): void {
    this.isPaused = true;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.isRunning) {
      this.scheduleNextSample();
    }
  }

  /**
   * 恢复网络监测（恢复正常采样频率）
   */
  resume(): void {
    this.isPaused = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.isRunning) {
      this.scheduleNextSample();
    }
  }

  /**
   * 获取当前网络指标
   */
  getCurrentMetrics(): NetworkMetrics {
    return this.currentMetrics || {
      rtt: 150,
      packetLoss: 0.02,
      bandwidth: 1.5,
      timestamp: Date.now()
    };
  }

  /**
   * 获取当前网络质量
   */
  getCurrentQuality(): NetworkQuality {
    return this.currentQuality;
  }

  /**
   * 注册事件监听器
   */
  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 调度下一次采样
   */
  private scheduleNextSample(): void {
    if (!this.isRunning) return;

    const interval = this.isPaused ? 10000 : this.config.sampleInterval;
    this.timerId = window.setTimeout(() => {
      this.collectAndAnalyze();
      this.scheduleNextSample();
    }, interval);
  }

  /**
   * 采集并分析网络指标
   */
  private async collectAndAnalyze(): Promise<void> {
    try {
      const metrics = await this.collectMetrics();
      this.currentMetrics = metrics;
      
      const quality = this.calculateQuality(metrics);
      
      // 触发指标更新事件
      this.emit('metrics-update', metrics);
      
      // 如果质量发生变化，触发质量变化事件
      if (quality !== this.currentQuality) {
        this.currentQuality = quality;
        this.emit('quality-change', quality);
      }
    } catch (error) {
      console.error('Failed to collect network metrics:', error);
      // 使用默认质量值
      if (this.currentQuality !== 'fair') {
        this.currentQuality = 'fair' as NetworkQuality;
        this.emit('quality-change', this.currentQuality);
      }
    }
  }

  /**
   * 采集网络指标
   */
  private async collectMetrics(): Promise<NetworkMetrics> {
    const rtt = await this.estimateRTT();
    const bandwidth = await this.estimateBandwidth();
    const packetLoss = await this.estimatePacketLoss();

    return {
      rtt,
      packetLoss,
      bandwidth,
      timestamp: Date.now()
    };
  }

  /**
   * 估算 RTT（往返时延）
   */
  private async estimateRTT(): Promise<number> {
    try {
      // 尝试使用 Performance API
      const entries = performance.getEntriesByType('resource');
      if (entries.length > 0) {
        const recent = entries.slice(-5);
        const avgDuration = recent.reduce((sum, e: any) => sum + e.duration, 0) / recent.length;
        return Math.max(10, Math.min(1000, avgDuration));
      }

      // 降级方案：使用 Image 加载测试
      const start = performance.now();
      await new Promise((resolve, reject) => {
        const img = new Image();
        const timeout = setTimeout(() => {
          img.src = '';
          reject(new Error('RTT test timeout'));
        }, 3000);
        
        img.onload = img.onerror = () => {
          clearTimeout(timeout);
          resolve(null);
        };
        
        // 使用一个小图片测试（添加时间戳避免缓存）
        img.src = `${this.config.rttThresholds.good > 0 ? 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' : ''}?t=${Date.now()}`;
      });
      
      const rtt = performance.now() - start;
      return Math.max(10, Math.min(1000, rtt));
    } catch (error) {
      // 返回默认值
      return 150;
    }
  }

  /**
   * 估算带宽
   */
  private async estimateBandwidth(): Promise<number> {
    try {
      // 尝试使用 Navigator.connection API
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection && connection.downlink) {
        return connection.downlink;
      }

      // 降级方案：返回默认值
      return 1.5;
    } catch (error) {
      return 1.5;
    }
  }

  /**
   * 估算丢包率
   */
  private async estimatePacketLoss(): Promise<number> {
    try {
      // 在实际应用中，可以通过 WebRTC getStats 获取真实丢包率
      // 这里返回一个估算值
      return 0.02;
    } catch (error) {
      return 0.02;
    }
  }

  /**
   * 计算网络质量等级
   */
  private calculateQuality(metrics: NetworkMetrics): NetworkQuality {
    const { rtt, packetLoss, bandwidth } = metrics;
    const { rttThresholds, packetLossThresholds, bandwidthThresholds } = this.config;

    // 任一指标达到 Poor 阈值，判定为 Poor
    if (
      rtt > rttThresholds.poor ||
      packetLoss > packetLossThresholds.poor ||
      bandwidth < bandwidthThresholds.poor
    ) {
      return 'poor' as NetworkQuality;
    }

    // 所有指标达到 Good 阈值，判定为 Good
    if (
      rtt < rttThresholds.good &&
      packetLoss < packetLossThresholds.good &&
      bandwidth > bandwidthThresholds.good
    ) {
      return 'good' as NetworkQuality;
    }

    // 其他情况判定为 Fair
    return 'fair' as NetworkQuality;
  }
}
