<script setup lang="ts">
import LiveStreamPlayer from './LiveStreamPlayer.vue';
import { WebRTCService } from '@/services/WebRTCService';
import { ref, onMounted } from 'vue';

const stream = ref<MediaStream|null>(null)
const videoPlayer = ref<HTMLVideoElement|null>(null)
const isPlaying = ref(false)
const isLoading = ref(false)

const initStream = async () => {
  const rtc = new WebRTCService();
  const res = await rtc.playFromSRS()
  stream.value = res
  videoPlayer.value!.srcObject = stream.value
}

const initHLSStream = async () => {
  if (isLoading.value || isPlaying.value) return;
  
  try {
    isLoading.value = true;
    console.log('用户点击播放，开始加载流...');
    console.log(videoPlayer.value)
    
    const rtc = new WebRTCService('http://101.35.16.42:8080');
    const res = await rtc.playFLVSRS('live', 'stream1', videoPlayer.value as HTMLVideoElement)
    console.log('播放结果:', res)
    
    if (res) {
      isPlaying.value = true;
    }
  } catch (error) {
    console.error('播放失败:', error);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  console.log('页面加载完成，等待用户点击播放');
})
</script>

<template>
  <div class="live-stream-page">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-content">
        <div class="logo-section">
          <div class="logo-icon">
            <div class="cyber-ring"></div>
            <div class="cyber-core"></div>
          </div>
          <h1 class="logo-text">CYBER<span class="highlight">LIVE</span></h1>
        </div>
        
        <nav class="nav-menu">
          <a href="#" class="nav-link active">直播</a>
          <a href="#" class="nav-link">发现</a>
          <a href="#" class="nav-link">关注</a>
        </nav>
        
        <div class="header-actions">
          <button class="icon-btn search-btn">
            <svg viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
          <button class="icon-btn notification-btn">
            <svg viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            <span class="notification-badge">3</span>
          </button>
          <div class="user-avatar">
            <div class="avatar-ring"></div>
            <img src="https://i.pravatar.cc/150?img=1" alt="User" />
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-grid">
        <!-- 左侧主播信息 -->
        <aside class="streamer-sidebar">
          <div class="streamer-card">
            <div class="streamer-cover">
              <img src="https://i.pravatar.cc/300?img=2" alt="Streamer" />
              <div class="cyber-overlay"></div>
            </div>
            
            <div class="streamer-info">
              <h2 class="streamer-name">CyberStreamer_01</h2>
              <div class="streamer-status">
                <span class="status-dot"></span>
                <span class="status-text">在线直播中</span>
              </div>
              
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">12.5K</div>
                  <div class="stat-label">观众</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">358K</div>
                  <div class="stat-label">粉丝</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">4.2K</div>
                  <div class="stat-label">点赞</div>
                </div>
              </div>
              
              <button class="follow-btn">
                <span class="btn-icon">+</span>
                <span class="btn-text">关注</span>
                <div class="btn-glow"></div>
              </button>
              
              <div class="streamer-description">
                <p>欢迎来到未来世界！这里是最前沿的科技直播间，带你探索赛博空间的无限可能...</p>
              </div>
              
              <div class="social-links">
                <a href="#" class="social-link">
                  <svg viewBox="0 0 24 24">
                    <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                  </svg>
                </a>
                <a href="#" class="social-link">
                  <svg viewBox="0 0 24 24">
                    <path d="M22.46 6c-.85.38-1.78.64-2.75.76 1-.6 1.76-1.55 2.12-2.68-.93.55-1.96.95-3.06 1.17-.88-.94-2.13-1.53-3.51-1.53-2.66 0-4.81 2.16-4.81 4.81 0 .38.04.75.13 1.1-4-.2-7.54-2.12-9.91-5.04-.42.72-.66 1.55-.66 2.44 0 1.67.85 3.14 2.14 4-.79-.02-1.53-.24-2.18-.6v.06c0 2.33 1.66 4.28 3.86 4.72-.4.11-.83.17-1.27.17-.31 0-.62-.03-.92-.08.62 1.94 2.42 3.35 4.55 3.39-1.67 1.31-3.77 2.09-6.05 2.09-.39 0-.78-.02-1.17-.07 2.18 1.4 4.77 2.21 7.55 2.21 9.06 0 14.01-7.5 14.01-14.01 0-.21 0-.42-.02-.63.96-.7 1.8-1.56 2.46-2.55z"/>
                  </svg>
                </a>
                <a href="#" class="social-link">
                  <svg viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </aside>

        <!-- 中间视频播放器 -->
        <section class="video-section">
           <!-- <LiveStreamPlayer v-if="stream" :stream="stream as MediaStream" /> -->
          
          <div class="video-wrapper">
            <video ref="videoPlayer" class="video-player" muted></video>
            
            <!-- 播放按钮覆盖层 -->
            <div v-if="!isPlaying" class="play-overlay" @click="initHLSStream">
              <div class="play-button">
                <div v-if="isLoading" class="loading-spinner"></div>
                <svg v-else width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="38" fill="rgba(0,0,0,0.7)" stroke="#00f7ff" stroke-width="2"/>
                  <polygon points="30,20 30,60 60,40" fill="#00f7ff"/>
                </svg>
                <p v-if="!isLoading">点击开始播放</p>
                <p v-else>加载中...</p>
              </div>
            </div>
          </div>
          
          <div class="stream-info-panel">
            <h3 class="stream-title">【赛博朋克2077】探索夜之城的终极秘密 | 超高清4K直播</h3>
            
            <div class="stream-meta">
              <div class="meta-tags">
                <span class="tag">游戏</span>
                <span class="tag">赛博朋克</span>
                <span class="tag">4K</span>
              </div>
              
              <div class="meta-actions">
                <button class="action-btn">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span>25.6K</span>
                </button>
                <button class="action-btn">
                  <svg viewBox="0 0 24 24">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                  </svg>
                  <span>分享</span>
                </button>
                <button class="action-btn">
                  <svg viewBox="0 0 24 24">
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                  <span>收藏</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- 右侧聊天室 -->
        <aside class="chat-sidebar">
          <div class="chat-container">
            <div class="chat-header">
              <h3 class="chat-title">实时聊天</h3>
              <div class="chat-count">
                <span class="online-indicator"></span>
                <span>12.5K 在线</span>
              </div>
            </div>
            
            <div class="chat-messages">
              <div class="message-item">
                <div class="message-avatar">
                  <img src="https://i.pravatar.cc/150?img=3" alt="" />
                </div>
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-user">CyberUser_001</span>
                    <span class="message-badge vip">VIP</span>
                  </div>
                  <p class="message-text">这个画质太棒了！！！</p>
                </div>
              </div>
              
              <div class="message-item">
                <div class="message-avatar">
                  <img src="https://i.pravatar.cc/150?img=4" alt="" />
                </div>
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-user">NeonDreamer</span>
                  </div>
                  <p class="message-text">主播666，操作太强了</p>
                </div>
              </div>
              
              <div class="message-item">
                <div class="message-avatar">
                  <img src="https://i.pravatar.cc/150?img=5" alt="" />
                </div>
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-user">DigitalGhost</span>
                    <span class="message-badge mod">MOD</span>
                  </div>
                  <p class="message-text">欢迎新来的朋友们~</p>
                </div>
              </div>
              
              <div class="message-item system-message">
                <div class="system-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                  </svg>
                </div>
                <p class="system-text">QuantumKnight 赠送了超级火箭 x1</p>
              </div>
              
              <div class="message-item">
                <div class="message-avatar">
                  <img src="https://i.pravatar.cc/150?img=6" alt="" />
                </div>
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-user">MatrixRunner</span>
                  </div>
                  <p class="message-text">这个UI设计太科幻了，爱了！</p>
                </div>
              </div>
            </div>
            
            <div class="chat-input-panel">
              <div class="input-tools">
                <button class="tool-btn">
                  <svg viewBox="0 0 24 24">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM8.5 8c.83 0 1.5.67 1.5 1.5S9.33 11 8.5 11 7 10.33 7 9.5 7.67 8 8.5 8zM12 18c-2.28 0-4.22-1.66-5-4h10c-.78 2.34-2.72 4-5 4zm3.5-7c-.83 0-1.5-.67-1.5-1.5S14.67 8 15.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                  </svg>
                </button>
                <button class="tool-btn">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                </button>
                <button class="tool-btn">
                  <svg viewBox="0 0 24 24">
                    <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                  </svg>
                </button>
              </div>
              
              <div class="chat-input-wrapper">
                <input 
                  type="text" 
                  class="chat-input" 
                  placeholder="发送消息..." 
                />
                <button class="send-btn">
                  <svg viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.live-stream-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #16213e 50%, #0a0e27 100%);
  color: #fff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* 顶部导航栏 */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10, 14, 39, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 247, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.header-content {
  max-width: 1920px;
  margin: 0 auto;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}

/* Logo */
.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cyber-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid #00f7ff;
  border-radius: 50%;
  animation: rotate 10s linear infinite;
  box-shadow: 0 0 20px rgba(0, 247, 255, 0.5);
}

.cyber-core {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #00f7ff, #ff0080);
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(0, 247, 255, 0.8);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.logo-text {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #fff, #00f7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-text .highlight {
  color: #ff0080;
  -webkit-text-fill-color: #ff0080;
}

/* 导航菜单 */
.nav-menu {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 10px 24px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  border-radius: 8px;
  transition: all 0.3s ease;
  position: relative;
}

.nav-link::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #00f7ff, #ff0080);
  transition: width 0.3s ease;
}

.nav-link:hover,
.nav-link.active {
  color: #00f7ff;
  background: rgba(0, 247, 255, 0.1);
}

.nav-link.active::before {
  width: 60%;
}

/* 头部操作按钮 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  position: relative;
  width: 44px;
  height: 44px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn svg {
  width: 24px;
  height: 24px;
  fill: #00f7ff;
}

.icon-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  border-color: #00f7ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 247, 255, 0.3);
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #ff0080, #ff4d4d);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-shadow: 0 0 10px rgba(255, 0, 128, 0.8);
}

.user-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  cursor: pointer;
}

.avatar-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00f7ff, #ff0080);
  animation: rotate 3s linear infinite;
  z-index: -1;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #0a0e27;
}

/* 主内容区 */
.main-content {
  max-width: 1920px;
  margin: 0 auto;
  padding: 24px 32px;
}

.content-grid {
  display: grid;
  grid-template-columns: 280px 1fr 380px;
  gap: 24px;
}

/* 左侧主播信息 */
.streamer-sidebar {
  position: sticky;
  top: 100px;
  height: fit-content;
}

.streamer-card {
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.streamer-cover {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.streamer-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cyber-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent, rgba(10, 14, 39, 0.9));
}

.streamer-info {
  padding: 20px;
}

.streamer-name {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #fff, #00f7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.streamer-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #0f0;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 10px #0f0;
}

.status-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px 0;
  border-top: 1px solid rgba(0, 247, 255, 0.1);
  border-bottom: 1px solid rgba(0, 247, 255, 0.1);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #00f7ff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.follow-btn {
  position: relative;
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #00f7ff, #0088ff);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.follow-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 247, 255, 0.4);
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

.streamer-description {
  margin-bottom: 16px;
}

.streamer-description p {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.6);
}

.social-links {
  display: flex;
  gap: 12px;
}

.social-link {
  width: 36px;
  height: 36px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.social-link svg {
  width: 18px;
  height: 18px;
  fill: #00f7ff;
}

.social-link:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 247, 255, 0.3);
}

/* 中间视频区域 */
.video-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stream-info-panel {
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.stream-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 16px;
}

.stream-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.meta-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 6px 14px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #00f7ff;
}

.meta-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn svg {
  width: 18px;
  height: 18px;
  fill: #00f7ff;
}

.action-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 247, 255, 0.3);
}

/* 右侧聊天室 */
.chat-sidebar {
  position: sticky;
  top: 100px;
  height: calc(100vh - 140px);
}

.chat-container {
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid rgba(0, 247, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-title {
  font-size: 18px;
  font-weight: 700;
}

.chat-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.online-indicator {
  width: 8px;
  height: 8px;
  background: #0f0;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 10px #0f0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: rgba(0, 247, 255, 0.05);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 247, 255, 0.3);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 247, 255, 0.5);
}

.message-item {
  display: flex;
  gap: 12px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(0, 247, 255, 0.3);
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-content {
  flex: 1;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message-user {
  font-size: 14px;
  font-weight: 600;
  color: #00f7ff;
}

.message-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.message-badge.vip {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #000;
}

.message-badge.mod {
  background: linear-gradient(135deg, #00ff88, #00ffff);
  color: #000;
}

.message-text {
  font-size: 14px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.9);
}

.system-message {
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.system-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.system-icon svg {
  width: 100%;
  height: 100%;
  fill: #ffaa00;
  filter: drop-shadow(0 0 5px rgba(255, 170, 0, 0.5));
}

.system-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.chat-input-panel {
  padding: 16px;
  border-top: 1px solid rgba(0, 247, 255, 0.2);
}

.input-tools {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tool-btn {
  width: 36px;
  height: 36px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-btn svg {
  width: 20px;
  height: 20px;
  fill: #00f7ff;
}

.tool-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: scale(1.05);
}

.chat-input-wrapper {
  display: flex;
  gap: 8px;
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(0, 247, 255, 0.05);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
}

.chat-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.chat-input:focus {
  background: rgba(0, 247, 255, 0.1);
  border-color: #00f7ff;
  box-shadow: 0 0 15px rgba(0, 247, 255, 0.2);
}

.send-btn {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #00f7ff, #0088ff);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn svg {
  width: 24px;
  height: 24px;
  fill: #fff;
}

.send-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 20px rgba(0, 247, 255, 0.4);
}
video{
  width: 100%;
  height: 100%;
  border: 2px solid #0088ff;
  border-radius: 12px;
  background: #000;
  object-fit: contain; /* 确保视频按比例显示 */
}

.video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(0, 247, 255, 0.3);
}

/* 确保 xgplayer 容器正确显示 */
.video-wrapper :deep(.xgplayer) {
  width: 100% !important;
  height: 100% !important;
}

.video-wrapper :deep(.xgplayer-video) {
  object-fit: contain !important;
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
  font-weight: 600;
  color: #00f7ff;
  text-shadow: 0 0 10px rgba(0, 247, 255, 0.5);
}

.loading-spinner {
  width: 80px;
  height: 80px;
  border: 4px solid rgba(0, 247, 255, 0.2);
  border-top-color: #00f7ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 响应式 */
@media (max-width: 1400px) {
  .content-grid {
    grid-template-columns: 1fr 360px;
  }
  
  .streamer-sidebar {
    display: none;
  }
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .chat-sidebar {
    position: relative;
    height: 500px;
    top: 0;
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 12px 16px;
  }
  
  .nav-menu {
    display: none;
  }
  
  .main-content {
    padding: 16px;
  }
}
</style>
