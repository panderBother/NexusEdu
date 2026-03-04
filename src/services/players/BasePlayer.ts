/**
 * 播放器抽象基类
 * 定义所有播放器的通用接口
 */

import type { PlayerConfig } from '@/types/adaptive-stream';
import type Player from 'xgplayer';

/**
 * 播放器抽象基类
 */
export abstract class BasePlayer {
  protected config: PlayerConfig;
  protected videoElement: HTMLVideoElement;
  protected xgPlayer: Player | null = null;

  constructor(config: PlayerConfig) {
    this.config = config;
    this.videoElement = config.videoElement;
  }

  /**
   * 初始化播放器
   */
  abstract initialize(): Promise<void>;

  /**
   * 加载流
   */
  abstract load(): Promise<void>;

  /**
   * 开始播放
   */
  abstract play(): Promise<void>;

  /**
   * 暂停播放
   */
  abstract pause(): void;

  /**
   * 销毁播放器
   */
  abstract destroy(): void;

  /**
   * 获取当前播放时间
   */
  getCurrentTime(): number {
    return this.videoElement.currentTime;
  }

  /**
   * 跳转到指定时间
   */
  seek(time: number): void {
    this.videoElement.currentTime = time;
  }

  /**
   * 获取 xgplayer 实例（如果使用）
   */
  getXgPlayer(): Player | null {
    return this.xgPlayer;
  }

  /**
   * 获取 video 元素（用于直接监听事件）
   */
  getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }
}
