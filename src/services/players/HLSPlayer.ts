/**
 * HLS 播放器
 * 使用 HLS 协议播放流媒体
 */

import { BasePlayer } from './BasePlayer';
import Hls from 'hls.js';
import type { PlayerConfig } from '@/types/adaptive-stream';

/**
 * HLS 播放器
 */
export class HLSPlayer extends BasePlayer {
  private hls: Hls | null = null;
  private useNativeHLS: boolean = false;

  constructor(config: PlayerConfig) {
    super(config);
  }

  /**
   * 初始化播放器
   */
  async initialize(): Promise<void> {
    if (Hls.isSupported()) {
      this.hls = new Hls({
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60
      });
      this.useNativeHLS = false;
    } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 原生支持 HLS
      this.useNativeHLS = true;
    } else {
      throw new Error('HLS is not supported');
    }
  }

  /**
   * 加载流
   */
  async load(): Promise<void> {
    if (this.hls) {
      // 使用 hls.js
      return new Promise((resolve, reject) => {
        this.hls!.loadSource(this.config.streamUrls.hls);
        this.hls!.attachMedia(this.videoElement);

        const onManifestParsed = () => {
          cleanup();
          resolve();
        };

        const onError = (event: string, data: any) => {
          if (data.fatal) {
            cleanup();
            reject(new Error(data.details || 'HLS load failed'));
          }
        };

        const cleanup = () => {
          this.hls!.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
          this.hls!.off(Hls.Events.ERROR, onError);
        };

        this.hls!.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
        this.hls!.on(Hls.Events.ERROR, onError);
      });
    } else if (this.useNativeHLS) {
      // 使用原生 HLS 支持
      return new Promise((resolve, reject) => {
        this.videoElement.src = this.config.streamUrls.hls;

        const onLoadedMetadata = () => {
          cleanup();
          resolve();
        };

        const onError = () => {
          cleanup();
          reject(new Error('HLS load failed'));
        };

        const cleanup = () => {
          this.videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          this.videoElement.removeEventListener('error', onError);
        };

        this.videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
        this.videoElement.addEventListener('error', onError);
      });
    } else {
      throw new Error('HLS is not supported');
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
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    this.videoElement.src = '';
  }
}
