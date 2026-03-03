/**
 * 协议切换决策器
 * 根据网络质量决定协议切换策略
 */

import type {
  NetworkQuality,
  StreamProtocol,
  ProtocolSwitcherConfig,
  EventHandler
} from '@/types/adaptive-stream';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ProtocolSwitcherConfig = {
  stabilityRequirement: 3,
  minSwitchInterval: 10000,
  autoSwitch: true
};

/**
 * 协议优先级映射
 */
const PROTOCOL_PRIORITY_MAP: Record<NetworkQuality, StreamProtocol> = {
  good: 'webrtc' as StreamProtocol,
  fair: 'flv' as StreamProtocol,
  poor: 'hls' as StreamProtocol
};

/**
 * 协议切换器
 */
export class ProtocolSwitcher {
  private config: ProtocolSwitcherConfig;
  private currentProtocol: StreamProtocol = 'flv' as StreamProtocol;
  private qualityHistory: NetworkQuality[] = [];
  private lastSwitchTime: number = 0;
  private isManualMode: boolean = false;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();

  constructor(config?: Partial<ProtocolSwitcherConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 设置网络质量
   */
  setNetworkQuality(quality: NetworkQuality): void {
    // 手动模式下不处理网络质量变化
    if (this.isManualMode || !this.config.autoSwitch) {
      return;
    }

    // 添加到历史队列
    this.qualityHistory.push(quality);
    
    // 保持队列长度为稳定性要求的数量
    if (this.qualityHistory.length > this.config.stabilityRequirement) {
      this.qualityHistory.shift();
    }

    // 检查是否满足切换条件
    this.checkAndSwitch();
  }

  /**
   * 获取当前协议
   */
  getCurrentProtocol(): StreamProtocol {
    return this.currentProtocol;
  }

  /**
   * 手动设置协议
   */
  setManualProtocol(protocol: StreamProtocol): void {
    this.isManualMode = true;
    this.config.autoSwitch = false;
    
    // 手动切换不受频率限制
    if (protocol !== this.currentProtocol) {
      this.currentProtocol = protocol;
      this.lastSwitchTime = Date.now();
      this.emit('switch-required', protocol);
    }
  }

  /**
   * 启用自动切换
   */
  enableAutoSwitch(): void {
    this.isManualMode = false;
    this.config.autoSwitch = true;
    
    // 清空历史队列，重新开始监测
    this.qualityHistory = [];
  }

  /**
   * 禁用自动切换
   */
  disableAutoSwitch(): void {
    this.config.autoSwitch = false;
  }

  /**
   * 检查是否启用自动切换
   */
  isAutoSwitchEnabled(): boolean {
    return this.config.autoSwitch && !this.isManualMode;
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
   * 检查并执行切换
   */
  private checkAndSwitch(): void {
    // 检查历史队列是否满足稳定性要求
    if (this.qualityHistory.length < this.config.stabilityRequirement) {
      return;
    }

    // 检查所有质量是否一致
    const firstQuality = this.qualityHistory[0];
    const isStable = this.qualityHistory.every(q => q === firstQuality);
    
    if (!isStable) {
      return;
    }

    // 根据质量确定目标协议
    const targetProtocol = PROTOCOL_PRIORITY_MAP[firstQuality];
    
    // 如果已经是目标协议，不需要切换
    if (targetProtocol === this.currentProtocol) {
      return;
    }

    // 检查切换间隔
    const now = Date.now();
    const timeSinceLastSwitch = now - this.lastSwitchTime;
    
    if (timeSinceLastSwitch < this.config.minSwitchInterval) {
      return;
    }

    // 执行切换
    this.currentProtocol = targetProtocol;
    this.lastSwitchTime = now;
    this.qualityHistory = []; // 清空历史队列
    
    this.emit('switch-required', targetProtocol);
  }
}
