<template>
  <div class="adaptive-player">
    <!-- 视频播放器 -->
    <div class="video-container">
      <video ref="videoRef" class="video-player" controls muted></video>
      
      <!-- 播放启动按钮（用于绕过浏览器自动播放策略） -->
      <div v-if="!isPlayerStarted" class="play-overlay" @click="startPlayer">
        <div class="play-button">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="38" fill="rgba(0,0,0,0.7)" stroke="white" stroke-width="2"/>
            <polygon points="30,20 30,60 60,40" fill="white"/>
          </svg>
          <p>点击开始播放</p>
        </div>
      </div>
    </div>

    <!-- 状态显示 -->
    <div class="player-status">
      <div class="status-item">
        <span class="label">协议:</span>
        <span class="value">{{ store.protocolDisplayName }}</span>
      </div>
      <div class="status-item">
        <span class="label">网络:</span>
        <span 
          class="value quality-badge" 
          :style="{ backgroundColor: store.networkQualityColor }"
        >
          {{ store.networkQualityDisplayName }}
        </span>
      </div>
      <div class="status-item">
        <span class="label">模式:</span>
        <span class="value" :class="{ manual: store.isManualMode }">
          {{ store.isManualMode ? '手动' : '自动' }}
        </span>
      </div>
      <div class="status-item">
        <span class="label">状态:</span>
        <span class="value">{{ statusText }}</span>
      </div>
    </div>

    <!-- 网络指标显示 -->
    <div v-if="store.networkMetrics" class="network-metrics">
      <div class="metric">
        <span class="metric-label">RTT:</span>
        <span class="metric-value">{{ store.networkMetrics.rtt.toFixed(0) }}ms</span>
      </div>
      <div class="metric">
        <span class="metric-label">丢包率:</span>
        <span class="metric-value">{{ (store.networkMetrics.packetLoss * 100).toFixed(2) }}%</span>
      </div>
      <div class="metric">
        <span class="metric-label">带宽:</span>
        <span class="metric-value">{{ store.networkMetrics.bandwidth.toFixed(2) }}Mbps</span>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="player-controls">
      <!-- 手动协议选择 -->
      <div v-if="store.isManualMode" class="manual-controls">
        <button 
          @click="switchProtocol('webrtc')" 
          :class="{ active: store.protocol === 'webrtc' }"
          class="protocol-btn"
        >
          WebRTC
        </button>
        <button 
          @click="switchProtocol('flv')" 
          :class="{ active: store.protocol === 'flv' }"
          class="protocol-btn"
        >
          FLV
        </button>
        <button 
          @click="switchProtocol('hls')" 
          :class="{ active: store.protocol === 'hls' }"
          class="protocol-btn"
        >
          HLS
        </button>
      </div>

      <!-- 模式切换按钮 -->
      <button @click="toggleAutoSwitch" class="mode-btn">
        {{ store.isAutoSwitch ? '切换到手动' : '切换到自动' }}
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="store.hasError" class="error-message">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ store.error?.message }}</span>
      <button @click="store.clearError()" class="close-btn">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useStreamStore } from '@/stores/stream';
import { AdaptiveStreamPlayer } from '@/services/AdaptiveStreamPlayer';
import type { StreamProtocol } from '@/types/adaptive-stream';

const store = useStreamStore();
const videoRef = ref<HTMLVideoElement>();
const isPlayerStarted = ref(false);
let player: AdaptiveStreamPlayer | null = null;

const statusText = computed(() => {
  const statusMap = {
    idle: '空闲',
    loading: '加载中...',
    playing: '播放中',
    paused: '已暂停',
    error: '错误'
  };
  return statusMap[store.playerStatus];
});

onMounted(() => {
  if (!videoRef.value) {
    console.error('Video element not found');
    return;
  }

  // 创建播放器实例（但不启动）
  player = new AdaptiveStreamPlayer({
    videoElement: videoRef.value,
    srsHost: store.config.srsHost,
    app: store.config.app,
    streamId: store.config.streamId
  });

  // 同步状态到 store
  player.on('protocol-change', (protocol: StreamProtocol) => {
    store.updateProtocol(protocol);
  });

  player.on('network-quality-change', (quality) => {
    store.updateNetworkQuality(quality);
  });

  player.on('metrics-update', (metrics) => {
    store.updateNetworkMetrics(metrics);
  });

  player.on('player-state-change', (state) => {
    store.updatePlayerStatus(state.status);
    if (state.error) {
      store.setError(state.error);
    }
  });

  player.on('error', (errorEvent) => {
    store.setError(errorEvent.error);
  });
});

async function startPlayer() {
  if (!player || isPlayerStarted.value) {
    return;
  }

  try {
    isPlayerStarted.value = true;
    console.log('用户点击开始播放');
    
    // 启动播放器
    await player.start();
  } catch (error) {
    console.error('Failed to start player:', error);
    store.setError(error as Error);
    isPlayerStarted.value = false;
  }
}

onUnmounted(() => {
  if (player) {
    player.destroy();
    player = null;
  }
});

function switchProtocol(protocol: StreamProtocol) {
  if (player) {
    player.setManualProtocol(protocol);
  }
}

function toggleAutoSwitch() {
  if (store.isAutoSwitch) {
    store.setManualMode(true);
  } else {
    if (player) {
      player.enableAutoSwitch();
    }
    store.setManualMode(false);
  }
}
</script>

<style scoped>
.adaptive-player {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.video-container {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-player {
  width: 100%;
  height: auto;
  display: block;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  cursor: pointer;
  z-index: 10;
  transition: background 0.3s;
}

.play-overlay:hover {
  background: rgba(0, 0, 0, 0.9);
}

.play-button {
  text-align: center;
  color: white;
  transition: transform 0.3s;
}

.play-button:hover {
  transform: scale(1.1);
}

.play-button p {
  margin-top: 15px;
  font-size: 18px;
  font-weight: 500;
}

.player-status {
  display: flex;
  gap: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-weight: 600;
  color: #666;
}

.value {
  color: #333;
}

.quality-badge {
  padding: 2px 8px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.manual {
  color: #1890ff;
  font-weight: 600;
}

.network-metrics {
  display: flex;
  gap: 20px;
  padding: 15px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.metric {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric-label {
  font-size: 14px;
  color: #666;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.player-controls {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.manual-controls {
  display: flex;
  gap: 10px;
}

.protocol-btn {
  padding: 8px 16px;
  border: 2px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.protocol-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.protocol-btn.active {
  border-color: #1890ff;
  background: #1890ff;
  color: white;
}

.mode-btn {
  padding: 8px 20px;
  border: none;
  background: #1890ff;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.mode-btn:hover {
  background: #40a9ff;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fff2e8;
  border: 1px solid #ffbb96;
  border-radius: 6px;
  margin-top: 15px;
}

.error-icon {
  font-size: 18px;
}

.error-text {
  flex: 1;
  color: #d4380d;
  font-size: 14px;
}

.close-btn {
  padding: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #d4380d;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: #ff4d4f;
}

@media (max-width: 768px) {
  .player-status,
  .network-metrics {
    flex-direction: column;
    gap: 10px;
  }

  .player-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .manual-controls {
    width: 100%;
  }

  .protocol-btn,
  .mode-btn {
    flex: 1;
  }
}
</style>
