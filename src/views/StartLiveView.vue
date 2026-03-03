<template>
  <div class="start-live-page">
    <!-- 顶部导航 -->
    <header class="page-header">
      <button class="back-btn" @click="$router.back()">
        <svg viewBox="0 0 24 24">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button>
      <h1 class="page-title">{{ isBroadcasting?'直播中...':'开始直播'}}</h1>
      <div class="header-spacer"></div>
    </header>

    <div class="page-content">
      <!-- 预览区域 -->
      <div class="preview-section">
        <div class="camera-preview">
          <video ref="cameraPreview" class="preview-video" autoplay muted></video>
          
          <!-- 科幻边框 -->
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>
          
          <!-- 扫描线 -->
          <div class="scan-effect"></div>
          
          <div class="preview-overlay">
            <div class="camera-status">
              <div class="status-dot"></div>
              <span>摄像头预览</span>
            </div>
          </div>
          
          <!-- 摄像头控制 -->
          <div class="camera-controls">
            <button class="control-btn" @click="closeCamera">
              <svg viewBox="0 0 24 24" v-show='isCamera'>
                <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
              </svg>
              <svg t="1764157990633" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="13502" v-show="!isCamera">
                <path d="M51.2 190.72l55.456-54.176 746.656 747.52-54.176 54.624-85.344-85.344H170.656A85.344 85.344 0 0 1 85.312 768V256c0-9.376 1.696-18.336 4.256-26.88l-38.4-38.4m247.488-20.064L384 85.312h256l85.344 85.344h128A85.344 85.344 0 0 1 938.688 256v512c0 25.6-11.104 48.224-29.024 64l-212.896-213.344A209.92 209.92 0 0 0 725.344 512 213.344 213.344 0 0 0 512 298.656a209.92 209.92 0 0 0-106.656 28.576L248.32 170.656h50.336m0 341.344A213.344 213.344 0 0 0 512 725.344c21.344 0 43.936-3.424 64-9.824L500.064 640a130.944 130.944 0 0 1-116-115.456L384 523.968l-75.52-75.936a215.552 215.552 0 0 0-9.824 64M512 384a128 128 0 0 1 128 128v0.192c0 15.232-2.656 29.824-7.52 43.36l0.288-0.896-163.424-163.424a125.216 125.216 0 0 1 42.464-7.264H512z" p-id="13503"></path>
              </svg>
            </button>
            <button class="control-btn" @click="closeAudio">
              <svg viewBox="0 0 24 24" v-show="isAudio">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
              <svg t="1764159709397" class="icon" viewBox="0 0 1024 1024"  p-id="17826" v-show="!isAudio">
                <path d="M678.613333 466.261333L350.165333 219.946667C367.786667 145.749333 432.64 89.386667 512 89.386667c93.312 0 166.613333 78.08 166.613333 171.349333v205.525333zM512 678.613333c-90.666667 0-162.432-73.685333-166.4-163.413333l210.005333 157.525333c-13.866667 3.84-28.458667 5.888-43.605333 5.888z" fill="#62696A" p-id="17827"></path><path d="M620.202667 721.152a250.88 250.88 0 0 1-359.168-226.432 38.613333 38.613333 0 1 0-77.184 0 328.192 328.192 0 0 0 289.536 325.888V938.666667a38.613333 38.613333 0 0 0 77.226666 0v-118.058667a326.144 326.144 0 0 0 137.173334-48.768l-67.584-50.688zM760.746667 527.914667l68.394666 51.285333a328.533333 328.533333 0 0 0 10.965334-84.48 38.613333 38.613333 0 1 0-77.226667 0c0 11.264-0.725333 22.314667-2.133333 33.152zM187.733333 187.733333A42.666667 42.666667 0 1 0 136.533333 256L853.333333 793.6a42.666667 42.666667 0 1 0 51.2-68.266667L187.733333 187.733333z" fill="#62696A" p-id="17828"></path>
              </svg>
            </button>
            <button class="control-btn flip-btn">
              <svg viewBox="0 0 24 24">
                <path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 直播设置 -->
      <div class="settings-section">
        <!-- 直播标题 -->
        <div class="form-group">
          <label class="form-label">
            <svg viewBox="0 0 24 24">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            直播标题
          </label>
          <input 
            type="text" 
            class="form-input" 
            placeholder="给你的直播起个吸引人的标题..." 
            maxlength="50"
          />
          <div class="input-hint">0/50</div>
        </div>

        <!-- 分类选择 -->
        <div class="form-group">
          <label class="form-label">
            <svg viewBox="0 0 24 24">
              <path d="M12 2l-5.5 9h11z"/>
              <circle cx="17.5" cy="17.5" r="4.5"/>
              <path d="M3 13.5h8v8H3z"/>
            </svg>
            直播分类
          </label>
          <div class="category-grid">
            <button class="category-btn active">
              <span class="category-icon">🎮</span>
              <span class="category-name">游戏</span>
            </button>
            <button class="category-btn">
              <span class="category-icon">💻</span>
              <span class="category-name">科技</span>
            </button>
            <button class="category-btn">
              <span class="category-icon">🎵</span>
              <span class="category-name">音乐</span>
            </button>
            <button class="category-btn">
              <span class="category-icon">🎨</span>
              <span class="category-name">创作</span>
            </button>
            <button class="category-btn">
              <span class="category-icon">📱</span>
              <span class="category-name">生活</span>
            </button>
            <button class="category-btn">
              <span class="category-icon">🎭</span>
              <span class="category-name">娱乐</span>
            </button>
          </div>
        </div>

        <!-- 直播画质 -->
        <div class="form-group">
          <label class="form-label">
            <svg viewBox="0 0 24 24">
              <path d="M21 3H3c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.11-.9-2-2-2zm0 14H3V5h18v12z"/>
            </svg>
            画质设置
          </label>
          <div class="quality-options">
            <button class="quality-btn">
              <span class="quality-label">流畅</span>
              <span class="quality-desc">480P</span>
            </button>
            <button class="quality-btn">
              <span class="quality-label">高清</span>
              <span class="quality-desc">720P</span>
            </button>
            <button class="quality-btn active">
              <span class="quality-label">超清</span>
              <span class="quality-desc">1080P</span>
            </button>
            <button class="quality-btn">
              <span class="quality-label">蓝光</span>
              <span class="quality-desc">4K</span>
            </button>
          </div>
        </div>

        <!-- 封面设置 -->
        <div class="form-group">
          <label class="form-label">
            <svg viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
            直播封面
          </label>
          <div class="cover-upload">
            <div class="upload-area">
              <svg viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              <p>点击上传封面</p>
              <span class="upload-hint">建议16:9，不超过5MB</span>
            </div>
          </div>
        </div>

        <!-- 隐私设置 -->
        <div class="form-group">
          <label class="form-label">
            <svg viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
            隐私设置
          </label>
          <div class="privacy-options">
            <label class="checkbox-item">
              <input type="checkbox" checked />
              <span class="checkbox-label">允许弹幕</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" checked />
              <span class="checkbox-label">允许礼物</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" />
              <span class="checkbox-label">仅粉丝可见</span>
            </label>
          </div>
        </div>

        <!-- 开播按钮 -->
        <button class="start-live-btn" @click="startLive" @disabled="isBroadcasting">
          <span class="btn-icon">
            <svg viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </span>
          <span class="btn-text">{{ isBroadcasting?'直播中...':'开始直播'}}</span>
          <div class="btn-glow"></div>
        </button>

        <!-- 直播提示 -->
        <div class="live-tips">
          <div class="tip-title">直播提示</div>
          <ul class="tip-list">
            <li>确保网络连接稳定，建议使用Wi-Fi</li>
            <li>保持良好的直播环境和画面质量</li>
            <li>遵守社区规范，不发布违规内容</li>
            <li>积极与观众互动，提升直播人气</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref,onMounted } from 'vue'
import { WebRTCService } from '@/services/WebRTCService';
import { useRouter } from 'vue-router';
import  {useStreamStore}  from '@/stores/index';
const cameraPreview=ref<HTMLVideoElement | null>(null);
const localStream=ref<MediaStream | null>(null);
const isPreviewReady = ref(false);
const isBroadcasting = ref(false);
const isCamera = ref(true)
const isAudio=ref(true)
const SRS_HOST='http://101.35.16.42:1985';
const APP ='live'
let STREAM_ID = 'stream1';
const rtc=new WebRTCService(SRS_HOST);
const router=useRouter()
const streamStore=useStreamStore()
const startLive = async () =>{
  if(isBroadcasting.value)return;
  isBroadcasting.value=true;
  const ok=await initStream()
  if(!ok||!localStream.value){
    console.log('无法获取媒体流')
    isBroadcasting.value=false
    return
  }
  await rtc.addLocalStream(localStream.value);
  streamStore.setRemoteStream(localStream.value)
  const published=await rtc.publishToSRS(APP,STREAM_ID)
  if(!published){
    isBroadcasting.value=false
    console.log("推流失败，请检查SRS配置和浏览器日志")
  }
  isBroadcasting.value=true;
  router.push('/player')
  console.log('开始直播')
  if(cameraPreview.value) cameraPreview.value.muted=false
}
const closeCamera = async ()=>{
 isCamera.value=!isCamera.value
 const stream=await navigator.mediaDevices.getUserMedia({video:isCamera.value,audio:isAudio.value});
 localStream.value=stream
 if(cameraPreview.value)
 cameraPreview.value.srcObject=stream;
}
const closeAudio = async ()=>{
 isAudio.value=!isAudio.value
 const stream=await navigator.mediaDevices.getUserMedia({video:isCamera.value,audio:isAudio.value});
 localStream.value=stream
 if(cameraPreview.value)
 cameraPreview.value.srcObject=stream;
}
const initStream = async () : Promise<boolean> =>{
  try {
     if(localStream.value){
  if(cameraPreview.value){
    cameraPreview.value.srcObject=localStream.value;
    // 尝试播放（浏览器可能因为没有用户的交互而拒接）
    await cameraPreview.value.play().catch(()=>{console.error('播放失败')})
  }
  isPreviewReady.value=true;
  return true
 }
 const stream=await navigator.mediaDevices.getUserMedia({video:isCamera.value,audio:isAudio.value});
    // const stream=await navigator.mediaDevices.getDisplayMedia();
 localStream.value=stream
 if(cameraPreview.value){
  cameraPreview.value.srcObject=stream;
  // 尝试播放（浏览器可能因为没有用户的交互而拒接）
    await cameraPreview.value.play().catch(()=>{console.error('播放失败')})
 }
 isPreviewReady.value=true;
 return true
  } catch (error) {
    console.log('获取流媒体失败',error)
    isPreviewReady.value=false;
    return false;
  }
}
onMounted(()=>{
initStream()
})
</script>

<style scoped>
.start-live-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #16213e 50%, #0a0e27 100%);
  color: #fff;
}

/* 顶部导航 */
.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10, 14, 39, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 247, 255, 0.2);
  padding: 16px 32px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: #00f7ff;
}

.back-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: translateX(-3px);
}

.page-title {
  font-size: 24px;
  font-weight: 900;
  background: linear-gradient(135deg, #fff, #00f7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-spacer {
  flex: 1;
}

/* 页面内容 */
.page-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
  display: grid;
  grid-template-columns: 1fr 500px;
  gap: 32px;
}

/* 预览区域 */
.preview-section {
  position: sticky;
  top: 100px;
  height: fit-content;
}

.camera-preview {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 247, 255, 0.3);
}

.preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 科幻边框 */
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
  bottom: 0;
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
  bottom: 0;
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

/* 扫描效果 */
.scan-effect {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00f7ff, transparent);
  box-shadow: 0 0 10px #00f7ff;
  animation: scan 3s linear infinite;
  z-index: 5;
  opacity: 0.5;
}

@keyframes scan {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(500px);
  }
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
}

.camera-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #0f0;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 10px #0f0;
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

.camera-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
}

.control-btn {
  width: 50px;
  height: 50px;
  background: rgba(0, 247, 255, 0.2);
  border: 2px solid rgba(0, 247, 255, 0.5);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.control-btn svg {
  width: 24px;
  height: 24px;
  fill: #00f7ff;
}

.control-btn:hover {
  background: rgba(0, 247, 255, 0.3);
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(0, 247, 255, 0.5);
}

/* 设置区域 */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #00f7ff;
  margin-bottom: 16px;
}

.form-label svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.form-input {
  width: 100%;
  padding: 14px 18px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: all 0.3s ease;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.form-input:focus {
  border-color: #00f7ff;
  box-shadow: 0 0 20px rgba(0, 247, 255, 0.2);
}

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
}

/* 分类网格 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 247, 255, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-btn:hover,
.category-btn.active {
  border-color: #00f7ff;
  background: rgba(0, 247, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 247, 255, 0.2);
}

.category-icon {
  font-size: 32px;
}

.category-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

/* 画质选项 */
.quality-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quality-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 247, 255, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.quality-btn:hover,
.quality-btn.active {
  border-color: #00f7ff;
  background: rgba(0, 247, 255, 0.1);
}

.quality-label {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.quality-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

/* 封面上传 */
.cover-upload {
  width: 100%;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px dashed rgba(0, 247, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: #00f7ff;
  background: rgba(0, 247, 255, 0.05);
}

.upload-area svg {
  width: 48px;
  height: 48px;
  fill: #00f7ff;
}

.upload-area p {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.upload-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* 隐私选项 */
.privacy-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #00f7ff;
}

.checkbox-label {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
}

/* 开播按钮 */
.start-live-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, #ff0050, #ff4d4d);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 18px;
  font-weight: 900;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(255, 0, 80, 0.4);
}

.start-live-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(255, 0, 80, 0.6);
}

.btn-icon svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.btn-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transform: translateX(-100%);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  to {
    transform: translateX(100%);
  }
}

/* 直播提示 */
.live-tips {
  background: rgba(0, 247, 255, 0.05);
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
}

.tip-title {
  font-size: 15px;
  font-weight: 700;
  color: #00f7ff;
  margin-bottom: 12px;
}

.tip-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-list li {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  padding-left: 20px;
  position: relative;
}

.tip-list li::before {
  content: '▸';
  position: absolute;
  left: 0;
  color: #00f7ff;
}

/* 响应式 */
@media (max-width: 1024px) {
  .page-content {
    grid-template-columns: 1fr;
  }
  
  .preview-section {
    position: relative;
    top: 0;
  }
}

@media (max-width: 768px) {
  .category-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quality-options {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
