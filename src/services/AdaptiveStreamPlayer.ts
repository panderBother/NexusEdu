/**
 * 自适应流播放器主控制器
 * 协调网络监测、协议切换和播放器管理
 */

import type {
  AdaptiveStreamPlayerConfig,
  NetworkQuality,
  StreamProtocol,
  PlayerState,
  EventHandler
} from '@/types/adaptive-stream';
import { NetworkMonitor } from './NetworkMonitor';
import { ProtocolSwitcher } from './ProtocolSwitcher';
import { PlayerManager } from './PlayerManager';
import { StreamUrlGenerator } from '@/utils/StreamUrlGenerator';
import { ErrorRecoveryStrategy } from '@/utils/ErrorRecoveryStrategy';

/**
 * 自适应流播放器
 */
export class AdaptiveStreamPlayer {
  private networkMonitor: NetworkMonitor;
  private protocolSwitcher: ProtocolSwitcher;
  private playerManager: PlayerManager;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private config: AdaptiveStreamPlayerConfig;

  constructor(config: AdaptiveStreamPlayerConfig) {
    this.config = config;

    // 初始化网络监测器
    this.networkMonitor = new NetworkMonitor(config.networkMonitor);

    // 初始化协议切换器
    this.protocolSwitcher = new ProtocolSwitcher(config.protocolSwitcher);

    // 生成流 URL
    const streamUrls = StreamUrlGenerator.generate({
      srsHost: config.srsHost,
      app: config.app,
      streamId: config.streamId
    });

    // 初始化播放器管理器
    this.playerManager = new PlayerManager({
      streamUrls,
      videoElement: config.videoElement,
      srsHost: config.srsHost,
      app: config.app,
      streamId: config.streamId
    });

    // 连接各模块
    this.setupEventHandlers();
  }

  /**
   * 启动播放器
   */
  async start(): Promise<void> {
    // 启动网络监测
    this.networkMonitor.start();

    // 获取初始网络质量
    const initialQuality = this.networkMonitor.getCurrentQuality();
    this.protocolSwitcher.setNetworkQuality(initialQuality);

    // 根据初始质量选择协议并开始播放
    const initialProtocol = this.protocolSwitcher.getCurrentProtocol();
    
    try {
      await this.playerManager.switchProtocol(initialProtocol);
      await this.playerManager.play();
    } catch (error) {
      console.error('Failed to start player:', error);
      // 尝试降级到下一个协议
      await this.fallbackToNextProtocol(initialProtocol);
    }
  }

  /**
   * 停止播放器
   */
  stop(): void {
    this.networkMonitor.stop();
    this.playerManager.stop();
  }

  /**
   * 暂停播放
   */
  pause(): void {
    this.networkMonitor.pause();
    this.playerManager.pause();
  }

  /**
   * 恢复播放
   */
  resume(): void {
    this.networkMonitor.resume();
    this.playerManager.play().catch(error => {
      console.error('Failed to resume playback:', error);
    });
  }

  /**
   * 手动设置协议
   */
  setManualProtocol(protocol: StreamProtocol): void {
    this.protocolSwitcher.setManualProtocol(protocol);
  }

  /**
   * 启用自动切换
   */
  enableAutoSwitch(): void {
    this.protocolSwitcher.enableAutoSwitch();
  }

  /**
   * 获取当前状态
   */
  getState(): {
    protocol: StreamProtocol;
    networkQuality: NetworkQuality;
    isAutoSwitch: boolean;
    playerState: PlayerState;
  } {
    return {
      protocol: this.protocolSwitcher.getCurrentProtocol(),
      networkQuality: this.networkMonitor.getCurrentQuality(),
      isAutoSwitch: this.protocolSwitcher.isAutoSwitchEnabled(),
      playerState: this.playerManager.getState()
    };
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
   * 销毁播放器
   */
  destroy(): void {
    this.networkMonitor.stop();
    this.playerManager.destroy();
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
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 网络质量变化 -> 协议切换器
    this.networkMonitor.on('quality-change', (quality: NetworkQuality) => {
      this.protocolSwitcher.setNetworkQuality(quality);
      this.emit('network-quality-change', quality);
    });

    // 网络指标更新
    this.networkMonitor.on('metrics-update', (metrics) => {
      this.emit('metrics-update', metrics);
    });

    // 协议切换需求 -> 播放器管理器
    this.protocolSwitcher.on('switch-required', async (protocol: StreamProtocol) => {
      try {
        await this.playerManager.switchProtocol(protocol);
        this.emit('protocol-change', protocol);
      } catch (error) {
        console.error('Protocol switch failed:', error);
        this.emit('error', {
          type: ErrorRecoveryStrategy.getErrorType(error as Error),
          severity: ErrorRecoveryStrategy.getErrorSeverity(error as Error),
          message: (error as Error).message,
          error: error as Error,
          context: {
            protocol,
            networkQuality: this.networkMonitor.getCurrentQuality(),
            timestamp: Date.now()
          }
        });

        // 尝试降级到下一个协议
        await this.fallbackToNextProtocol(protocol);
      }
    });

    // 播放器状态变化
    this.playerManager.on('state-change', (state: PlayerState) => {
      this.emit('player-state-change', state);
    });

    // 播放器切换完成
    this.playerManager.on('switch-complete', (protocol: StreamProtocol) => {
      this.emit('switch-complete', protocol);
    });

    // 播放器切换失败
    this.playerManager.on('switch-failed', (error: Error) => {
      this.emit('switch-failed', error);
    });
  }

  /**
   * 降级到下一个协议
   */
  private async fallbackToNextProtocol(failedProtocol: StreamProtocol): Promise<void> {
    const nextProtocol = ErrorRecoveryStrategy.getNextProtocol(failedProtocol);
    
    if (nextProtocol) {
      try {
        await this.playerManager.switchProtocol(nextProtocol);
        this.emit('protocol-change', nextProtocol);
      } catch (error) {
        console.error('Fallback to next protocol failed:', error);
        // 继续尝试下一个协议
        await this.fallbackToNextProtocol(nextProtocol);
      }
    } else {
      // 所有协议都失败了
      console.error('All protocols failed');
      this.emit('error', {
        type: 'player',
        severity: 'fatal',
        message: 'All protocols failed',
        error: new Error('All protocols failed'),
        context: {
          protocol: failedProtocol,
          networkQuality: this.networkMonitor.getCurrentQuality(),
          timestamp: Date.now()
        }
      });
    }
  }
}
