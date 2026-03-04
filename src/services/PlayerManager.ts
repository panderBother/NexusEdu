/**
 * 播放器管理器
 * 管理播放器实例的创建、切换和销毁
 */

import type {
  PlayerConfig,
  PlayerState,
  StreamProtocol,
  EventHandler
} from '@/types/adaptive-stream';
import { BasePlayer } from './players/BasePlayer';
import { WebRTCPlayer } from './players/WebRTCPlayer';
import { FLVPlayer } from './players/FLVPlayer';
import { HLSPlayer } from './players/HLSPlayer';
import { TimestampSynchronizer, SyncStrategy } from './TimestampSynchronizer';

/**
 * 播放器管理器
 */
export class PlayerManager {
  private config: PlayerConfig;
  private currentPlayer: BasePlayer | null = null;
  private currentProtocol: StreamProtocol | null = null;
  private state: PlayerState = {
    protocol: 'flv' as StreamProtocol,
    status: 'idle'
  };
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private timestampSync: TimestampSynchronizer;

  constructor(config: PlayerConfig) {
    this.config = config;
    this.timestampSync = new TimestampSynchronizer();
  }

  /**
   * 切换协议
   */
  async switchProtocol(targetProtocol: StreamProtocol): Promise<boolean> {
    // 如果已经是目标协议，直接返回
    if (this.currentProtocol === targetProtocol && this.currentPlayer) {
      return true;
    }

    // 记录当前播放时间（如果支持）
    let currentTime = 0;
    const oldProtocol = this.currentProtocol;
    try {
      if (this.currentPlayer) {
        currentTime = this.currentPlayer.getCurrentTime();
      }
    } catch (error) {
      // 忽略错误
    }

    // 更新状态
    this.updateState({
      protocol: targetProtocol,
      status: 'loading'
    });

    // ========== 升级场景：延迟切换策略 ==========
    if (oldProtocol) {
      const timeDiff = this.timestampSync.calculateTimeDiff(oldProtocol, targetProtocol);
      
      if (timeDiff < -1000) { // 目标协议超前超过 1 秒（升级场景）
        console.log(`[播放器管理器] 检测到升级场景，时间差 ${timeDiff}ms`);
        console.log(`[播放器管理器] 采用延迟切换策略：先预加载新协议，旧协议继续播放`);
        
        // 1. 创建并预加载新播放器（但不显示）
        const newPlayer = this.createPlayer(targetProtocol);
        await newPlayer.initialize();
        await newPlayer.load();
        
        // 2. 旧播放器继续播放，等待追赶时间差
        const waitTime = Math.min(Math.abs(timeDiff), 3000); // 最多等 3 秒
        console.log(`[播放器管理器] 旧协议继续播放 ${waitTime}ms，追赶时间差`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // 3. 切换到新播放器
        console.log(`[播放器管理器] 延迟切换完成，切换到新协议`);
        
        // 销毁旧播放器
        this.destroyCurrentPlayer();
        
        // 更新引用
        this.currentPlayer = newPlayer;
        this.currentProtocol = targetProtocol;
        
        // 开始播放
        await newPlayer.play();
        
        // 更新状态
        this.updateState({
          protocol: targetProtocol,
          status: 'playing'
        });
        
        // 计算剩余时间差
        const remainingGap = Math.abs(timeDiff) - waitTime;
        
        // 触发同步事件
        this.emit('timestamp-sync', {
          success: true,
          strategy: 'wait_catch_up',
          timeDiff,
          action: 'wait',
          message: `延迟切换 ${waitTime}ms，剩余时间差 ${remainingGap}ms`
        });
        
        // 触发切换完成事件
        this.emit('switch-complete', targetProtocol);
        
        return true;
      }
    }

    // ========== 降级场景或时间差小：正常切换 ==========
    const newPlayer = this.createPlayer(targetProtocol);

    try {
      // 初始化新播放器
      await newPlayer.initialize();
      await newPlayer.load();

      // 等待新播放器稳定播放
      await this.waitForStablePlayback(newPlayer, 1000);

      // 时间戳同步（降级场景：快进跳过重复内容）
      if (oldProtocol && currentTime > 0) {
        console.log(`[播放器管理器] 开始时间同步: ${oldProtocol} → ${targetProtocol}`);
        
        // 获取推荐策略
        const recommendedStrategy = TimestampSynchronizer.getRecommendedStrategy(oldProtocol, targetProtocol);
        this.timestampSync.updateConfig({ strategy: recommendedStrategy });

        // 执行同步
        const syncResult = await this.timestampSync.synchronize(
          oldProtocol,
          targetProtocol,
          currentTime,
          this.config.videoElement
        );

        console.log(`[播放器管理器] 时间同步结果:`, syncResult);

        // 触发同步事件
        this.emit('timestamp-sync', syncResult);
      }

      // 销毁旧播放器
      this.destroyCurrentPlayer();

      // 更新当前播放器引用
      this.currentPlayer = newPlayer;
      this.currentProtocol = targetProtocol;

      // 更新状态
      this.updateState({
        protocol: targetProtocol,
        status: 'playing'
      });

      // 触发切换完成事件
      this.emit('switch-complete', targetProtocol);

      return true;
    } catch (error) {
      // 切换失败，销毁新播放器，保持旧播放器
      try {
        newPlayer.destroy();
      } catch (e) {
        // 忽略销毁错误
      }

      // 更新状态
      this.updateState({
        protocol: this.currentProtocol || targetProtocol,
        status: 'error',
        error: error as Error
      });

      // 触发切换失败事件
      this.emit('switch-failed', error);

      throw error;
    }
  }

  /**
   * 开始播放
   */
  async play(): Promise<void> {
    if (!this.currentPlayer) {
      throw new Error('No active player');
    }

    await this.currentPlayer.play();
    this.updateState({
      protocol: this.currentProtocol!,
      status: 'playing'
    });
  }

  /**
   * 暂停播放
   */
  pause(): void {
    if (!this.currentPlayer) {
      return;
    }

    this.currentPlayer.pause();
    this.updateState({
      protocol: this.currentProtocol!,
      status: 'paused'
    });
  }

  /**
   * 停止播放
   */
  stop(): void {
    this.destroyCurrentPlayer();
    this.updateState({
      protocol: this.currentProtocol || ('flv' as StreamProtocol),
      status: 'idle'
    });
  }

  /**
   * 获取状态
   */
  getState(): PlayerState {
    return { ...this.state };
  }

  /**
   * 获取当前协议
   */
  getCurrentProtocol(): StreamProtocol | null {
    return this.currentProtocol;
  }

  /**
   * 获取当前播放器实例
   */
  getCurrentPlayer(): BasePlayer | null {
    return this.currentPlayer;
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
   * 销毁管理器
   */
  destroy(): void {
    this.destroyCurrentPlayer();
    this.eventHandlers.clear();
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
   * 更新状态
   */
  private updateState(newState: Partial<PlayerState>): void {
    this.state = { ...this.state, ...newState };
    this.emit('state-change', this.state);
  }

  /**
   * 创建播放器实例
   */
  private createPlayer(protocol: StreamProtocol): BasePlayer {
    switch (protocol) {
      case 'webrtc':
        return new WebRTCPlayer(this.config);
      case 'flv':
        return new FLVPlayer(this.config);
      case 'hls':
        return new HLSPlayer(this.config);
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }

  /**
   * 销毁当前播放器
   */
  private destroyCurrentPlayer(): void {
    if (this.currentPlayer) {
      try {
        this.currentPlayer.destroy();
      } catch (error) {
        console.error('Error destroying player:', error);
      }
      this.currentPlayer = null;
    }
  }

  /**
   * 等待播放器稳定播放
   */
  private async waitForStablePlayback(player: BasePlayer, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(); // 超时也认为成功
      }, timeout);

      // 尝试播放
      player.play()
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
