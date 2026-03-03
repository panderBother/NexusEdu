/**
 * WebRTC 播放器
 * 使用 WebRTC 协议播放流媒体
 */

import { BasePlayer } from './BasePlayer';
import { WebRTCService } from '@/services/WebRTCService';
import type { PlayerConfig } from '@/types/adaptive-stream';

/**
 * WebRTC 播放器
 */
export class WebRTCPlayer extends BasePlayer {
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
      throw new Error('WebRTC service not initialized');
    }

    console.log('开始加载 WebRTC 流...');
    const stream = await this.webrtcService.playFromSRS(
      this.config.app,
      this.config.streamId
    );

    if (!stream) {
      throw new Error('Failed to load WebRTC stream');
    }

    console.log('WebRTC 流加载成功，轨道数量:', stream.getTracks().length);
    console.log('轨道详情:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));

    this.videoElement.srcObject = stream;
    console.log('已设置 video.srcObject');
  }

  /**
   * 开始播放
   */
  async play(): Promise<void> {
    // 等待视频元素准备好
    if (this.videoElement.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video element not ready timeout'));
        }, 5000);

        const onCanPlay = () => {
          clearTimeout(timeout);
          this.videoElement.removeEventListener('canplay', onCanPlay);
          this.videoElement.removeEventListener('error', onError);
          resolve();
        };

        const onError = (e: Event) => {
          clearTimeout(timeout);
          this.videoElement.removeEventListener('canplay', onCanPlay);
          this.videoElement.removeEventListener('error', onError);
          reject(new Error('Video element error'));
        };

        this.videoElement.addEventListener('canplay', onCanPlay);
        this.videoElement.addEventListener('error', onError);
      });
    }

    try {
      await this.videoElement.play();
      console.log('WebRTC 播放成功');
    } catch (error) {
      console.error('WebRTC play failed:', error);
      throw error;
    }
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
      this.webrtcService.stop();
      this.webrtcService = null;
    }
    this.videoElement.srcObject = null;
  }
}
