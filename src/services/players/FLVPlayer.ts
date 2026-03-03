/**
 * FLV 播放器
 * 使用 FLV 协议播放流媒体
 */

import { BasePlayer } from './BasePlayer';
import { WebRTCService } from '@/services/WebRTCService';
import type { PlayerConfig } from '@/types/adaptive-stream';

/**
 * FLV 播放器
 */
export class FLVPlayer extends BasePlayer {
  private webrtcService: WebRTCService | null = null;

  constructor(config: PlayerConfig) {
    super(config);
  }

  /**
   * 初始化播放器
   */
  async initialize(): Promise<void> {
    this.webrtcService = new WebRTCService(this.config.srsHost);
  }

  /**
   * 加载流
   */
  async load(): Promise<void> {
    if (!this.webrtcService) {
      throw new Error('FLV service not initialized');
    }

    const success = await this.webrtcService.playFLVSRS(
      this.config.app,
      this.config.streamId,
      this.videoElement,
      this.config.streamUrls.flv
    );

    if (!success) {
      throw new Error('Failed to load FLV stream');
    }
  }

  /**
   * 开始播放
   */
  async play(): Promise<void> {
    await this.videoElement.play();
  }

  /**
   * 暂停播放
   */
  pause(): void {
    this.videoElement.pause();
  }

  /**
   * 销毁播放器
   */
  destroy(): void {
    if (this.webrtcService) {
      this.webrtcService.stopFlv();
      this.webrtcService = null;
    }
  }
}
