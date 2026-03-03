<template>
  <div class="flv-player-wrapper">
    <!-- 视频容器 -->
    <video
      ref="videoRef"
      class="flv-player"
      controls
      :muted="muted"
      :autoplay="autoplay"
      playsinline
      @click="togglePlay"
    ></video>

    <!-- 状态提示 -->
    <div v-if="isLoading" class="player-tip loading-tip">加载中...</div>
    <div v-if="playError" class="player-tip error-tip" @click="reloadPlayer">
      播放失败，点击重试
    </div>

    <!-- 播放控制（可选） -->
    <div class="player-controls" v-show="!isFullscreen">
      <button @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</button>
      <button @click="toggleMute">{{ muted ? '取消静音' : '静音' }}</button>
      <button @click="toggleFullscreen">全屏</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
// 动态导入 flv.js（避免打包体积过大）
let flvjs = null;
import('flv.js').then(module => {
  flvjs = module.default;
});

// 基础配置 props（可通过父组件传入）
const props = defineProps({
  // FLV 地址（远程流/本地文件路径）
  url: {
    type: String,
    required: true,
    default: ''
  },
  // 是否自动播放
  autoplay: {
    type: Boolean,
    default: true
  },
  // 是否静音
  muted: {
    type: Boolean,
    default: true
  },
  // 是否为直播流
  isLive: {
    type: Boolean,
    default: true
  },
  // 播放器宽高
  width: {
    type: [String, Number],
    default: '100%'
  },
  height: {
    type: [String, Number],
    default: 540
  }
});

// 响应式数据
const videoRef = ref(null); // video 元素 Ref
const flvPlayer = ref(null); // flv.js 实例
const isLoading = ref(true); // 加载状态
const playError = ref(false); // 播放错误
const isPlaying = ref(false); // 播放状态
const isFullscreen = ref(false); // 全屏状态

// 初始化播放器
const initPlayer = async () => {
  try {
    // 重置状态
    isLoading.value = true;
    playError.value = false;
    isPlaying.value = false;

    // 等待 flv.js 加载完成 + video 元素渲染
    await nextTick();
    if (!flvjs || !videoRef.value || !props.url) return;

    // 检查浏览器是否支持
    if (!flvjs.isSupported()) {
      throw new Error('当前浏览器不支持 flv.js');
    }

    // 销毁旧实例（避免内存泄漏）
    if (flvPlayer.value) {
      flvPlayer.value.destroy();
      flvPlayer.value = null;
    }

    // 创建 flv.js 实例
    flvPlayer.value = flvjs.createPlayer(
      {
        type: 'flv',
        url: props.url,
        isLive: props.isLive, // 直播流关键配置
        hasAudio: true, // 是否有音频
        hasVideo: true, // 是否有视频
        enableStashBuffer: !props.isLive, // 直播关闭缓存，点播开启
        stashInitialSize: 128 // 缓存大小（点播用）
      },
      {
        enableWorker: true, // 启用 Web Worker
        enableStashBuffer: false, // 直播关闭缓存降低延迟
        autoCleanupSourceBuffer: true, // 自动清理缓存
        maxBufferLength: 1, // 最大缓冲长度（直播设1秒）
        lazyLoad: false, // 直播禁用懒加载
        lazyLoadMaxDuration: 3,
        lazyLoadRecoverDuration: 1,
        deferLoadAfterSourceOpen: 0
      }
    );

    // 绑定到 video 元素
    flvPlayer.value.attachMediaElement(videoRef.value);

    // 监听事件
    flvPlayer.value.on('start', () => {
      isLoading.value = false;
      isPlaying.value = true;
    });
    flvPlayer.value.on('playing', () => {
      isLoading.value = false;
      isPlaying.value = true;
    });
    flvPlayer.value.on('pause', () => {
      isPlaying.value = false;
    });
    flvPlayer.value.on('error', (err) => {
      console.error('FLV 播放错误:', err);
      isLoading.value = false;
      playError.value = true;
      isPlaying.value = false;
    });
    flvPlayer.value.on('ended', () => {
      isPlaying.value = false;
    });

    // 加载并播放
    await flvPlayer.value.load();
    if (props.autoplay) {
      flvPlayer.value.play().catch(err => {
        console.warn('自动播放失败（浏览器限制）:', err);
        isLoading.value = false;
      });
    }
  } catch (err) {
    console.error('初始化 FLV 播放器失败:', err);
    isLoading.value = false;
    playError.value = true;
  }
};

// 播放/暂停切换
const togglePlay = () => {
  if (!flvPlayer.value) return;
  if (isPlaying.value) {
    flvPlayer.value.pause();
  } else {
    flvPlayer.value.play().catch(err => {
      console.warn('播放失败:', err);
    });
  }
};

// 静音切换
const toggleMute = () => {
  if (!videoRef.value) return;
  videoRef.value.muted = !videoRef.value.muted;
  emit('update:muted', videoRef.value.muted);
};

// 全屏切换
const toggleFullscreen = () => {
  if (!videoRef.value) return;
  if (isFullscreen.value) {
    // 退出全屏
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  } else {
    // 进入全屏
    if (videoRef.value.requestFullscreen) {
      videoRef.value.requestFullscreen();
    } else if (videoRef.value.webkitRequestFullscreen) {
      videoRef.value.webkitRequestFullscreen();
    } else if (videoRef.value.msRequestFullscreen) {
      videoRef.value.msRequestFullscreen();
    }
  }
};

// 重新加载播放器
const reloadPlayer = () => {
  initPlayer();
};

// 监听全屏状态变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

// 监听 url 变化，重新加载
watch(
  () => props.url,
  () => {
    initPlayer();
  },
  { immediate: true }
);

// 生命周期：挂载初始化
onMounted(() => {
  // 监听全屏事件
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('msfullscreenchange', handleFullscreenChange);
  
  // 初始化播放器
  initPlayer();
});

// 生命周期：卸载销毁
onUnmounted(() => {
  // 移除事件监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('msfullscreenchange', handleFullscreenChange);
  
  // 销毁 flv.js 实例
  if (flvPlayer.value) {
    flvPlayer.value.destroy();
    flvPlayer.value = null;
  }
});

// 暴露方法给父组件
defineExpose({
  initPlayer,
  reloadPlayer,
  togglePlay,
  toggleMute
});

// 双向绑定 muted
const emit = defineEmits(['update:muted']);
</script>

<style scoped>
.flv-player-wrapper {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.flv-player {
  width: v-bind(width);
  height: v-bind(height);
  background-color: #000;
  border-radius: 8px;
  outline: none;
}

.player-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 16px;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.error-tip:hover {
  background: rgba(0, 0, 0, 0.8);
}

.player-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
}

.player-controls button {
  color: #fff;
  background: transparent;
  border: 1px solid #fff;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.player-controls button:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 适配移动端 */
@media (max-width: 768px) {
  .flv-player {
    height: 300px;
  }
  .player-controls {
    bottom: 10px;
    font-size: 12px;
  }
}
</style>