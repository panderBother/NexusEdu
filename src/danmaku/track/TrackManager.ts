/**
 * 轨道管理器
 * 负责虚拟轨道的分配、碰撞检测和释放
 */

import type { Track, DanmakuItem } from "../types";
import { DanmakuType, TrackType } from "../types";

/**
 * 轨道管理器接口
 */
export interface ITrackManager {
  initialize(canvasHeight: number, trackHeight: number, trackGap: number): void;
  allocateTrack(danmaku: DanmakuItem): Track | null;
  releaseTrack(trackId: number): void;
  checkCollision(track: Track, danmaku: DanmakuItem): boolean;
  getAvailableTrackCount(): number;
}

/**
 * 轨道管理器实现
 */
export class TrackManager implements ITrackManager {
  private scrollTracks: Track[] = [];
  private topTracks: Track[] = [];
  private bottomTracks: Track[] = [];

  private canvasHeight: number = 0;
  private trackHeight: number = 0;
  private trackGap: number = 0;
  private canvasWidth: number = 0;

  /**
   * 初始化轨道
   * 根据屏幕高度和弹幕大小划分虚拟轨道
   */
  initialize(
    canvasHeight: number,
    trackHeight: number,
    trackGap: number,
    canvasWidth: number = 1920,
  ): void {
    this.canvasHeight = canvasHeight;
    this.trackHeight = trackHeight;
    this.trackGap = trackGap;
    this.canvasWidth = canvasWidth;

    // 计算轨道数量
    const trackCount = Math.floor(canvasHeight / (trackHeight + trackGap));

    // 为滚动弹幕分配 70% 的轨道
    const scrollTrackCount = Math.floor(trackCount * 0.7);
    // 为顶部和底部弹幕各分配 15% 的轨道
    const topTrackCount = Math.floor(trackCount * 0.15);
    const bottomTrackCount = Math.floor(trackCount * 0.15);

    // 初始化滚动轨道
    this.scrollTracks = [];
    for (let i = 0; i < scrollTrackCount; i++) {
      this.scrollTracks.push({
        id: i,
        y: i * (trackHeight + trackGap),
        type: TrackType.SCROLL,
        occupied: false,
        lastDanmaku: null,
        lastDanmakuEndTime: 0,
      });
    }

    // 初始化顶部轨道
    this.topTracks = [];
    for (let i = 0; i < topTrackCount; i++) {
      this.topTracks.push({
        id: 1000 + i, // 使用不同的 ID 范围
        y: i * (trackHeight + trackGap),
        type: TrackType.TOP,
        occupied: false,
        lastDanmaku: null,
        lastDanmakuEndTime: 0,
      });
    }

    // 初始化底部轨道
    this.bottomTracks = [];
    const bottomStartY =
      canvasHeight - bottomTrackCount * (trackHeight + trackGap);
    for (let i = 0; i < bottomTrackCount; i++) {
      this.bottomTracks.push({
        id: 2000 + i, // 使用不同的 ID 范围
        y: bottomStartY + i * (trackHeight + trackGap),
        type: TrackType.BOTTOM,
        occupied: false,
        lastDanmaku: null,
        lastDanmakuEndTime: 0,
      });
    }
  }

  /**
   * 分配轨道
   * 为新弹幕分配一个可用轨道
   */
  allocateTrack(danmaku: DanmakuItem): Track | null {
    const tracks = this.getTracksForType(danmaku.type);
    const currentTime = Date.now();

    // 查找可用轨道
    for (const track of tracks) {
      // 检查轨道是否可用
      if (!track.occupied || currentTime > track.lastDanmakuEndTime) {
        // 检查碰撞
        if (!this.checkCollision(track, danmaku)) {
          // 分配轨道
          track.occupied = true;
          track.lastDanmaku = danmaku;

          // 计算弹幕结束时间
          const duration = this.calculateDuration(danmaku);
          track.lastDanmakuEndTime = currentTime + duration;

          return track;
        }
      }
    }

    // 没有可用轨道
    return null;
  }

  /**
   * 释放轨道
   */
  releaseTrack(trackId: number): void {
    const track = this.findTrackById(trackId);
    if (track) {
      track.occupied = false;
      track.lastDanmaku = null;
      track.lastDanmakuEndTime = 0;
    }
  }

  /**
   * 检查碰撞
   * 确保弹幕之间间距不小于 10 像素
   */
  checkCollision(track: Track, danmaku: DanmakuItem): boolean {
    if (!track.lastDanmaku) {
      return false;
    }

    const currentTime = Date.now();

    // 对于滚动弹幕，检查水平间距
    if (track.type === "scroll") {
      // 估算上一条弹幕的当前位置
      const lastDanmaku = track.lastDanmaku;
      const lastDuration = this.calculateDuration(lastDanmaku);
      const lastElapsed =
        currentTime - (track.lastDanmakuEndTime - lastDuration);
      const lastSpeed = this.canvasWidth / lastDuration;
      const lastX = this.canvasWidth - lastSpeed * lastElapsed;

      // 估算上一条弹幕的宽度（简化计算）
      const lastWidth = this.estimateTextWidth(
        lastDanmaku.text,
        lastDanmaku.size,
      );

      // 检查是否有足够的间距（至少 10 像素）
      const minGap = 10;
      if (lastX + lastWidth + minGap > this.canvasWidth) {
        return true; // 有碰撞
      }
    }

    // 对于顶部和底部弹幕，检查时间间隔
    if (track.type === "top" || track.type === "bottom") {
      const fixedDuration = 3000; // 固定显示 3 秒
      const elapsed = currentTime - (track.lastDanmakuEndTime - fixedDuration);

      // 如果上一条弹幕还在显示，则有碰撞
      if (elapsed < fixedDuration) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取可用轨道数量
   */
  getAvailableTrackCount(): number {
    const currentTime = Date.now();
    let count = 0;

    const allTracks = [
      ...this.scrollTracks,
      ...this.topTracks,
      ...this.bottomTracks,
    ];
    for (const track of allTracks) {
      if (!track.occupied || currentTime > track.lastDanmakuEndTime) {
        count++;
      }
    }

    return count;
  }

  /**
   * 根据弹幕类型获取对应的轨道池
   */
  private getTracksForType(type: DanmakuType): Track[] {
    switch (type) {
      case DanmakuType.TOP:
        return this.topTracks;
      case DanmakuType.BOTTOM:
        return this.bottomTracks;
      case DanmakuType.SCROLL:
      case DanmakuType.VIP:
      case DanmakuType.GIFT:
      default:
        return this.scrollTracks;
    }
  }

  /**
   * 根据 ID 查找轨道
   */
  private findTrackById(trackId: number): Track | null {
    const allTracks = [
      ...this.scrollTracks,
      ...this.topTracks,
      ...this.bottomTracks,
    ];
    return allTracks.find((t) => t.id === trackId) || null;
  }

  /**
   * 计算弹幕显示时长
   */
  private calculateDuration(danmaku: DanmakuItem): number {
    if (danmaku.speed) {
      return danmaku.speed;
    }

    // 默认速度：6 秒穿越屏幕
    if (
      danmaku.type === DanmakuType.TOP ||
      danmaku.type === DanmakuType.BOTTOM
    ) {
      return 3000; // 固定显示 3 秒
    }

    return 6000; // 滚动弹幕默认 6 秒
  }

  /**
   * 估算文本宽度
   */
  private estimateTextWidth(text: string, size: number): number {
    // 简化计算：每个字符约占字体大小的 0.6 倍宽度
    return text.length * size * 0.6;
  }

  /**
   * 获取轨道总数（用于调试）
   */
  getTrackCount(): number {
    return (
      this.scrollTracks.length +
      this.topTracks.length +
      this.bottomTracks.length
    );
  }

  /**
   * 获取滚动轨道数量（用于调试）
   */
  getScrollTrackCount(): number {
    return this.scrollTracks.length;
  }

  /**
   * 获取顶部轨道数量（用于调试）
   */
  getTopTrackCount(): number {
    return this.topTracks.length;
  }

  /**
   * 获取底部轨道数量（用于调试）
   */
  getBottomTrackCount(): number {
    return this.bottomTracks.length;
  }
}
