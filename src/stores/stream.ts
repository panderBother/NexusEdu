/**
 * 流播放状态管理 Store
 */

import { defineStore } from 'pinia';
import type { StreamProtocol, NetworkQuality, NetworkMetrics } from '@/types/adaptive-stream';

export const useStreamStore = defineStore('stream', {
  state: () => ({
    // 播放器状态
    protocol: 'flv' as StreamProtocol,
    playerStatus: 'idle' as 'idle' | 'loading' | 'playing' | 'paused' | 'error',

    // 网络状态
    networkQuality: 'fair' as NetworkQuality,
    networkMetrics: null as NetworkMetrics | null,

    // 控制状态
    isAutoSwitch: true,
    isManualMode: false,

    // 配置
    config: {
      srsHost: 'http://101.35.16.42:1985',
      app: 'live',
      streamId: 'stream1'
    },

    // 错误信息
    error: null as Error | null
  }),

  getters: {
    /**
     * 是否正在播放
     */
    isPlaying: (state) => state.playerStatus === 'playing',

    /**
     * 是否有错误
     */
    hasError: (state) => state.error !== null,

    /**
     * 协议显示名称
     */
    protocolDisplayName: (state) => {
      const names: Record<StreamProtocol, string> = {
        webrtc: 'WebRTC (低延迟)',
        flv: 'FLV (中延迟)',
        hls: 'HLS (高延迟)'
      };
      return names[state.protocol];
    },

    /**
     * 网络质量显示名称
     */
    networkQualityDisplayName: (state) => {
      const names: Record<NetworkQuality, string> = {
        good: '优秀',
        fair: '良好',
        poor: '较差'
      };
      return names[state.networkQuality];
    },

    /**
     * 网络质量颜色
     */
    networkQualityColor: (state) => {
      const colors: Record<NetworkQuality, string> = {
        good: '#52c41a',
        fair: '#faad14',
        poor: '#f5222d'
      };
      return colors[state.networkQuality];
    }
  },

  actions: {
    /**
     * 更新协议
     */
    updateProtocol(protocol: StreamProtocol) {
      this.protocol = protocol;
    },

    /**
     * 更新播放器状态
     */
    updatePlayerStatus(status: 'idle' | 'loading' | 'playing' | 'paused' | 'error') {
      this.playerStatus = status;
    },

    /**
     * 更新网络质量
     */
    updateNetworkQuality(quality: NetworkQuality) {
      this.networkQuality = quality;
    },

    /**
     * 更新网络指标
     */
    updateNetworkMetrics(metrics: NetworkMetrics) {
      this.networkMetrics = metrics;
    },

    /**
     * 设置手动模式
     */
    setManualMode(enabled: boolean) {
      this.isManualMode = enabled;
      this.isAutoSwitch = !enabled;
    },

    /**
     * 设置错误
     */
    setError(error: Error | null) {
      this.error = error;
      if (error) {
        this.playerStatus = 'error';
      }
    },

    /**
     * 清除错误
     */
    clearError() {
      this.error = null;
    },

    /**
     * 更新配置
     */
    updateConfig(config: Partial<typeof this.config>) {
      this.config = { ...this.config, ...config };
    }
  }
});
