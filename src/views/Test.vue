<template>
  <div class="live-player-wrapper">
    <div ref="playerRef" class="xg-player-container"></div>
    <div v-if="isLoading" class="loading-tip">直播加载中...</div>
    <div v-if="playError" class="error-tip" @click="reloadPlayer">
      直播播放失败，点击重试
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Player from 'xgplayer';
import 'xgplayer/dist/index.min.css';
import FlvPlugin from 'xgplayer-flv';
import HlsPlugin from 'xgplayer-hls';

const playerRef = ref(null);
let player = null;
const isLoading = ref(true);
const playError = ref(false);

// 核心修改1：明确 HLS 流地址，自动判断协议
const hlsUrl = 'http://101.35.16.42:8080/hls/live/stream1.m3u8';
const flvUrl = 'http://101.35.16.42:8080/live/stream1.flv';

// 核心修改2：根据流地址和设备自动选择插件
const getPlayerConfig = () => {
  // 判断是否为 HLS 流（m3u8 后缀）
  const isHls = hlsUrl.endsWith('.m3u8');
  // iOS 强制用 HLS（不支持 FLV）
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return {
    url: isiOS || isHls ? hlsUrl : flvUrl,
    el: playerRef.value,
    width: '100%',
    height: 540,
    autoplay: true,
    muted: true, // 核心修改3：静音自动播放（绕过浏览器限制）
    playsinline: true,
    controls: true,
    progressBar: false,
    loop: false,
    volume: 0.8,
    isLive: true, // 核心修改4：标记为直播流（HLS 必需）
    plugins: isiOS || isHls ? [HlsPlugin] : [FlvPlugin], // 按需加载插件
    // 协议专属配置（互不干扰）
    ...(isiOS || isHls 
      ? {
          hls: {
            retryCount: 3,
            retryDelay: 1000,
            loadTimeout: 10000,
            lowLatency: true // HLS 低延迟优化
          }
        }
      : {
          flvConfig: {
            lowLatency: true,
            maxBufferLength: 1000,
            maxBufferSize: 1024 * 1024
          }
        })
  };
};

const initPlayer = () => {
  if (!playerRef.value) return;

  const playerConfig = getPlayerConfig();
  player = new Player(playerConfig);

  // 监听关键事件
  player.on('ready', () => {
    isLoading.value = false;
    playError.value = false;
  });

  player.on('error', (err) => {
    console.error(`直播错误（${playerConfig.url.includes('m3u8') ? 'HLS' : 'FLV'}）：`, err);
    isLoading.value = false;
    playError.value = true;
  });

  player.on('play', () => {
    isLoading.value = false;
  });

  // 核心修改5：用户点击后取消静音（提升体验）
  playerRef.value.addEventListener('click', () => {
    if (player.muted()) {
      player.muted(false);
    }
  }, { once: true });
};

const reloadPlayer = () => {
  playError.value = false;
  isLoading.value = true;
  if (player) {
    player.destroy(); // 先销毁旧实例
  }
  initPlayer(); // 重新初始化
};

onMounted(() => {
  initPlayer();
});

onUnmounted(() => {
  if (player) {
    player.destroy();
    player = null;
  }
});

defineExpose({
  reloadPlayer,
});
</script>

<style scoped>
.live-player-wrapper {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.xg-player-container {
  width: 100%;
  height: 540px;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer; /* 提示可点击取消静音 */
}

.loading-tip, .error-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 16px;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 4px;
}

.error-tip {
  cursor: pointer;
}

.error-tip:hover {
  background: rgba(0, 0, 0, 0.7);
}
</style>