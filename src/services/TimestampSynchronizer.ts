/**
 * 时间戳同步器
 * 解决不同协议间的延迟差异问题
 */

import type { StreamProtocol } from '@/types/adaptive-stream';

/**
 * 协议延迟配置（毫秒）
 */
const PROTOCOL_LATENCY: Record<StreamProtocol, number> = {
  webrtc: 500,    // WebRTC 延迟约 500ms
  flv: 2500,      // FLV 延迟约 2.5s
  hls: 15000      // HLS 延迟约 15s
};

/**
 * 时间戳同步策略
 */
export enum SyncStrategy {
  /**
   * 快进策略：跳过中间内容，直接到最新位置
   * 适用场景：升级协议（低延迟 → 高延迟）
   * 优点：无重复播放
   * 缺点：会跳过部分内容
   */
  SKIP_FORWARD = 'skip_forward',

  /**
   * 等待策略：等待新协议追上旧协议的时间点
   * 适用场景：降级协议（高延迟 → 低延迟）
   * 优点：不跳过内容
   * 缺点：会有短暂等待
   */
  WAIT_CATCH_UP = 'wait_catch_up',

  /**
   * 平滑过渡策略：使用倍速播放追赶
   * 适用场景：任何切换
   * 优点：体验最好
   * 缺点：实现复杂
   */
  SMOOTH_TRANSITION = 'smooth_transition',

  /**
   * 无同步策略：直接切换，不做时间对齐
   * 适用场景：对时间精度要求不高的场景
   * 优点：实现简单
   * 缺点：会有重复或跳跃
   */
  NO_SYNC = 'no_sync'
}

/**
 * 同步配置
 */
export interface SyncConfig {
  strategy: SyncStrategy;
  maxWaitTime?: number;      // 最大等待时间（ms），默认 3000
  speedUpRate?: number;       // 倍速播放速率，默认 1.5
  toleranceTime?: number;     // 容忍的时间差（ms），默认 200
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  strategy: SyncStrategy;
  timeDiff: number;           // 时间差（ms）
  action: 'skip' | 'wait' | 'speedup' | 'none';
  message: string;
}

/**
 * 时间戳同步器
 */
export class TimestampSynchronizer {
  private config: Required<SyncConfig>;

  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      strategy: config?.strategy || SyncStrategy.SMOOTH_TRANSITION,
      maxWaitTime: config?.maxWaitTime || 3000,
      speedUpRate: config?.speedUpRate || 1.5,
      toleranceTime: config?.toleranceTime || 200
    };
  }

  /**
   * 计算协议间的时间差
   * @param fromProtocol 源协议
   * @param toProtocol 目标协议
   * @returns 时间差（ms），正数表示目标协议落后，负数表示目标协议超前
   */
  calculateTimeDiff(fromProtocol: StreamProtocol, toProtocol: StreamProtocol): number {
    const fromLatency = PROTOCOL_LATENCY[fromProtocol];
    const toLatency = PROTOCOL_LATENCY[toProtocol];
    return toLatency - fromLatency;
  }

  /**
   * 同步时间戳
   * @param fromProtocol 源协议
   * @param toProtocol 目标协议
   * @param currentTime 当前播放时间（秒）
   * @param videoElement 视频元素
   * @returns 同步结果
   */
  async synchronize(
    fromProtocol: StreamProtocol,
    toProtocol: StreamProtocol,
    currentTime: number,
    videoElement: HTMLVideoElement
  ): Promise<SyncResult> {
    const timeDiff = this.calculateTimeDiff(fromProtocol, toProtocol);

    // 时间差在容忍范围内，不需要同步
    if (Math.abs(timeDiff) < this.config.toleranceTime) {
      return {
        success: true,
        strategy: this.config.strategy,
        timeDiff,
        action: 'none',
        message: `时间差 ${timeDiff}ms 在容忍范围内，无需同步`
      };
    }

    console.log(`[时间同步] ${fromProtocol} → ${toProtocol}, 时间差: ${timeDiff}ms`);

    switch (this.config.strategy) {
      case SyncStrategy.SKIP_FORWARD:
        return await this.skipForward(timeDiff, currentTime, videoElement);

      case SyncStrategy.WAIT_CATCH_UP:
        return await this.waitCatchUp(timeDiff, currentTime, videoElement);

      case SyncStrategy.SMOOTH_TRANSITION:
        return await this.smoothTransition(timeDiff, currentTime, videoElement);

      case SyncStrategy.NO_SYNC:
        return {
          success: true,
          strategy: SyncStrategy.NO_SYNC,
          timeDiff,
          action: 'none',
          message: '不进行时间同步'
        };

      default:
        return {
          success: false,
          strategy: this.config.strategy,
          timeDiff,
          action: 'none',
          message: '未知的同步策略'
        };
    }
  }

  /**
   * 快进策略：跳过中间内容
   */
  private async skipForward(
    timeDiff: number,
    currentTime: number,
    videoElement: HTMLVideoElement
  ): Promise<SyncResult> {
    if (timeDiff > 0) {
      // 目标协议落后，需要快进
      const targetTime = currentTime + timeDiff / 1000;

      try {
        // 等待视频可以 seek
        await this.waitForSeekable(videoElement, targetTime);

        videoElement.currentTime = targetTime;
        console.log(`[时间同步] 快进 ${timeDiff}ms 到 ${targetTime}s`);

        return {
          success: true,
          strategy: SyncStrategy.SKIP_FORWARD,
          timeDiff,
          action: 'skip',
          message: `快进 ${timeDiff}ms`
        };
      } catch (error) {
        console.warn('[时间同步] 快进失败:', error);
        return {
          success: false,
          strategy: SyncStrategy.SKIP_FORWARD,
          timeDiff,
          action: 'skip',
          message: `快进失败: ${(error as Error).message}`
        };
      }
    } else {
      // 目标协议超前，无需快进
      return {
        success: true,
        strategy: SyncStrategy.SKIP_FORWARD,
        timeDiff,
        action: 'none',
        message: '目标协议超前，无需快进'
      };
    }
  }

  /**
   * 等待策略：延迟切换，让旧协议追赶
   * 注意：这里"等待"的是旧协议播放，而不是等待新协议
   */
  private async waitCatchUp(
    timeDiff: number,
    currentTime: number,
    videoElement: HTMLVideoElement
  ): Promise<SyncResult> {
    if (timeDiff < 0) {
      // 目标协议超前（升级场景：慢→快）
      // 策略：延迟切换，让旧协议继续播放一段时间
      const waitTime = Math.min(Math.abs(timeDiff), this.config.maxWaitTime);

      console.log(`[时间同步] 延迟切换 ${waitTime}ms，让旧协议追赶时间差`);
      console.log(`[时间同步] 注意：这段时间旧协议继续播放，新协议预加载但不显示`);

      // 这个等待应该在切换前执行，让旧播放器继续播放
      // 实际的等待逻辑应该在 PlayerManager 中实现
      await new Promise(resolve => setTimeout(resolve, waitTime));

      const remainingGap = Math.abs(timeDiff) - waitTime;

      return {
        success: true,
        strategy: SyncStrategy.WAIT_CATCH_UP,
        timeDiff,
        action: 'wait',
        message: `延迟切换 ${waitTime}ms，剩余时间差 ${remainingGap}ms`
      };
    } else {
      // 目标协议落后，无需等待
      return {
        success: true,
        strategy: SyncStrategy.WAIT_CATCH_UP,
        timeDiff,
        action: 'none',
        message: '目标协议落后，无需等待'
      };
    }
  }

  /**
   * 平滑过渡策略：使用倍速播放追赶
   */
  private async smoothTransition(
    timeDiff: number,
    currentTime: number,
    videoElement: HTMLVideoElement
  ): Promise<SyncResult> {
    if (Math.abs(timeDiff) < this.config.toleranceTime) {
      return {
        success: true,
        strategy: SyncStrategy.SMOOTH_TRANSITION,
        timeDiff,
        action: 'none',
        message: '时间差较小，无需平滑过渡'
      };
    }

    try {
      const originalRate = videoElement.playbackRate;

      if (timeDiff > 0) {
        // 目标协议落后，加速播放追赶
        const speedUpDuration = timeDiff / (this.config.speedUpRate - 1);

        console.log(`[时间同步] 以 ${this.config.speedUpRate}x 速度播放 ${speedUpDuration}ms 追赶`);

        videoElement.playbackRate = this.config.speedUpRate;

        await new Promise(resolve => setTimeout(resolve, speedUpDuration));

        videoElement.playbackRate = originalRate;

        return {
          success: true,
          strategy: SyncStrategy.SMOOTH_TRANSITION,
          timeDiff,
          action: 'speedup',
          message: `倍速播放 ${speedUpDuration}ms 追赶`
        };
      } else {
        // 目标协议超前，减速播放等待
        const slowDownDuration = Math.abs(timeDiff) / (1 - 0.8);

        console.log(`[时间同步] 以 0.8x 速度播放 ${slowDownDuration}ms 等待`);

        videoElement.playbackRate = 0.8;

        await new Promise(resolve => setTimeout(resolve, Math.min(slowDownDuration, this.config.maxWaitTime)));

        videoElement.playbackRate = originalRate;

        return {
          success: true,
          strategy: SyncStrategy.SMOOTH_TRANSITION,
          timeDiff,
          action: 'speedup',
          message: `减速播放 ${slowDownDuration}ms 等待`
        };
      }
    } catch (error) {
      console.warn('[时间同步] 平滑过渡失败:', error);
      return {
        success: false,
        strategy: SyncStrategy.SMOOTH_TRANSITION,
        timeDiff,
        action: 'speedup',
        message: `平滑过渡失败: ${(error as Error).message}`
      };
    }
  }

  /**
   * 等待视频可以 seek 到指定位置
   */
  private async waitForSeekable(videoElement: HTMLVideoElement, targetTime: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('等待 seekable 超时'));
      }, 5000);

      const checkSeekable = () => {
        const seekable = videoElement.seekable;
        if (seekable.length > 0) {
          const start = seekable.start(0);
          const end = seekable.end(seekable.length - 1);

          if (targetTime >= start && targetTime <= end) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkSeekable, 100);
          }
        } else {
          setTimeout(checkSeekable, 100);
        }
      };

      checkSeekable();
    });
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取推荐策略
   * @param fromProtocol 源协议
   * @param toProtocol 目标协议
   * @returns 推荐的同步策略
   */
  static getRecommendedStrategy(fromProtocol: StreamProtocol, toProtocol: StreamProtocol): SyncStrategy {
    const fromLatency = PROTOCOL_LATENCY[fromProtocol];
    const toLatency = PROTOCOL_LATENCY[toProtocol];

    if (toLatency > fromLatency) {
      // 降级（快 → 慢）：会有重复，建议快进跳过
      return SyncStrategy.SKIP_FORWARD;
    } else if (toLatency < fromLatency) {
      // 升级（慢 → 快）：会有跳跃，建议平滑过渡
      return SyncStrategy.SMOOTH_TRANSITION;
    } else {
      // 相同延迟，无需同步
      return SyncStrategy.NO_SYNC;
    }
  }
}
