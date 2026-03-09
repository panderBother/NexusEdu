# 直播流时间戳获取完整指南

## 问题背景

在直播场景下，`videoElement.currentTime` 并不是真实的直播时间戳，而是相对于流开始的播放时间。我们需要获取的是**服务器端的真实时间戳**，才能在协议切换时进行准确的时间同步。

## 核心概念

### 1. 三种时间概念

```
1. 服务器时间戳（Server Timestamp）
   - 流媒体服务器推送时的真实时间
   - 例如：2024-03-04 10:00:05.500
   - 这是我们需要的"真实时间"

2. 播放器相对时间（Player Time）
   - videoElement.currentTime
   - 相对于流开始的时间，从 0 开始
   - 例如：125.3 秒（表示播放了 125.3 秒）

3. 客户端本地时间（Client Time）
   - Date.now()
   - 客户端系统时间
   - 可能与服务器时间有偏差
```

### 2. 为什么需要服务器时间戳？

**场景：协议切换时的时间同步**

```
假设当前时间 10:00:05

WebRTC 播放器：
- videoElement.currentTime = 125.3s
- 实际播放的是服务器 10:00:05.0 的画面（延迟 500ms）

切换到 FLV：
- 如果只用 currentTime，FLV 会从 125.3s 开始播放
- 但 FLV 的 125.3s 对应的是服务器 10:00:02.5 的画面（延迟 2.5s）
- 结果：用户看到 2.5 秒前的画面，重复播放！

正确做法：
- 获取 WebRTC 当前播放的服务器时间戳：10:00:05.0
- 计算 FLV 需要跳转到的位置：10:00:05.0 + 2.5s = 10:00:07.5
- 让 FLV 快进到对应的 currentTime
```

## 获取方法

### 方法 1：从流媒体元数据获取（推荐）⭐

不同协议有不同的方式获取时间戳：

#### WebRTC - 通过 RTP 时间戳

```typescript
class WebRTCPlayer extends BasePlayer {
  private rtpTimestamp: number = 0;
  private wallClockTime: number = 0;
  
  async load(): Promise<void> {
    const stream = await this.webrtcService.playFromSRS(...);
    
    // 获取 RTCPeerConnection
    const pc = this.webrtcService.getPeerConnection();
    
    // 监听 RTP 统计信息
    setInterval(async () => {
      const stats = await pc.getStats();
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          // RTP 时间戳（90kHz 时钟）
          this.rtpTimestamp = report.timestamp;
          
          // 如果有 NTP 时间戳（部分实现支持）
          if (report.ntpTimestamp) {
            this.wallClockTime = report.ntpTimestamp;
          }
        }
      });
    }, 1000);
  }
  
  /**
   * 获取服务器时间戳（毫秒）
   */
  getServerTimestamp(): number {
    if (this.wallClockTime > 0) {
      // 使用 NTP 时间戳
      return this.wallClockTime;
    }
    
    // 降级方案：估算
    const now = Date.now();
    const latency = 500; // WebRTC 延迟约 500ms
    return now - latency;
  }
}
```

#### FLV - 通过 FLV Tag 时间戳

```typescript
import flvjs from 'flv.js';

class FLVPlayer extends BasePlayer {
  private flvPlayer: flvjs.Player | null = null;
  private lastTagTimestamp: number = 0;
  private streamStartTime: number = 0;
  
  async load(): Promise<void> {
    this.flvPlayer = flvjs.createPlayer({
      type: 'flv',
      url: this.config.streamUrls.flv,
      isLive: true
    });
    
    this.flvPlayer.attachMediaElement(this.videoElement);
    this.flvPlayer.load();
    
    // 监听 FLV 统计信息
    this.flvPlayer.on(flvjs.Events.STATISTICS_INFO, (info) => {
      // FLV Tag 时间戳（毫秒）
      this.lastTagTimestamp = info.currentSegmentIndex;
      
      // 记录流开始时间
      if (this.streamStartTime === 0) {
        this.streamStartTime = Date.now() - this.lastTagTimestamp;
      }
    });
  }
  
  /**
   * 获取服务器时间戳（毫秒）
   */
  getServerTimestamp(): number {
    // FLV Tag 时间戳 + 流开始时间
    return this.streamStartTime + this.lastTagTimestamp;
  }
  
  /**
   * 根据服务器时间戳跳转
   */
  seekToServerTimestamp(serverTimestamp: number): void {
    const targetTagTimestamp = serverTimestamp - this.streamStartTime;
    const targetCurrentTime = targetTagTimestamp / 1000;
    this.videoElement.currentTime = targetCurrentTime;
  }
}
```

#### HLS - 通过 Program Date Time（PDT）

```typescript
import Hls from 'hls.js';

class HLSPlayer extends BasePlayer {
  private hls: Hls | null = null;
  private programDateTime: number = 0;
  private fragmentStartTime: number = 0;
  
  async load(): Promise<void> {
    this.hls = new Hls();
    this.hls.loadSource(this.config.streamUrls.hls);
    this.hls.attachMedia(this.videoElement);
    
    // 监听 Fragment 加载
    this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
      const frag = data.frag;
      
      // 获取 EXT-X-PROGRAM-DATE-TIME（如果 m3u8 包含）
      if (frag.programDateTime) {
        this.programDateTime = frag.programDateTime;
        this.fragmentStartTime = frag.start;
      }
    });
  }
  
  /**
   * 获取服务器时间戳（毫秒）
   */
  getServerTimestamp(): number {
    if (this.programDateTime > 0) {
      // 使用 Program Date Time
      const elapsed = this.videoElement.currentTime - this.fragmentStartTime;
      return this.programDateTime + elapsed * 1000;
    }
    
    // 降级方案：估算
    const now = Date.now();
    const latency = 15000; // HLS 延迟约 15s
    return now - latency;
  }
  
  /**
   * 根据服务器时间戳跳转
   */
  seekToServerTimestamp(serverTimestamp: number): void {
    if (this.programDateTime > 0) {
      const offset = (serverTimestamp - this.programDateTime) / 1000;
      const targetTime = this.fragmentStartTime + offset;
      this.videoElement.currentTime = targetTime;
    }
  }
}
```

### 方法 2：客户端估算（降级方案）

如果无法从流中获取时间戳，可以通过客户端估算：

```typescript
class TimestampEstimator {
  private streamStartTime: number = 0;
  private protocolLatency: Record<StreamProtocol, number> = {
    webrtc: 500,
    flv: 2500,
    hls: 15000
  };
  
  /**
   * 记录流开始时间
   */
  markStreamStart(protocol: StreamProtocol): void {
    const now = Date.now();
    const latency = this.protocolLatency[protocol];
    this.streamStartTime = now - latency;
  }
  
  /**
   * 估算服务器时间戳
   */
  estimateServerTimestamp(
    protocol: StreamProtocol,
    currentTime: number
  ): number {
    // 服务器时间 = 流开始时间 + 播放时长
    return this.streamStartTime + currentTime * 1000;
  }
  
  /**
   * 计算目标协议的 currentTime
   */
  calculateTargetCurrentTime(
    fromProtocol: StreamProtocol,
    toProtocol: StreamProtocol,
    currentTime: number
  ): number {
    // 1. 获取当前服务器时间戳
    const serverTimestamp = this.estimateServerTimestamp(fromProtocol, currentTime);
    
    // 2. 计算目标协议的延迟差
    const fromLatency = this.protocolLatency[fromProtocol];
    const toLatency = this.protocolLatency[toProtocol];
    const latencyDiff = toLatency - fromLatency;
    
    // 3. 调整服务器时间戳
    const adjustedServerTimestamp = serverTimestamp + latencyDiff;
    
    // 4. 转换为 currentTime
    const targetCurrentTime = (adjustedServerTimestamp - this.streamStartTime) / 1000;
    
    return targetCurrentTime;
  }
}
```

### 方法 3：服务器 API 同步（最准确）⭐⭐⭐

通过服务器 API 获取当前直播的时间戳：

```typescript
class ServerTimeSyncService {
  private serverTimeOffset: number = 0; // 服务器与客户端的时间差
  
  /**
   * 同步服务器时间
   */
  async syncServerTime(srsHost: string): Promise<void> {
    const clientTime1 = Date.now();
    
    // 调用 SRS API 获取服务器时间
    const response = await fetch(`http://${srsHost}/api/v1/time`);
    const data = await response.json();
    
    const clientTime2 = Date.now();
    const serverTime = data.timestamp;
    
    // 计算往返时延
    const rtt = clientTime2 - clientTime1;
    
    // 估算服务器时间（考虑往返时延）
    const estimatedServerTime = serverTime + rtt / 2;
    
    // 计算时间偏差
    this.serverTimeOffset = estimatedServerTime - clientTime2;
    
    console.log(`服务器时间偏差: ${this.serverTimeOffset}ms`);
  }
  
  /**
   * 获取当前服务器时间
   */
  getServerTime(): number {
    return Date.now() + this.serverTimeOffset;
  }
  
  /**
   * 获取流的服务器时间戳
   */
  getStreamServerTimestamp(
    protocol: StreamProtocol,
    streamStartTime: number
  ): number {
    const serverTime = this.getServerTime();
    const latency = PROTOCOL_LATENCY[protocol];
    
    // 服务器时间 - 协议延迟 = 当前播放的服务器时间戳
    return serverTime - latency;
  }
}
```

**SRS 服务器端实现（参考）：**

```javascript
// SRS HTTP API 扩展
app.get('/api/v1/time', (req, res) => {
  res.json({
    timestamp: Date.now(),
    timezone: 'UTC+8'
  });
});

// 获取流的时间戳信息
app.get('/api/v1/streams/:app/:stream/timestamp', (req, res) => {
  const { app, stream } = req.params;
  
  // 从 SRS 获取流信息
  const streamInfo = srs.getStreamInfo(app, stream);
  
  res.json({
    streamId: `${app}/${stream}`,
    startTime: streamInfo.startTime,      // 流开始时间
    currentTime: Date.now(),              // 当前服务器时间
    duration: Date.now() - streamInfo.startTime, // 流持续时长
    protocols: {
      webrtc: {
        latency: 500,
        currentTimestamp: Date.now() - 500
      },
      flv: {
        latency: 2500,
        currentTimestamp: Date.now() - 2500
      },
      hls: {
        latency: 15000,
        currentTimestamp: Date.now() - 15000
      }
    }
  });
});
```

## 完整实现方案

### 1. 增强 BasePlayer

```typescript
export abstract class BasePlayer {
  protected config: PlayerConfig;
  protected videoElement: HTMLVideoElement;
  protected streamStartTime: number = 0;
  
  /**
   * 获取当前播放时间（相对时间）
   */
  getCurrentTime(): number {
    return this.videoElement.currentTime;
  }
  
  /**
   * 获取服务器时间戳（绝对时间）⭐ 新增
   */
  abstract getServerTimestamp(): number;
  
  /**
   * 根据服务器时间戳跳转 ⭐ 新增
   */
  abstract seekToServerTimestamp(serverTimestamp: number): void;
  
  /**
   * 获取流开始时间 ⭐ 新增
   */
  getStreamStartTime(): number {
    return this.streamStartTime;
  }
}
```

### 2. 更新 TimestampSynchronizer

```typescript
export class TimestampSynchronizer {
  /**
   * 同步时间戳（使用服务器时间戳）
   */
  async synchronize(
    fromPlayer: BasePlayer,
    toPlayer: BasePlayer,
    fromProtocol: StreamProtocol,
    toProtocol: StreamProtocol
  ): Promise<SyncResult> {
    // 1. 获取源播放器的服务器时间戳
    const serverTimestamp = fromPlayer.getServerTimestamp();
    
    console.log(`[时间同步] 当前服务器时间戳: ${new Date(serverTimestamp).toISOString()}`);
    
    // 2. 计算协议延迟差
    const timeDiff = this.calculateTimeDiff(fromProtocol, toProtocol);
    
    // 3. 计算目标播放器应该跳转到的服务器时间戳
    const targetServerTimestamp = serverTimestamp + timeDiff;
    
    console.log(`[时间同步] 目标服务器时间戳: ${new Date(targetServerTimestamp).toISOString()}`);
    
    // 4. 让目标播放器跳转到对应位置
    try {
      toPlayer.seekToServerTimestamp(targetServerTimestamp);
      
      return {
        success: true,
        strategy: this.config.strategy,
        timeDiff,
        action: 'skip',
        message: `同步到服务器时间戳 ${new Date(targetServerTimestamp).toISOString()}`
      };
    } catch (error) {
      console.error('[时间同步] 同步失败:', error);
      return {
        success: false,
        strategy: this.config.strategy,
        timeDiff,
        action: 'none',
        message: `同步失败: ${(error as Error).message}`
      };
    }
  }
}
```

### 3. 更新 PlayerManager

```typescript
export class PlayerManager {
  async switchProtocol(targetProtocol: StreamProtocol): Promise<boolean> {
    const oldPlayer = this.currentPlayer;
    const oldProtocol = this.currentProtocol;
    
    // 1. 获取当前服务器时间戳（而不是 currentTime）
    let serverTimestamp = 0;
    if (oldPlayer) {
      serverTimestamp = oldPlayer.getServerTimestamp();
      console.log(`[切换协议] 当前服务器时间戳: ${new Date(serverTimestamp).toISOString()}`);
    }
    
    // 2. 创建并加载新播放器
    const newPlayer = this.createPlayer(targetProtocol);
    await newPlayer.initialize();
    await newPlayer.load();
    
    // 3. 时间戳同步（使用服务器时间戳）
    if (oldPlayer && oldProtocol) {
      const syncResult = await this.timestampSync.synchronize(
        oldPlayer,
        newPlayer,
        oldProtocol,
        targetProtocol
      );
      
      console.log(`[切换协议] 同步结果:`, syncResult);
      this.emit('timestamp-sync', syncResult);
    }
    
    // 4. 切换播放器
    this.destroyCurrentPlayer();
    this.currentPlayer = newPlayer;
    this.currentProtocol = targetProtocol;
    
    await newPlayer.play();
    
    return true;
  }
}
```

## 实际效果对比

### 使用 currentTime（错误）

```
场景：WebRTC → FLV

WebRTC:
- currentTime: 125.3s
- 实际播放: 服务器 10:00:05.0 的画面

切换到 FLV:
- 从 currentTime 125.3s 开始播放
- 实际播放: 服务器 10:00:02.5 的画面
- 结果: 重复播放 2.5 秒！❌
```

### 使用服务器时间戳（正确）

```
场景：WebRTC → FLV

WebRTC:
- currentTime: 125.3s
- serverTimestamp: 2024-03-04 10:00:05.000

切换到 FLV:
- 计算目标 serverTimestamp: 10:00:05.000 + 2000ms = 10:00:07.000
- 跳转到对应的 currentTime
- 实际播放: 服务器 10:00:07.0 的画面
- 结果: 快进 2 秒，无重复！✅
```

## 最佳实践

### 1. 优先级策略

```typescript
class TimestampManager {
  getServerTimestamp(player: BasePlayer, protocol: StreamProtocol): number {
    // 优先级 1: 从流元数据获取（最准确）
    try {
      const timestamp = player.getServerTimestamp();
      if (timestamp > 0) {
        return timestamp;
      }
    } catch (error) {
      console.warn('无法从流获取时间戳:', error);
    }
    
    // 优先级 2: 从服务器 API 获取
    try {
      const serverTime = await this.serverTimeSyncService.getStreamServerTimestamp(
        protocol,
        player.getStreamStartTime()
      );
      return serverTime;
    } catch (error) {
      console.warn('无法从服务器 API 获取时间戳:', error);
    }
    
    // 优先级 3: 客户端估算（降级方案）
    return this.estimator.estimateServerTimestamp(
      protocol,
      player.getCurrentTime()
    );
  }
}
```

### 2. 定期校准

```typescript
class TimestampCalibrator {
  private calibrationInterval: number = 30000; // 30秒校准一次
  
  startCalibration(player: BasePlayer, protocol: StreamProtocol): void {
    setInterval(async () => {
      // 从服务器获取真实时间戳
      const serverTimestamp = await this.fetchServerTimestamp();
      
      // 与播放器时间戳对比
      const playerTimestamp = player.getServerTimestamp();
      
      // 计算偏差
      const drift = serverTimestamp - playerTimestamp;
      
      if (Math.abs(drift) > 1000) {
        console.warn(`时间戳偏差过大: ${drift}ms，进行校准`);
        player.seekToServerTimestamp(serverTimestamp);
      }
    }, this.calibrationInterval);
  }
}
```

### 3. 调试工具

```typescript
class TimestampDebugger {
  logTimestampInfo(player: BasePlayer, protocol: StreamProtocol): void {
    const currentTime = player.getCurrentTime();
    const serverTimestamp = player.getServerTimestamp();
    const streamStartTime = player.getStreamStartTime();
    const latency = PROTOCOL_LATENCY[protocol];
    
    console.table({
      '协议': protocol,
      '播放时间 (currentTime)': `${currentTime.toFixed(2)}s`,
      '服务器时间戳': new Date(serverTimestamp).toISOString(),
      '流开始时间': new Date(streamStartTime).toISOString(),
      '协议延迟': `${latency}ms`,
      '实际延迟': `${Date.now() - serverTimestamp}ms`
    });
  }
}
```

## 总结

获取直播时间戳的关键点：

1. **不能只用 currentTime**：它只是相对时间，无法用于跨协议同步
2. **优先从流元数据获取**：WebRTC RTP、FLV Tag、HLS PDT
3. **服务器 API 作为补充**：提供准确的时间基准
4. **客户端估算作为降级**：保证系统可用性
5. **定期校准**：避免时间漂移
6. **充分测试**：不同协议、不同网络条件下的表现

这样才能实现真正准确的协议切换时间同步！
