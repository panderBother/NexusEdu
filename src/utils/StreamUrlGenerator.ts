/**
 * 流 URL 生成工具
 * 根据配置生成不同协议的流媒体 URL
 */

import type { StreamUrlConfig, StreamProtocol } from '@/types/adaptive-stream';

/**
 * 流 URL 生成器
 */
export class StreamUrlGenerator {
  /**
   * 生成所有协议的流 URL
   */
  static generate(config: StreamUrlConfig): Record<StreamProtocol, string> {
    const { srsHost, app, streamId } = config;
    
    // 格式化 srsHost：移除协议前缀和端口
    const host = srsHost
      .replace(/^https?:\/\//, '')  // 移除 http:// 或 https://
      .replace(/:\d+$/, '');         // 移除端口号

    // SRS 默认端口配置
    // - 1985: HTTP API 端口
    // - 8080: HTTP-FLV 端口
    // - 8080: HLS 端口
    // - 1990: WebRTC 端口（但 WebRTC 使用域名不需要端口）
    
    return {
      webrtc: `webrtc://${host}/${encodeURIComponent(app)}/${encodeURIComponent(streamId)}`,
      flv: `http://${host}:8080/${encodeURIComponent(app)}/${encodeURIComponent(streamId)}.flv`,
      hls: `http://${host}:8080/${encodeURIComponent(app)}/${encodeURIComponent(streamId)}.m3u8`
    };
  }

  /**
   * 生成单个协议的流 URL
   */
  static generateSingle(config: StreamUrlConfig, protocol: StreamProtocol): string {
    const urls = this.generate(config);
    return urls[protocol];
  }
}
