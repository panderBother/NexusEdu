/**
 * 多协议自适应拉流系统 - 核心类型定义
 */

// ==================== 枚举类型 ====================

/**
 * 网络质量等级
 */
export enum NetworkQuality {
  Good = 'good',
  Fair = 'fair',
  Poor = 'poor'
}

/**
 * 流媒体协议类型
 */
export enum StreamProtocol {
  WebRTC = 'webrtc',
  FLV = 'flv',
  HLS = 'hls'
}

// ==================== 网络监测相关 ====================

/**
 * 网络指标
 */
export interface NetworkMetrics {
  rtt: number;           // 往返时延（ms）
  packetLoss: number;    // 丢包率（0-1）
  bandwidth: number;     // 带宽（Mbps）
  timestamp: number;     // 采样时间戳
}

/**
 * 网络监测器配置
 */
export interface NetworkMonitorConfig {
  sampleInterval: number;        // 采样间隔（ms），默认 2000
  rttThresholds: {
    good: number;                // Good 阈值，默认 100ms
    poor: number;                // Poor 阈值，默认 300ms
  };
  packetLossThresholds: {
    good: number;                // Good 阈值，默认 0.01
    poor: number;                // Poor 阈值，默认 0.05
  };
  bandwidthThresholds: {
    good: number;                // Good 阈值，默认 2Mbps
    poor: number;                // Poor 阈值，默认 1Mbps
  };
}

// ==================== 协议切换相关 ====================

/**
 * 协议切换器配置
 */
export interface ProtocolSwitcherConfig {
  stabilityRequirement: number;  // 稳定性要求（连续采样次数），默认 3
  minSwitchInterval: number;     // 最小切换间隔（ms），默认 10000
  autoSwitch: boolean;           // 是否启用自动切换，默认 true
}

// ==================== 播放器相关 ====================

/**
 * 播放器配置
 */
export interface PlayerConfig {
  streamUrls: {
    webrtc: string;
    flv: string;
    hls: string;
  };
  videoElement: HTMLVideoElement;
  srsHost: string;
  app: string;
  streamId: string;
}

/**
 * 播放器状态
 */
export interface PlayerState {
  protocol: StreamProtocol;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  error?: Error;
}

// ==================== 主控制器相关 ====================

/**
 * 自适应流播放器配置
 */
export interface AdaptiveStreamPlayerConfig {
  videoElement: HTMLVideoElement;
  srsHost: string;
  app: string;
  streamId: string;
  networkMonitor?: Partial<NetworkMonitorConfig>;
  protocolSwitcher?: Partial<ProtocolSwitcherConfig>;
}

/**
 * 流 URL 配置
 */
export interface StreamUrlConfig {
  srsHost: string;
  app: string;
  streamId: string;
}

// ==================== 事件类型 ====================

/**
 * 错误事件
 */
export interface ErrorEvent {
  type: 'network' | 'player' | 'config' | 'resource';
  severity: 'warning' | 'error' | 'fatal';
  message: string;
  error: Error;
  context: {
    protocol?: StreamProtocol;
    networkQuality?: NetworkQuality;
    timestamp: number;
  };
}

/**
 * 事件处理器类型
 */
export type EventHandler<T = any> = (data: T) => void;
