/**
 * 网络监测模块
 * 负责实时监测网络状态，计算网络质量等级
 * 增强版：整合 xgplayer 事件监听
 */

import type {
  NetworkMetrics,
  NetworkQuality,
  NetworkMonitorConfig,
  EventHandler
} from '@/types/adaptive-stream';
import type { PlayerLike } from './VideoElementAdapter';

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
 * 播放器统计数据
 */
interface PlayerStats {
  stallCount: number;           // 卡顿次数
  totalStallTime: number;       // 总卡顿时长
  errorCount: number;           // 错误次数
  lastStallTime: number;        // 上次卡顿时间
  bufferHealthHistory: number[]; // 缓冲区健康度历史
  playbackFrozenCount: number;  // 播放冻结次数
}

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
  
  // xgplayer 集成
  private player: PlayerLike | null = null;
  private stats: PlayerStats = {
    stallCount: 0,
    totalStallTime: 0,
    errorCount: 0,
    lastStallTime: 0,
    bufferHealthHistory: [],
    playbackFrozenCount: 0,
  };

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
    this.unbindPlayer();
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

  // ==================== xgplayer 集成方法 ====================

  /**
   * 绑定播放器实例
   */
  bindPlayer(player: PlayerLike): void {
    this.player = player;
    this.setupPlayerListeners();
  }

  /**
   * 解绑播放器
   */
  unbindPlayer(): void {
    if (this.player) {
      // 移除所有监听器
      this.player.off('waiting');
      this.player.off('playing');
      this.player.off('stalled');
      this.player.off('error');
      this.player.off('progress');
      this.player.off('timeupdate');
      this.player = null;
    }
  }

  /**
   * 设置播放器事件监听
   */
  private setupPlayerListeners(): void {
    if (!this.player) return;

    // 1. 卡顿监听
    this.player.on('waiting', () => {
      this.stats.lastStallTime = Date.now();
      this.stats.stallCount++;

      console.log(`[网络监控] 播放卡顿 (第 ${this.stats.stallCount} 次)`);

      // 频繁卡顿判定
      if (this.stats.stallCount >= 3) {
        this.emit('frequent-stall', {
          count: this.stats.stallCount,
          suggestion: 'downgrade'
        });
      }
    });

    // 2. 恢复播放监听
    this.player.on('playing', () => {
      if (this.stats.lastStallTime > 0) {
        const stallDuration = Date.now() - this.stats.lastStallTime;
        this.stats.totalStallTime += stallDuration;

        console.log(`[网络监控] 卡顿恢复，持续 ${stallDuration}ms`);

        // 严重卡顿判定（单次超过 3 秒）
        if (stallDuration > 3000) {
          this.emit('severe-stall', {
            duration: stallDuration,
            suggestion: 'emergency-downgrade'
          });
        }

        this.stats.lastStallTime = 0;
      }
    });

    // 3. 网络停滞监听
    this.player.on('stalled', () => {
      console.log('[网络监控] 网络停滞');
      this.emit('network-stalled', {
        suggestion: 'switch-to-stable-protocol'
      });
    });

    // 4. 错误监听
    this.player.on('error', (err: any) => {
      this.stats.errorCount++;
      console.error(`[网络监控] 播放错误 (第 ${this.stats.errorCount} 次):`, err);

      this.emit('playback-error', {
        error: err,
        count: this.stats.errorCount,
        suggestion: 'switch-protocol'
      });
    });

    // 5. 缓冲区监控
    this.player.on('progress', () => {
      const bufferHealth = this.getBufferHealth();

      if (bufferHealth !== null) {
        // 记录历史（保留最近 10 个）
        this.stats.bufferHealthHistory.push(bufferHealth);
        if (this.stats.bufferHealthHistory.length > 10) {
          this.stats.bufferHealthHistory.shift();
        }

        // 计算平均缓冲健康度
        const avgBufferHealth = this.stats.bufferHealthHistory.reduce((a, b) => a + b, 0)
          / this.stats.bufferHealthHistory.length;

        console.log(`[网络监控] 缓冲健康度: ${bufferHealth.toFixed(2)}s (平均: ${avgBufferHealth.toFixed(2)}s)`);

        // 缓冲区告警
        if (bufferHealth < 1) {
          this.emit('buffer-critical', {
            health: bufferHealth,
            average: avgBufferHealth,
            suggestion: 'emergency-downgrade'
          });
        } else if (bufferHealth < 3) {
          this.emit('buffer-low', {
            health: bufferHealth,
            average: avgBufferHealth,
            suggestion: 'consider-downgrade'
          });
        } else if (bufferHealth > 10 && avgBufferHealth > 8) {
          this.emit('buffer-healthy', {
            health: bufferHealth,
            average: avgBufferHealth,
            suggestion: 'consider-upgrade'
          });
        }
      }
    });

    // 6. 播放冻结检测
    let lastTime = 0;
    let frozenCount = 0;

    this.player.on('timeupdate', () => {
      const currentTime = this.player!.currentTime;

      if (currentTime === lastTime) {
        frozenCount++;

        if (frozenCount > 10) {
          this.stats.playbackFrozenCount++;
          console.log(`[网络监控] 播放冻结 (第 ${this.stats.playbackFrozenCount} 次)`);

          this.emit('playback-frozen', {
            count: this.stats.playbackFrozenCount,
            suggestion: 'downgrade'
          });

          frozenCount = 0;
        }
      } else {
        frozenCount = 0;
      }

      lastTime = currentTime;
    });
  }

  /**
   * 获取缓冲区健康度
   */
  private getBufferHealth(): number | null {
    if (!this.player) return null;

    const buffered = this.player.buffered;
    if (buffered.length === 0) return null;

    const bufferEnd = buffered.end(buffered.length - 1);
    const currentTime = this.player.currentTime;

    return bufferEnd - currentTime;
  }

  /**
   * 获取统计数据
   */
  getStats(): PlayerStats & { avgBufferHealth: number } {
    return {
      ...this.stats,
      avgBufferHealth: this.stats.bufferHealthHistory.length > 0
        ? this.stats.bufferHealthHistory.reduce((a, b) => a + b, 0) / this.stats.bufferHealthHistory.length
        : 0
    };
  }

  /**
   * 重置统计数据
   */
  resetStats(): void {
    this.stats = {
      stallCount: 0,
      totalStallTime: 0,
      errorCount: 0,
      lastStallTime: 0,
      bufferHealthHistory: [],
      playbackFrozenCount: 0,
    };
  }
}
