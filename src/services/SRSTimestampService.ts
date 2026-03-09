/**
 * SRS 时间戳服务
 * 通过 SRS HTTP API 获取流的时间戳信息
 */

import type { StreamProtocol } from '@/types/adaptive-stream';

/**
 * 协议延迟配置（毫秒）
 */
const PROTOCOL_LATENCY: Record<StreamProtocol, number> = {
  webrtc: 500,
  flv: 2500,
  hls: 15000
};

/**
 * SRS 流信息
 */
interface SRSStreamInfo {
  id: string;
  name: string;
  vhost: string;
  app: string;
  live_ms: number;  // 流存活时长（毫秒）⭐ 关键字段
  clients: number;
  frames: number;
  send_bytes: number;
  recv_bytes: number;
  kbps: {
    recv_30s: number;
    send_30s: number;
  };
  publish: {
    active: boolean;
    cid: string;
  };
}

/**
 * SRS API 响应
 */
interface SRSApiResponse {
  code: number;
  server: string;
  streams?: SRSStreamInfo[];
}

/**
 * SRS 时间戳服务
 */
export class SRSTimestampService {
  private srsHost: string;
  private srsApiPort: number = 1985;
  private streamStartTime: number = 0;
  private serverTimeOffset: number = 0;
  private updateTimer: number | null = null;

  constructor(srsHost: string, apiPort: number = 1985) {
    this.srsHost = srsHost;
    this.srsApiPort = apiPort;
  }

  /**
   * 初始化：同步服务器时间 + 获取流开始时间
   */
  async initialize(app: string, streamId: string): Promise<boolean> {
    try {
      // 1. 同步服务器时间（可选）
      await this.syncServerTime();

      // 2. 获取流信息
      const streamInfo = await this.getStreamInfo(app, streamId);

      if (!streamInfo) {
        console.warn('[SRS时间戳] 流不存在或未推流');
        return false;
      }

      // 3. 计算流开始时间
      const now = this.getServerTime();
      const liveMs = streamInfo.live_ms;
      this.streamStartTime = now - liveMs;

      console.log(`[SRS时间戳] 初始化成功`);
      console.log(`[SRS时间戳] 流开始时间: ${new Date(this.streamStartTime).toISOString()}`);
      console.log(`[SRS时间戳] 流存活时长: ${liveMs}ms (${(liveMs / 1000).toFixed(1)}s)`);

      return true;
    } catch (error) {
      console.error('[SRS时间戳] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 同步服务器时间
   */
  private async syncServerTime(): Promise<void> {
    const clientTime1 = Date.now();

    try {
      // 使用 SRS versions API 测试连通性和 RTT
      const response = await fetch(
        `http://${this.srsHost}:${this.srsApiPort}/api/v1/versions`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const clientTime2 = Date.now();
      const rtt = clientTime2 - clientTime1;

      // 简化处理：假设客户端与服务器时间一致
      // 实际应用中，可以在服务器响应中加入时间戳进行精确同步
      this.serverTimeOffset = 0;

      console.log(`[SRS时间戳] 服务器连通性测试成功，RTT: ${rtt}ms`);
    } catch (error) {
      console.warn('[SRS时间戳] 服务器时间同步失败:', error);
      this.serverTimeOffset = 0;
    }
  }

  /**
   * 获取流信息
   */
  async getStreamInfo(app: string, streamId: string): Promise<SRSStreamInfo | null> {
    try {
      const response = await fetch(
        `http://${this.srsHost}:${this.srsApiPort}/api/v1/streams/`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: SRSApiResponse = await response.json();

      if (data.code !== 0) {
        throw new Error(`SRS API error: code ${data.code}`);
      }

      // 查找匹配的流
      const stream = data.streams?.find(
        (s) => s.app === app && s.name === streamId
      );

      if (!stream) {
        console.warn(`[SRS时间戳] 未找到流: ${app}/${streamId}`);
        return null;
      }

      return stream;
    } catch (error) {
      console.error('[SRS时间戳] 获取流信息失败:', error);
      return null;
    }
  }

  /**
   * 获取服务器时间
   */
  getServerTime(): number {
    return Date.now() + this.serverTimeOffset;
  }

  /**
   * 获取流开始时间
   */
  getStreamStartTime(): number {
    return this.streamStartTime;
  }

  /**
   * 获取流的服务器时间戳（考虑协议延迟）
   * @param protocol 协议类型
   * @returns 当前播放的服务器时间戳（毫秒）
   */
  getStreamServerTimestamp(protocol: StreamProtocol): number {
    const serverTime = this.getServerTime();
    const latency = PROTOCOL_LATENCY[protocol];

    // 当前服务器时间 - 协议延迟 = 当前播放的服务器时间戳
    return serverTime - latency;
  }

  /**
   * 将 currentTime 转换为服务器时间戳
   * @param currentTime 播放器的 currentTime（秒）
   * @returns 服务器时间戳（毫秒）
   */
  currentTimeToServerTimestamp(currentTime: number): number {
    if (this.streamStartTime === 0) {
      console.warn('[SRS时间戳] 流开始时间未初始化');
      return 0;
    }
    return this.streamStartTime + currentTime * 1000;
  }

  /**
   * 将服务器时间戳转换为 currentTime
   * @param serverTimestamp 服务器时间戳（毫秒）
   * @returns 播放器的 currentTime（秒）
   */
  serverTimestampToCurrentTime(serverTimestamp: number): number {
    if (this.streamStartTime === 0) {
      console.warn('[SRS时间戳] 流开始时间未初始化');
      return 0;
    }
    return (serverTimestamp - this.streamStartTime) / 1000;
  }

  /**
   * 计算协议切换时的目标 currentTime
   * @param fromProtocol 源协议
   * @param toProtocol 目标协议
   * @param currentTime 当前 currentTime（秒）
   * @returns 目标 currentTime（秒）
   */
  calculateTargetCurrentTime(
    fromProtocol: StreamProtocol,
    toProtocol: StreamProtocol,
    currentTime: number
  ): number {
    // 1. 获取当前服务器时间戳
    const serverTimestamp = this.currentTimeToServerTimestamp(currentTime);

    // 2. 计算协议延迟差
    const fromLatency = PROTOCOL_LATENCY[fromProtocol];
    const toLatency = PROTOCOL_LATENCY[toProtocol];
    const latencyDiff = toLatency - fromLatency;

    // 3. 调整服务器时间戳
    const targetServerTimestamp = serverTimestamp + latencyDiff;

    // 4. 转换为 currentTime
    const targetCurrentTime = this.serverTimestampToCurrentTime(targetServerTimestamp);

    console.log(`[SRS时间戳] 协议切换计算:`);
    console.log(`  源协议: ${fromProtocol}, 目标协议: ${toProtocol}`);
    console.log(`  当前 currentTime: ${currentTime.toFixed(2)}s`);
    console.log(`  当前服务器时间戳: ${new Date(serverTimestamp).toISOString()}`);
    console.log(`  延迟差: ${latencyDiff}ms`);
    console.log(`  目标服务器时间戳: ${new Date(targetServerTimestamp).toISOString()}`);
    console.log(`  目标 currentTime: ${targetCurrentTime.toFixed(2)}s`);

    return targetCurrentTime;
  }

  /**
   * 启动定期更新（防止时间漂移）
   * @param app 应用名
   * @param streamId 流ID
   * @param interval 更新间隔（毫秒），默认 30 秒
   */
  startPeriodicUpdate(app: string, streamId: string, interval: number = 30000): void {
    // 清除旧的定时器
    this.stopPeriodicUpdate();

    this.updateTimer = window.setInterval(async () => {
      const streamInfo = await this.getStreamInfo(app, streamId);

      if (streamInfo) {
        // 更新流开始时间（防止时间漂移）
        const now = this.getServerTime();
        const liveMs = streamInfo.live_ms;
        const newStreamStartTime = now - liveMs;

        // 检测时间漂移
        const drift = Math.abs(newStreamStartTime - this.streamStartTime);
        if (drift > 1000) {
          console.warn(`[SRS时间戳] 检测到时间漂移: ${drift}ms，进行校准`);
          this.streamStartTime = newStreamStartTime;
        }
      } else {
        console.warn('[SRS时间戳] 定期更新失败：流不存在');
      }
    }, interval);

    console.log(`[SRS时间戳] 启动定期更新，间隔: ${interval}ms`);
  }

  /**
   * 停止定期更新
   */
  stopPeriodicUpdate(): void {
    if (this.updateTimer !== null) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      console.log('[SRS时间戳] 停止定期更新');
    }
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(protocol: StreamProtocol, currentTime: number): any {
    const serverTimestamp = this.currentTimeToServerTimestamp(currentTime);
    const streamServerTimestamp = this.getStreamServerTimestamp(protocol);

    return {
      protocol,
      currentTime: `${currentTime.toFixed(2)}s`,
      streamStartTime: new Date(this.streamStartTime).toISOString(),
      serverTimestamp: new Date(serverTimestamp).toISOString(),
      streamServerTimestamp: new Date(streamServerTimestamp).toISOString(),
      protocolLatency: `${PROTOCOL_LATENCY[protocol]}ms`,
      actualLatency: `${this.getServerTime() - streamServerTimestamp}ms`,
      serverTimeOffset: `${this.serverTimeOffset}ms`
    };
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopPeriodicUpdate();
  }
}
