# SRS 流媒体服务器时间戳获取实现

## SRS HTTP API 概述

SRS 提供了丰富的 HTTP API 来获取流信息，默认端口是 1985。

**API 文档：** https://ossrs.net/lts/zh-cn/docs/v5/doc/http-api

## 核心 API

### 1. 获取流信息

```bash
# 获取所有流
GET http://localhost:1985/api/v1/streams/

# 获取特定流
GET http://localhost:1985/api/v1/streams/{stream_id}
```

**响应示例：**
```json
{
  "code": 0,
  "server": "vid-2s4k7s8",
  "streams": [
    {
      "id": "vid-2s4k7s8",
      "name": "livestream",
      "vhost": "__defaultVhost__",
      "app": "live",
      "live_ms": 12345678,        // 流存活时长（毫秒）⭐
      "clients": 3,
      "frames": 12000,
      "send_bytes": 123456789,
      "recv_bytes": 987654321,
      "kbps": {
        "recv_30s": 2000,
        "send_30s": 6000
      },
      "publish": {
        "active": true,
        "cid": "3r8f5s9"
      },
      "video": {
        "codec": "H264",
        "profile": "High",
        "level": "4.1",
        "width": 1920,
        "height": 1080
      },
      "audio": {
        "codec": "AAC",
        "sample_rate": 44100,
        "channels": 2
      }
    }
  ]
}
```

### 2. 获取客户端信息

```bash
GET http://localhost:1985/api/v1/clients/
```

**响应包含：**
- 客户端连接时间
- 播放/推流时长
- 流量统计

## 实现方案

### 方案 1：使用 SRS API + 客户端时间估算（推荐）⭐⭐⭐

```typescript
/**
 * SRS 时间戳服务
 */
export class SRSTimestampService {
  private srsHost: string;
  private srsApiPort: number = 1985;
  private streamStartTime: number = 0;
  private serverTimeOffset: number = 0;
  
  constructor(srsHost: string) {
    this.srsHost = srsHost;
  }
  
  /**
   * 初始化：同步服务器时间 + 获取流开始时间
   */
  async initialize(app: string, streamId: string): Promise<void> {
    // 1. 同步服务器时间（可选，提高精度）
    await this.syncServerTime();
    
    // 2. 获取流信息
    const streamInfo = await this.getStreamInfo(app, streamId);
    
    if (streamInfo) {
      // 3. 计算流开始时间
      const now = this.getServerTime();
      const liveMs = streamInfo.live_ms; // 流存活时长
      this.streamStartTime = now - liveMs;
      
      console.log(`[SRS时间戳] 流开始时间: ${new Date(this.streamStartTime).toISOString()}`);
      console.log(`[SRS时间戳] 流存活时长: ${liveMs}ms`);
    }
  }
  
  /**
   * 同步服务器时间
   */
  private async syncServerTime(): Promise<void> {
    const clientTime1 = Date.now();
    
    try {
      // SRS 没有专门的时间 API，用 /api/v1/versions 代替
      const response = await fetch(`http://${this.srsHost}:${this.srsApiPort}/api/v1/versions`);
      const data = await response.json();
      
      const clientTime2 = Date.now();
      const rtt = clientTime2 - clientTime1;
      
      // 假设服务器响应时间在 RTT 中间
      // 实际应用中，可以在服务器响应中加入时间戳
      this.serverTimeOffset = 0; // 简化处理，假设客户端与服务器时间一致
      
      console.log(`[SRS时间戳] RTT: ${rtt}ms`);
    } catch (error) {
      console.warn('[SRS时间戳] 服务器时间同步失败:', error);
    }
  }
  
  /**
   * 获取流信息
   */
  async getStreamInfo(app: string, streamId: string): Promise<any> {
    try {
      const response = await fetch(
        `http://${this.srsHost}:${this.srsApiPort}/api/v1/streams/`
      );
      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(`SRS API error: ${data.code}`);
      }
      
      // 查找匹配的流
      const stream = data.streams?.find((s: any) => 
        s.app === app && s.name === streamId
      );
      
      return stream || null;
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
   * 获取流的服务器时间戳（考虑协议延迟）
   */
  getStreamServerTimestamp(protocol: StreamProtocol): number {
    const serverTime = this.getServerTime();
    const latency = PROTOCOL_LATENCY[protocol];
    
    // 当前服务器时间 - 协议延迟 = 当前播放的服务器时间戳
    return serverTime - latency;
  }
  
  /**
   * 计算 currentTime 对应的服务器时间戳
   */
  currentTimeToServerTimestamp(currentTime: number): number {
    return this.streamStartTime + currentTime * 1000;
  }
  
  /**
   * 计算服务器时间戳对应的 currentTime
   */
  serverTimestampToCurrentTime(serverTimestamp: number): number {
    return (serverTimestamp - this.streamStartTime) / 1000;
  }
  
  /**
   * 定期更新流信息（可选）
   */
  startPeriodicUpdate(app: string, streamId: string, interval: number = 30000): void {
    setInterval(async () => {
      const streamInfo = await this.getStreamInfo(app, streamId);
      if (streamInfo) {
        // 更新流开始时间（防止时间漂移）
        const now = this.getServerTime();
        const liveMs = streamInfo.live_ms;
        this.streamStartTime = now - liveMs;
      }
    }, interval);
  }
}
```

### 方案 2：扩展 SRS API（服务器端修改）⭐⭐⭐⭐⭐

如果你可以修改 SRS 服务器或添加中间层，可以提供更精确的时间戳 API：

**Node.js 中间层示例：**

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

const SRS_HOST = 'localhost';
const SRS_API_PORT = 1985;

/**
 * 获取服务器时间
 */
app.get('/api/v1/time', (req, res) => {
  res.json({
    timestamp: Date.now(),
    timezone: 'UTC+8',
    iso: new Date().toISOString()
  });
});

/**
 * 获取流的时间戳信息
 */
app.get('/api/v1/streams/:app/:stream/timestamp', async (req, res) => {
  const { app, stream } = req.params;
  
  try {
    // 1. 从 SRS 获取流信息
    const response = await axios.get(`http://${SRS_HOST}:${SRS_API_PORT}/api/v1/streams/`);
    const data = response.data;
    
    if (data.code !== 0) {
      return res.status(500).json({ error: 'SRS API error' });
    }
    
    // 2. 查找目标流
    const streamInfo = data.streams?.find(s => s.app === app && s.name === stream);
    
    if (!streamInfo) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // 3. 计算时间戳信息
    const now = Date.now();
    const liveMs = streamInfo.live_ms;
    const startTime = now - liveMs;
    
    res.json({
      streamId: `${app}/${stream}`,
      serverTime: now,
      startTime: startTime,
      liveMs: liveMs,
      startTimeISO: new Date(startTime).toISOString(),
      protocols: {
        webrtc: {
          latency: 500,
          currentTimestamp: now - 500,
          currentTimeISO: new Date(now - 500).toISOString()
        },
        flv: {
          latency: 2500,
          currentTimestamp: now - 2500,
          currentTimeISO: new Date(now - 2500).toISOString()
        },
        hls: {
          latency: 15000,
          currentTimestamp: now - 15000,
          currentTimeISO: new Date(now - 15000).toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('SRS Timestamp API running on port 3000');
});
```

**客户端调用：**

```typescript
export class SRSTimestampServiceV2 {
  private apiHost: string;
  
  constructor(apiHost: string) {
    this.apiHost = apiHost;
  }
  
  /**
   * 获取流的时间戳信息
   */
  async getStreamTimestamp(app: string, streamId: string): Promise<any> {
    const response = await fetch(
      `http://${this.apiHost}:3000/api/v1/streams/${app}/${streamId}/timestamp`
    );
    return await response.json();
  }
  
  /**
   * 获取当前播放的服务器时间戳
   */
  async getCurrentServerTimestamp(
    app: string,
    streamId: string,
    protocol: StreamProtocol
  ): number {
    const data = await this.getStreamTimestamp(app, streamId);
    return data.protocols[protocol].currentTimestamp;
  }
}
```

### 方案 3：从 FLV/HLS 元数据获取（协议特定）

#### FLV - 使用 flv.js

```typescript
import flvjs from 'flv.js';

export class FLVTimestampExtractor {
  private flvPlayer: flvjs.Player | null = null;
  private firstTagTimestamp: number = 0;
  private streamStartTime: number = 0;
  
  createPlayer(url: string, videoElement: HTMLVideoElement): void {
    this.flvPlayer = flvjs.createPlayer({
      type: 'flv',
      url: url,
      isLive: true
    });
    
    this.flvPlayer.attachMediaElement(videoElement);
    this.flvPlayer.load();
    
    // 监听统计信息
    this.flvPlayer.on(flvjs.Events.STATISTICS_INFO, (info) => {
      // info.currentSegmentIndex 是 FLV Tag 的时间戳（毫秒）
      const tagTimestamp = info.currentSegmentIndex;
      
      // 第一次收到时，记录流开始时间
      if (this.firstTagTimestamp === 0) {
        this.firstTagTimestamp = tagTimestamp;
        this.streamStartTime = Date.now() - tagTimestamp;
        
        console.log(`[FLV时间戳] 流开始时间: ${new Date(this.streamStartTime).toISOString()}`);
        console.log(`[FLV时间戳] 第一个Tag时间戳: ${tagTimestamp}ms`);
      }
    });
  }
  
  /**
   * 获取当前播放的服务器时间戳
   */
  getServerTimestamp(): number {
    if (this.flvPlayer) {
      const videoElement = this.flvPlayer.mediaElement as HTMLVideoElement;
      const currentTime = videoElement.currentTime;
      
      // 服务器时间戳 = 流开始时间 + 当前播放时间
      return this.streamStartTime + currentTime * 1000;
    }
    return 0;
  }
}
```

#### HLS - 使用 hls.js

```typescript
import Hls from 'hls.js';

export class HLSTimestampExtractor {
  private hls: Hls | null = null;
  private programDateTime: number = 0;
  private fragmentStartTime: number = 0;
  
  createPlayer(url: string, videoElement: HTMLVideoElement): void {
    this.hls = new Hls();
    this.hls.loadSource(url);
    this.hls.attachMedia(videoElement);
    
    // 监听 Fragment 加载
    this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
      const frag = data.frag;
      
      // 如果 m3u8 包含 EXT-X-PROGRAM-DATE-TIME
      if (frag.programDateTime) {
        this.programDateTime = frag.programDateTime;
        this.fragmentStartTime = frag.start;
        
        console.log(`[HLS时间戳] Program Date Time: ${new Date(this.programDateTime).toISOString()}`);
        console.log(`[HLS时间戳] Fragment Start: ${this.fragmentStartTime}s`);
      }
    });
  }
  
  /**
   * 获取当前播放的服务器时间戳
   */
  getServerTimestamp(videoElement: HTMLVideoElement): number {
    if (this.programDateTime > 0) {
      // 使用 Program Date Time 计算
      const elapsed = videoElement.currentTime - this.fragmentStartTime;
      return this.programDateTime + elapsed * 1000;
    }
    
    // 降级方案：估算
    return Date.now() - 15000; // HLS 延迟约 15s
  }
}
```

## 完整集成示例

```typescript
/**
 * 统一的时间戳管理器
 */
export class UnifiedTimestampManager {
  private srsService: SRSTimestampService;
  private flvExtractor: FLVTimestampExtractor;
  private hlsExtractor: HLSTimestampExtractor;
  
  constructor(srsHost: string) {
    this.srsService = new SRSTimestampService(srsHost);
    this.flvExtractor = new FLVTimestampExtractor();
    this.hlsExtractor = new HLSTimestampExtractor();
  }
  
  /**
   * 初始化
   */
  async initialize(app: string, streamId: string): Promise<void> {
    await this.srsService.initialize(app, streamId);
    
    // 启动定期更新
    this.srsService.startPeriodicUpdate(app, streamId, 30000);
  }
  
  /**
   * 获取播放器的服务器时间戳
   */
  getServerTimestamp(
    player: BasePlayer,
    protocol: StreamProtocol
  ): number {
    // 优先级 1: 从协议特定的提取器获取
    if (protocol === 'flv') {
      const timestamp = this.flvExtractor.getServerTimestamp();
      if (timestamp > 0) return timestamp;
    } else if (protocol === 'hls') {
      const timestamp = this.hlsExtractor.getServerTimestamp(player.getVideoElement());
      if (timestamp > 0) return timestamp;
    }
    
    // 优先级 2: 从 SRS API 估算
    const currentTime = player.getCurrentTime();
    return this.srsService.currentTimeToServerTimestamp(currentTime);
  }
  
  /**
   * 计算目标协议的 currentTime
   */
  calculateTargetCurrentTime(
    fromPlayer: BasePlayer,
    fromProtocol: StreamProtocol,
    toProtocol: StreamProtocol
  ): number {
    // 1. 获取当前服务器时间戳
    const serverTimestamp = this.getServerTimestamp(fromPlayer, fromProtocol);
    
    // 2. 计算协议延迟差
    const timeDiff = PROTOCOL_LATENCY[toProtocol] - PROTOCOL_LATENCY[fromProtocol];
    
    // 3. 调整服务器时间戳
    const targetServerTimestamp = serverTimestamp + timeDiff;
    
    // 4. 转换为 currentTime
    return this.srsService.serverTimestampToCurrentTime(targetServerTimestamp);
  }
}
```

## 使用示例

```typescript
// 1. 创建时间戳管理器
const timestampManager = new UnifiedTimestampManager('192.168.1.100');

// 2. 初始化（获取流信息）
await timestampManager.initialize('live', 'livestream');

// 3. 在协议切换时使用
async function switchProtocol(
  fromPlayer: BasePlayer,
  toPlayer: BasePlayer,
  fromProtocol: StreamProtocol,
  toProtocol: StreamProtocol
) {
  // 获取当前服务器时间戳
  const serverTimestamp = timestampManager.getServerTimestamp(fromPlayer, fromProtocol);
  console.log(`当前服务器时间戳: ${new Date(serverTimestamp).toISOString()}`);
  
  // 计算目标 currentTime
  const targetCurrentTime = timestampManager.calculateTargetCurrentTime(
    fromPlayer,
    fromProtocol,
    toProtocol
  );
  
  console.log(`目标 currentTime: ${targetCurrentTime}s`);
  
  // 跳转到目标位置
  toPlayer.seek(targetCurrentTime);
}
```

## 调试工具

```typescript
/**
 * 时间戳调试面板
 */
export class TimestampDebugPanel {
  async showDebugInfo(
    srsHost: string,
    app: string,
    streamId: string,
    player: BasePlayer,
    protocol: StreamProtocol
  ): Promise<void> {
    const service = new SRSTimestampService(srsHost);
    await service.initialize(app, streamId);
    
    const streamInfo = await service.getStreamInfo(app, streamId);
    const currentTime = player.getCurrentTime();
    const serverTimestamp = service.currentTimeToServerTimestamp(currentTime);
    const streamServerTimestamp = service.getStreamServerTimestamp(protocol);
    
    console.table({
      '协议': protocol,
      '播放时间 (currentTime)': `${currentTime.toFixed(2)}s`,
      '流存活时长': `${streamInfo?.live_ms || 0}ms`,
      '流开始时间': new Date(service['streamStartTime']).toISOString(),
      '当前服务器时间戳': new Date(serverTimestamp).toISOString(),
      '考虑延迟后的时间戳': new Date(streamServerTimestamp).toISOString(),
      '协议延迟': `${PROTOCOL_LATENCY[protocol]}ms`,
      '实际延迟': `${Date.now() - streamServerTimestamp}ms`
    });
  }
}
```

## 注意事项

### 1. SRS API 端口

默认是 1985，确保防火墙开放：

```bash
# 检查 SRS API 是否可访问
curl http://localhost:1985/api/v1/versions

# 如果需要跨域访问，配置 SRS
# 编辑 srs.conf
http_api {
    enabled on;
    listen 1985;
    crossdomain on;  # 允许跨域
}
```

### 2. 时间精度

- `live_ms` 精度取决于 SRS 的更新频率
- 建议定期（30秒）更新流信息
- 客户端与服务器时间差会影响精度

### 3. 流不存在的处理

```typescript
const streamInfo = await service.getStreamInfo(app, streamId);
if (!streamInfo) {
  console.warn('流不存在或未推流');
  // 降级到客户端估算
}
```

## 总结

**推荐方案：**

1. **生产环境**：SRS API + 中间层（方案2）- 最准确
2. **快速实现**：SRS API + 客户端估算（方案1）- 够用
3. **协议特定**：FLV/HLS 元数据提取（方案3）- 作为补充

核心思路：**通过 SRS 的 `live_ms` 字段计算流开始时间，再结合 `currentTime` 和协议延迟，得到准确的服务器时间戳！**
