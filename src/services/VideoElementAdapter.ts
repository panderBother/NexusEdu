/**
 * Video 元素适配器
 * 将原生 HTMLVideoElement 包装成类似 xgplayer 的接口
 * 用于 NetworkMonitor 的事件监听
 */

/**
 * 简化的播放器接口（兼容 xgplayer 和原生 video）
 */
export interface PlayerLike {
  currentTime: number;
  buffered: TimeRanges;
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler?: (...args: any[]) => void): void;
}

/**
 * Video 元素适配器
 * 将 HTMLVideoElement 包装成 PlayerLike 接口
 */
export class VideoElementAdapter implements PlayerLike {
  private videoElement: HTMLVideoElement;
  private eventHandlers: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    this.setupNativeListeners();
  }

  get currentTime(): number {
    return this.videoElement.currentTime;
  }

  get buffered(): TimeRanges {
    return this.videoElement.buffered;
  }

  /**
   * 注册事件监听器
   */
  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, handler?: (...args: any[]) => void): void {
    if (!handler) {
      // 移除所有该事件的监听器
      this.eventHandlers.delete(event);
    } else {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 设置原生事件监听器
   */
  private setupNativeListeners(): void {
    // 映射原生事件到我们的事件系统
    const eventMap: Record<string, string> = {
      'waiting': 'waiting',
      'playing': 'playing',
      'stalled': 'stalled',
      'error': 'error',
      'progress': 'progress',
      'timeupdate': 'timeupdate',
      'loadstart': 'loadstart',
      'loadedmetadata': 'loadedmetadata',
      'loadeddata': 'loadeddata',
      'canplay': 'canplay',
      'canplaythrough': 'canplaythrough',
      'play': 'play',
      'pause': 'pause',
      'ended': 'ended',
      'seeking': 'seeking',
      'seeked': 'seeked',
      'ratechange': 'ratechange',
      'volumechange': 'volumechange',
      'durationchange': 'durationchange',
      'suspend': 'suspend'
    };

    Object.entries(eventMap).forEach(([nativeEvent, customEvent]) => {
      this.videoElement.addEventListener(nativeEvent, (e) => {
        this.emit(customEvent, e);
      });
    });
  }

  /**
   * 销毁适配器
   */
  destroy(): void {
    this.eventHandlers.clear();
  }
}
