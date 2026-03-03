<template>
  <div class="danmaku-demo">
    <div class="demo-header">
      <h1>高性能弹幕系统演示</h1>
      <div class="connection-status" :class="{ connected: danmakuStore.connected }">
        {{ danmakuStore.connected ? '已连接' : '未连接' }}
      </div>
    </div>

    <div class="demo-content">
      <!-- 弹幕画布 -->
      <div class="canvas-wrapper">
        <DanmakuCanvas :width="1280" :height="720" />
      </div>

      <!-- 侧边栏 -->
      <div class="sidebar">
        <div class="panel">
          <h3>弹幕输入</h3>
          <DanmakuInput :userId="currentUserId" @send="onDanmakuSent" />
        </div>

        <div class="panel">
          <h3>控制面板</h3>
          <DanmakuControl />
        </div>

        <div class="panel">
          <h3>测试功能</h3>
          <button @click="sendTestDanmaku" class="test-button">
            发送测试弹幕
          </button>
          <button @click="sendBatchDanmaku" class="test-button">
            批量发送 (100条)
          </button>
          <button @click="clearAll" class="test-button danger">
            清除所有弹幕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDanmakuStore } from '@/stores/danmaku'
import DanmakuCanvas from '@/components/danmaku/DanmakuCanvas.vue'
import DanmakuInput from '@/components/danmaku/DanmakuInput.vue'
import DanmakuControl from '@/components/danmaku/DanmakuControl.vue'
import { DanmakuType, DanmakuSize } from '@/danmaku/types'
import type { DanmakuItem } from '@/danmaku/types'

const danmakuStore = useDanmakuStore()
const currentUserId = ref('user_' + Math.random().toString(36).substr(2, 9))

onMounted(async () => {
  // 注意：这里使用模拟的 WebSocket 地址
  // 在实际使用中，需要替换为真实的 WebSocket 服务器地址
  // await danmakuStore.connect('ws://localhost:8080/danmaku')
  
  console.log('Danmaku demo mounted')
})

function onDanmakuSent(danmaku: DanmakuItem) {
  console.log('Danmaku sent:', danmaku)
}

function sendTestDanmaku() {
  const testTexts = [
    '这是一条测试弹幕',
    'Hello World!',
    '666666',
    '前排围观',
    '弹幕测试中...',
    '高性能弹幕系统',
    'Canvas 渲染真快！',
    '支持 1000+ 弹幕/秒'
  ]

  const testColors = ['#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']

  const danmaku: DanmakuItem = {
    id: '',
    text: testTexts[Math.floor(Math.random() * testTexts.length)],
    type: DanmakuType.SCROLL,
    color: testColors[Math.floor(Math.random() * testColors.length)],
    size: DanmakuSize.MEDIUM,
    priority: Math.floor(Math.random() * 10),
    userId: currentUserId.value,
    timestamp: Date.now()
  }

  danmakuStore.addDanmaku(danmaku)
}

function sendBatchDanmaku() {
  for (let i = 0; i < 100; i++) {
    setTimeout(() => {
      sendTestDanmaku()
    }, i * 50) // 每 50ms 发送一条
  }
}

function clearAll() {
  danmakuStore.clear()
}
</script>

<style scoped>
.danmaku-demo {
  min-height: 100vh;
  background: #1a1a1a;
  color: white;
  padding: 20px;
}

.demo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.demo-header h1 {
  margin: 0;
  font-size: 24px;
}

.connection-status {
  padding: 8px 16px;
  border-radius: 4px;
  background: rgba(255, 0, 0, 0.2);
  color: #ff4444;
  font-size: 14px;
}

.connection-status.connected {
  background: rgba(0, 255, 0, 0.2);
  color: #44ff44;
}

.demo-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 20px;
}

.canvas-wrapper {
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
}

.panel h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.test-button {
  width: 100%;
  padding: 10px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.test-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.test-button.danger {
  background: rgba(255, 0, 0, 0.2);
  border-color: rgba(255, 0, 0, 0.4);
}

.test-button.danger:hover {
  background: rgba(255, 0, 0, 0.3);
}

@media (max-width: 1024px) {
  .demo-content {
    grid-template-columns: 1fr;
  }
}
</style>
