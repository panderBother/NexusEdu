# WebSocket 高并发架构设计

## 问题：WebSocket 连接过多导致性能下降

### 单机 WebSocket 的瓶颈

```
假设一个热门直播间：
- 10 万在线观众
- 每个观众 1 个 WebSocket 连接
- 每个连接占用：
  - 内存：~10KB（连接状态、缓冲区）
  - 文件描述符：1 个
  - CPU：心跳检测、消息处理

单机瓶颈：
├─ 内存：10万 × 10KB = 1GB（仅连接本身）
├─ 文件描述符：Linux 默认 ulimit 1024，需要调整到 10万+
├─ CPU：10万个连接的心跳检测、消息广播
└─ 网络带宽：每秒 100 条弹幕 × 10万人 = 1000万次推送
```

### 实际问题

1. **C10K 问题**：单机处理 1 万个并发连接就很困难
2. **C100K 问题**：10 万并发连接需要特殊优化
3. **C1M 问题**：百万级并发需要分布式架构

## 解决方案

### 方案 1：分布式 WebSocket 集群（推荐）

```
                    ┌─────────────┐
                    │   Nginx     │
                    │ Load Balancer│
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
      ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
      │  WS Node1 │  │  WS Node2 │  │  WS Node3 │
      │  3万连接   │  │  3万连接   │  │  3万连接   │
      └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │  Pub/Sub    │
                    └─────────────┘
```

**工作原理：**

1. **负载均衡**：Nginx 将用户分配到不同的 WebSocket 节点
2. **消息广播**：通过 Redis Pub/Sub 在节点间同步消息
3. **水平扩展**：增加节点即可支持更多连接

**代码示例：**

```javascript
// WebSocket 节点（Node.js）
const WebSocket = require('ws')
const Redis = require('ioredis')

const wss = new WebSocket.Server({ port: 8080 })
const redis = new Redis()
const pub = new Redis()

// 订阅 Redis 频道
redis.subscribe('danmaku:room:123')

// 接收 Redis 消息，广播给本节点的所有客户端
redis.on('message', (channel, message) => {
  const danmaku = JSON.parse(message)
  
  // 广播给本节点的所有连接
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
})

// 客户端发送弹幕
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const msg = JSON.parse(data)
    
    if (msg.type === 'danmaku') {
      // 发布到 Redis，所有节点都会收到
      pub.publish('danmaku:room:123', JSON.stringify(msg))
    }
  })
})
```

**优点：**
- 支持百万级并发
- 水平扩展，无单点故障
- 成本可控

**缺点：**
- 架构复杂
- 需要 Redis 等中间件

---

### 方案 2：长轮询 (Long Polling) 降级

对于不支持 WebSocket 的环境，使用长轮询：

```javascript
// 客户端
async function pollDanmaku() {
  while (true) {
    try {
      const response = await fetch('/danmaku/poll?roomId=123&lastId=456', {
        timeout: 30000 // 30秒超时
      })
      
      const danmakuList = await response.json()
      danmakuList.forEach(addDanmaku)
      
    } catch (error) {
      await sleep(1000) // 出错后等待 1 秒重试
    }
  }
}
```

**服务器端（伪代码）：**
```javascript
app.get('/danmaku/poll', async (req, res) => {
  const { roomId, lastId } = req.query
  
  // 等待新消息，最多 30 秒
  const danmakuList = await waitForNewDanmaku(roomId, lastId, 30000)
  
  res.json(danmakuList)
})
```

**优点：**
- 兼容性好
- 实现简单

**缺点：**
- 延迟高（1-3 秒）
- 服务器压力大（大量挂起的 HTTP 连接）

---

### 方案 3：SSE + HTTP 混合（中等规模）

```javascript
// 接收弹幕：SSE（单向推送）
const eventSource = new EventSource('/danmaku/stream?roomId=123')
eventSource.onmessage = (event) => {
  const danmaku = JSON.parse(event.data)
  addDanmaku(danmaku)
}

// 发送弹幕：HTTP POST
async function sendDanmaku(text) {
  await fetch('/danmaku/send', {
    method: 'POST',
    body: JSON.stringify({ roomId: 123, text })
  })
}
```

**优点：**
- 比 WebSocket 简单
- 浏览器原生支持自动重连
- 单向推送性能好

**缺点：**
- 发送弹幕需要额外 HTTP 请求
- 不如 WebSocket 实时

---

### 方案 4：CDN 边缘推流（大规模）

```
                    ┌─────────────┐
                    │   CDN Edge  │
                    │   节点 1     │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
      ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
      │ 用户 1-1万 │  │用户1万-2万│  │用户2万-3万│
      └───────────┘  └───────────┘  └───────────┘

弹幕流向：
用户发送弹幕 → 源站 → CDN 边缘节点 → 就近的用户
```

**工作原理：**
- 弹幕通过 CDN 边缘节点分发
- 用户连接到最近的 CDN 节点
- 减少源站压力

**适用场景：**
- 超大型直播（百万级观众）
- 全球分布的用户

---

## 实际生产环境的选择

### 小规模（< 1万在线）
- **方案**：单机 WebSocket
- **技术栈**：Node.js + Socket.io
- **成本**：1 台服务器

### 中等规模（1万 - 10万在线）
- **方案**：WebSocket 集群 + Redis
- **技术栈**：Nginx + 多个 Node.js 节点 + Redis
- **成本**：3-5 台服务器

### 大规模（10万 - 100万在线）
- **方案**：分布式集群 + 消息队列
- **技术栈**：Nginx + Node.js 集群 + Kafka/RabbitMQ + Redis
- **成本**：10+ 台服务器

### 超大规模（100万+ 在线）
- **方案**：CDN 边缘推流 + 分布式集群
- **技术栈**：CDN + Nginx + Node.js 集群 + Kafka + Redis
- **成本**：使用云服务（阿里云、腾讯云）

---

## 性能优化技巧

### 1. 消息合并（Message Batching）

```javascript
// 不好：每条弹幕单独发送
danmakuList.forEach(danmaku => {
  ws.send(JSON.stringify(danmaku))
})

// 好：批量发送
const batch = danmakuList.slice(0, 10) // 每次最多 10 条
ws.send(JSON.stringify({
  type: 'batch',
  data: batch
}))
```

**效果：**
- 减少网络开销
- 降低 CPU 使用率

### 2. 消息压缩

```javascript
// 使用 zlib 压缩
const zlib = require('zlib')

const data = JSON.stringify(danmakuList)
const compressed = zlib.gzipSync(data)

ws.send(compressed)
```

**效果：**
- 减少带宽占用 60-80%
- 适合大量文本消息

### 3. 二进制协议（Protocol Buffers）

```protobuf
// danmaku.proto
message Danmaku {
  string id = 1;
  string text = 2;
  string userId = 3;
  int64 timestamp = 4;
}
```

**效果：**
- 比 JSON 小 30-50%
- 解析速度更快

### 4. 心跳优化

```javascript
// 不好：每个连接独立心跳
setInterval(() => {
  ws.send('ping')
}, 30000)

// 好：批量心跳检测
setInterval(() => {
  wss.clients.forEach(client => {
    if (!client.isAlive) {
      client.terminate()
    } else {
      client.isAlive = false
      client.ping()
    }
  })
}, 30000)
```

### 5. 连接池复用

```javascript
// 客户端：断线重连
ws.onclose = () => {
  setTimeout(() => {
    reconnect()
  }, 1000)
}
```

---

## 真实案例：B站直播弹幕架构

B站的弹幕系统架构（简化版）：

```
用户浏览器
    ↓
CDN 边缘节点（WebSocket）
    ↓
弹幕网关集群（负载均衡）
    ↓
弹幕服务集群（业务逻辑）
    ↓
Kafka（消息队列）
    ↓
Redis（缓存 + Pub/Sub）
    ↓
MySQL（持久化存储）
```

**关键技术：**
1. **分层架构**：接入层、业务层、存储层分离
2. **消息队列**：Kafka 削峰填谷
3. **缓存**：Redis 缓存热门弹幕
4. **CDN**：边缘节点就近推送

---

## 总结

### WebSocket 连接过多的问题

| 问题 | 解决方案 |
|------|---------|
| 单机连接数限制 | 分布式集群 + 负载均衡 |
| 内存占用过高 | 消息合并 + 压缩 |
| CPU 占用过高 | 批量处理 + 二进制协议 |
| 带宽占用过高 | CDN 边缘推流 |
| 消息广播慢 | Redis Pub/Sub + 消息队列 |

### 技术选型建议

- **< 1万在线**：单机 WebSocket 足够
- **1万 - 10万**：WebSocket 集群 + Redis
- **10万 - 100万**：分布式集群 + Kafka
- **100万+**：CDN + 云服务

### 关键点

1. **不要让所有用户连接到同一台服务器**
2. **使用 Redis Pub/Sub 在节点间同步消息**
3. **消息合并、压缩减少网络开销**
4. **CDN 边缘推流降低源站压力**

你的担心是对的，WebSocket 连接过多确实是个大问题，但通过合理的架构设计可以解决！
