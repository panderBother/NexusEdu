<script setup lang="ts">
import { ref ,onMounted, onUnmounted,nextTick} from 'vue'
import {useStreamStore} from "@/stores/index"
const store = useStreamStore()
const videoPlayer = ref<HTMLVideoElement|null>(null)
// 播放控制
const isPlaying = ref(false)
// 全屏切换
const isFullscreen=ref(false)
// 音量控制
const volume = ref(0.5)
// 当前播放时长
const currentTime=ref(0)
// 视频总时长
const duration=ref(0)
// 弹幕相关
const danmakuEnabled = ref(true)
const danmakuText = ref('')
const danmakuColor = ref('#ffffff')
const danmakuSize = ref<'small'|'medium'|'large'>('medium')
const danmakuPosition = ref<'top'|'middle'|'bottom'>('middle')
const danmakuList = ref<Array<any>>([
  [
    { content: '第一个弹幕', x: 800, y: 50, speed: 2 },
    { content: 'Canvas渲染弹幕', x: 800, y: 100, speed: 1.5 },
    { content: '60帧流畅滚动', x: 800, y: 150, speed: 2.5 }
  ]
])
let ctx:any;
const danmakuCanvasRef = ref<HTMLCanvasElement|null>(null)
nextTick(()=>{
  console.log(danmakuCanvasRef.value,document.getElementById('danmakuCanvas'))
  ctx=danmakuCanvasRef.value?.getContext('2d')
})
const render = ()=>{ 
  console.log('render',ctx)
  // 清空画布
  ctx?.clearRect(0, 0, danmakuCanvasRef.value!.width, danmakuCanvasRef.value!.height)
  danmakuList.value.forEach((item) => { 
    item.x-=item.speed
    // 超出屏幕范围则删除(这里先重置到右侧)
    if (item.x + ctx?.measureText(item.content).width<0){
      item.x=danmakuCanvasRef.value!.width
    }
  });
  danmakuList.value.forEach((item) => { 
    // 绘制弹幕
    ctx!.font='14px Arial'
    ctx!.fillStyle = '#fff'
    ctx!.lineWidth=2
    ctx!.strokeText(item.content, item.x, item.y)
    ctx!.fillText(item.content, item.x, item.y)

  });
  requestAnimationFrame(render)
}
// 存放计时器 id，用于清理
const danmakuTimers = new Map<string, number>()
const togglePlay = ()=>{
  if(videoPlayer.value!.paused){
    videoPlayer.value!.play()
    isPlaying.value=true
  }else{
    videoPlayer.value!.pause()
    isPlaying.value=false
  }
}
const props=defineProps({
  stream:MediaStream,
})
const toggleFullscreen = async ()=>{ 
  // 优先使用 video 元素；如果为空，尝试使用 .video-wrapper 容器
  const el = videoPlayer.value ?? document.querySelector('.video-player') as HTMLElement | null;
  if (!el) return;

  try {
    if (document.fullscreenElement) {
      // 只有在已有全屏时才调用 exitFullscreen，避免 "Document not active" 错误
      await document.exitFullscreen();
    } else {
      // 进入全屏，兼容各浏览器前缀
      if ((el as any).requestFullscreen) {
        await (el as any).requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        await (el as any).webkitRequestFullscreen();
      } else if ((el as any).msRequestFullscreen) {
        await (el as any).msRequestFullscreen();
      } else {
        console.warn('当前浏览器不支持 requestFullscreen');
      }
    }
  } catch (e) {
    // 捕获并打印异常，防止未捕获的 promise 错误
    console.warn('切换全屏失败', e);
  } finally {
    // 根据 document.fullscreenElement 更新状态（确保状态与实际一致）
    isFullscreen.value = !!document.fullscreenElement;
  }
}

  // 监听全屏状态变化（浏览器自带事件）
document.addEventListener('fullscreenchange', () => {
  isFullscreen.value = document.fullscreenElement !== null
})

// 发送弹幕
const sendDanmaku = () => {
  if (!danmakuText.value.trim() || !danmakuEnabled.value) return

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6)
  // 计算 top 值根据位置
  let topRange = {min: 10, max: 80} // 百分比
  if (danmakuPosition.value === 'top') topRange = {min: 6, max: 25}
  if (danmakuPosition.value === 'middle') topRange = {min: 30, max: 60}
  if (danmakuPosition.value === 'bottom') topRange = {min: 65, max: 90}

  const top = (Math.random() * (topRange.max - topRange.min) + topRange.min)

  const fontSize = danmakuSize.value === 'small' ? 14 : danmakuSize.value === 'medium' ? 18 : 24

  const durationSec = Math.max(6, 10 + danmakuText.value.length * 0.15)

  const item = {
    id,
    text: danmakuText.value,
    color: danmakuColor.value,
    size: fontSize,
    top,
    duration: durationSec
  }

  danmakuList.value.push(item)

  // 自动移除：在动画完成后移除
  const t = window.setTimeout(() => {
    const idx = danmakuList.value.findIndex(d => d.id === id)
    if (idx !== -1) danmakuList.value.splice(idx, 1)
    danmakuTimers.delete(id)
  }, durationSec * 1000 + 500)
  danmakuTimers.set(id, t)

  danmakuText.value = ''
}

onUnmounted(() => {
  // 清理弹幕计时器
  danmakuTimers.forEach((v) => clearTimeout(v))
  danmakuTimers.clear()
})
const updateVolume = (newVol:number)=>{
  if (!videoPlayer.value) return
  volume.value = Math.max(0, Math.min(1, newVol)) // 限制在0-1
  videoPlayer.value.volume = volume.value
}

// 格式化时间为 00:00
const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
onMounted(()=>{
  // 模拟实时添加弹幕
  setInterval(() => {
    danmakuList.value.push({
      content: `新弹幕${Date.now() % 100}`,
      x: danmakuCanvasRef.value!.width,
      y: Math.random() * 300 + 50,
      speed: Math.random() * 2 + 1
    });
  }, 1000);
  console.log('播放',store.remoteStream)
  if(store.remoteStream)
  videoPlayer.value!.srcObject=store.remoteStream
   if(props.stream){
    console.log('播放',props.stream)
    videoPlayer.value!.srcObject=props.stream
    console.log('video',videoPlayer.value)
   }
   requestAnimationFrame(render);
  //  监听视频元数据加载完成,获取视频总时长
   videoPlayer.value?.addEventListener('loadedmetadata', ()=>{
    duration.value=videoPlayer.value!.duration
   })
  //  监听播放进度
   videoPlayer.value?.addEventListener('timeupdate', ()=>{
    currentTime.value=videoPlayer.value!.currentTime
  })
  // 播放
  videoPlayer.value?.addEventListener('play', ()=>{
    isPlaying.value=true
  })
  // 暂停播放
  videoPlayer.value?.addEventListener('pause', ()=>{
    isPlaying.value=false
  })
})
</script>
<template>
  <div class="live-player-container">
    <!-- 视频播放器主体 -->
    <div class="video-wrapper">
        <!-- 弹幕层 -->
       <!-- <canvas ref="danmakuCanvasRef" id="danmakuCanvas"></canvas> -->
      
      <video ref="videoPlayer"class="video-player" autoplay></video>
    
      <!-- 科幻边框装饰 -->
      <div class="corner corner-tl"></div>
      <div class="corner corner-tr"></div>
      <div class="corner corner-bl"></div>
      <div class="corner corner-br"></div>
      
      <!-- 扫描线效果 -->
      <div class="scan-line" v-if="!store.remoteStream"></div>
      
      <!-- 全息网格覆盖层 -->
      <div class="hologram-grid" v-if="props.stream || !store.remoteStream"></div>
      
      <!-- 状态标签 -->
      <div class="live-badge">
        <span class="pulse-dot"></span>
        <span class="live-text">LIVEING</span>
      </div>
      
      <!-- 观看人数 -->
      <div class="viewer-count">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
        <span class="count">12.5K</span>
      </div>
      
      <!-- 控制栏 -->
      <div class="control-bar">
        <button class="control-btn play-btn" @click="togglePlay">
           <svg viewBox="0 0 24 24">
            <!-- 根据播放状态切换图标 -->
            <path d="M8 5v14l11-7z" v-if="!isPlaying"/>
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" v-else/>
          </svg>
        </button>
        
       <!-- 音量控制：绑定滑块点击事件 -->
        <div class="volume-control">
          <button class="control-btn volume-btn">
            <svg viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
          </button>
          <div class="volume-slider" @click="(e) => {
            const rect = (e.currentTarget as HTMLElement)!.getBoundingClientRect()
            const newVol = (e.clientX - rect.left) / rect.width
            updateVolume(newVol)
          }">
            <div class="slider-track"></div>
            <div class="slider-fill" :style="{ width: `${volume * 100}%` }"></div>
            <div class="slider-thumb" :style="{ left: `${volume * 100}%` }"></div>
          </div>
        </div>
       
        
        <!-- 时间显示：绑定格式化后的时间 -->
        <div class="time-display">
          <span class="current-time">{{ formatTime(currentTime) }}</span>
          <span class="separator">/</span>
          <span class="duration">{{ formatTime(duration) }}</span>
        </div>
        
        <div class="spacer"></div>
        
        <button class="control-btn quality-btn">
          <span class="quality-text">1080P</span>
        </button>
        
        <button class="control-btn settings-btn">
          <svg viewBox="0 0 24 24">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
        </button>
        
        <!-- 弹幕输入与控制 -->
        <div class="danmaku-controls">
          <input
            class="danmaku-input"
            v-model="danmakuText"
            placeholder="发送弹幕..."
            @keyup.enter="sendDanmaku"
          />
          <input type="color" v-model="danmakuColor" class="danmaku-color" title="弹幕颜色" />
          <select v-model="danmakuSize" class="danmaku-size" title="字号">
            <option value="small">小</option>
            <option value="medium">中</option>
            <option value="large">大</option>
          </select>
          <select v-model="danmakuPosition" class="danmaku-pos" title="位置">
            <option value="top">上</option>
            <option value="middle">中</option>
            <option value="bottom">下</option>
          </select>
          <button class="control-btn danmaku-send" @click="sendDanmaku">发弹幕</button>
          <label class="danmaku-toggle"><input type="checkbox" v-model="danmakuEnabled" /> 弹幕</label>
        </div>

        <!-- 全屏按钮：绑定事件 -->
        <button class="control-btn fullscreen-btn" @click="toggleFullscreen">
          <svg viewBox="0 0 24 24">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" v-if="!isFullscreen"/>
            <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" v-else/>
          </svg>
        </button>
      </div>
      
      <!-- 数据流可视化 -->
      <div class="data-stream data-stream-left"></div>
      <div class="data-stream data-stream-right"></div>
    </div>
  </div>
</template>

<style scoped>
.live-player-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
}

.video-player {
  width: 100%;
  height: 90%;
  object-fit: contain;
  /* position: relative; */
  z-index: 1;
}
#danmakuCanvas{
  position: absolute;
  top: 0;
  left: 0;
  bottom: 10%;
  width: 100%;
  height: 90%;
  pointer-events: none; /* 允许鼠标穿透操作视频 */
}

/* 科幻边角装饰 */
.corner {
  position: absolute;
  width: 40px;
  height: 40px;
  z-index: 10;
}

.corner::before,
.corner::after {
  content: '';
  position: absolute;
  background: linear-gradient(45deg, #00f7ff, #00d4ff);
  box-shadow: 0 0 10px #00f7ff;
}

.corner-tl {
  top: 0;
  left: 0;
}

.corner-tl::before {
  top: 0;
  left: 0;
  width: 30px;
  height: 2px;
}

.corner-tl::after {
  top: 0;
  left: 0;
  width: 2px;
  height: 30px;
}

.corner-tr {
  top: 0;
  right: 0;
}

.corner-tr::before {
  top: 0;
  right: 0;
  width: 30px;
  height: 2px;
}

.corner-tr::after {
  top: 0;
  right: 0;
  width: 2px;
  height: 30px;
}

.corner-bl {
  bottom: 60px;
  left: 0;
}

.corner-bl::before {
  bottom: 0;
  left: 0;
  width: 30px;
  height: 2px;
}

.corner-bl::after {
  bottom: 0;
  left: 0;
  width: 2px;
  height: 30px;
}

.corner-br {
  bottom: 60px;
  right: 0;
}

.corner-br::before {
  bottom: 0;
  right: 0;
  width: 30px;
  height: 2px;
}

.corner-br::after {
  bottom: 0;
  right: 0;
  width: 2px;
  height: 30px;
}

/* 扫描线效果 */
.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00f7ff, transparent);
  box-shadow: 0 0 10px #00f7ff;
  animation: scan 3s linear infinite;
  z-index: 5;
  opacity: 0.3;
}

@keyframes scan {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(calc(100vh - 60px));
  }
}

/* 全息网格 */
.hologram-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(0deg, rgba(0, 247, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 247, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  z-index: 2;
  pointer-events: none;
}

/* 弹幕样式 */
.danmaku-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 20;
}
.danmaku-item {
  position: absolute;
  white-space: nowrap;
  transform: translateX(100%);
  animation-name: danmaku-move;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  text-shadow: 0 0 6px rgba(0,0,0,0.6);
}
@keyframes danmaku-move {
  from { transform: translateX(100%); }
  to { transform: translateX(-120%); }
}

.danmaku-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}
.danmaku-input {
  width: 220px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.4);
  color: #fff;
}
.danmaku-color { width: 36px; height: 28px; padding: 0; border: none; background: transparent; }
.danmaku-size, .danmaku-pos { padding: 6px 8px; border-radius: 6px; background: rgba(0,0,0,0.4); color: #fff; border: 1px solid rgba(255,255,255,0.08); }
.danmaku-send { padding: 6px 10px; }
.danmaku-toggle { color: #fff; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; }

/* 直播标签 */
.live-badge {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 0, 80, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 0, 80, 0.5);
  border-radius: 20px;
  padding: 6px 16px;
  z-index: 10;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #ff0050;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 10px #ff0050;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}

.live-text {
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(255, 0, 80, 0.8);
}

/* 观看人数 */
.viewer-count {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 247, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 20px;
  padding: 6px 16px;
  z-index: 10;
}

.viewer-count .icon {
  width: 18px;
  height: 18px;
  fill: #00f7ff;
  filter: drop-shadow(0 0 5px #00f7ff);
}

.viewer-count .count {
  color: #00f7ff;
  font-weight: 600;
  font-size: 14px;
  text-shadow: 0 0 10px rgba(0, 247, 255, 0.8);
}

/* 控制栏 */
.control-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 10%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
  z-index: 10;
  border-top: 1px solid rgba(0, 247, 255, 0.2);
}

.control-btn {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn svg {
  width: 24px;
  height: 24px;
  fill: #fff;
  filter: drop-shadow(0 0 5px rgba(0, 247, 255, 0.5));
}

.control-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: scale(1.1);
}

.control-btn:hover svg {
  fill: #00f7ff;
  filter: drop-shadow(0 0 10px #00f7ff);
}

/* 音量控制 */
.volume-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.volume-slider {
  position: relative;
  width: 80px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  cursor: pointer;
}

.slider-track {
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.slider-fill {
  position: absolute;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, #00f7ff, #00d4ff);
  border-radius: 2px;
  box-shadow: 0 0 10px rgba(0, 247, 255, 0.5);
}

.slider-thumb {
  position: absolute;
  left: 60%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: #00f7ff;
  border-radius: 50%;
  box-shadow: 0 0 10px #00f7ff;
  cursor: pointer;
}

/* 时间显示 */
.time-display {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 10px rgba(0, 247, 255, 0.5);
}

.separator {
  opacity: 0.5;
}

.spacer {
  flex: 1;
}

/* 画质按钮 */
.quality-text {
  color: #00f7ff;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(0, 247, 255, 0.8);
}

/* 数据流效果 */
.data-stream {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  z-index: 3;
  pointer-events: none;
}

.data-stream::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100px;
  background: linear-gradient(to bottom, transparent, #00f7ff, transparent);
  animation: dataFlow 2s linear infinite;
  box-shadow: 0 0 10px #00f7ff;
}

.data-stream-left {
  left: 10px;
}

.data-stream-right {
  right: 10px;
}

.data-stream-right::before {
  animation-delay: 1s;
}

@keyframes dataFlow {
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(calc(100% + 100px));
    opacity: 0;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .corner {
    width: 30px;
    height: 30px;
  }
  
  .corner::before {
    width: 20px !important;
  }
  
  .corner::after {
    height: 20px !important;
  }
  
  .control-bar {
    padding: 0 10px;
    gap: 8px;
  }
  
  .volume-slider {
    width: 60px;
  }
  
  .time-display {
    font-size: 12px;
  }
}
</style>
