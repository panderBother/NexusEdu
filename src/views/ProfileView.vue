<script setup lang="ts">
import router from '@/router';
import BottomNav from './BottomNav.vue';
</script>

<template>
  <div class="profile-page">
    <!-- 顶部导航 -->
    <header class="profile-header">
      <div class="header-content">
        <button class="back-btn" @click="$router.back()">
          <svg viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h1 class="header-title">个人中心</h1>
        <button class="settings-btn" @click="$router.push('/settings')">
          <svg viewBox="0 0 24 24">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="profile-content">
      <!-- 用户信息卡片 -->
      <div class="user-card">
        <div class="user-bg">
          <div class="cyber-particles"></div>
        </div>
        
        <div class="user-info">
          <div class="avatar-section">
            <div class="avatar-wrapper">
              <div class="avatar-ring"></div>
              <img src="https://i.pravatar.cc/200?img=1" alt="Avatar" class="user-avatar" />
              <div class="online-badge">在线</div>
            </div>
          </div>
          
          <div class="user-details">
            <h2 class="username">CyberStreamer_001</h2>
            <p class="user-id">ID: 1234567890</p>
            <p class="user-bio">热爱科技 | 赛博朋克爱好者 | 每晚8点见</p>
            
            <div class="user-tags">
              <span class="tag">游戏主播</span>
              <span class="tag">科技达人</span>
              <span class="tag">VIP</span>
            </div>
          </div>
          
          <button class="edit-profile-btn">
            <svg viewBox="0 0 24 24">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            <span>编辑资料</span>
          </button>
        </div>
        
        <!-- 统计数据 -->
        <div class="stats-row">
          <div class="stat-box">
            <div class="stat-value">358K</div>
            <div class="stat-label">粉丝</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-box">
            <div class="stat-value">1.2K</div>
            <div class="stat-label">关注</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-box">
            <div class="stat-value">25.6M</div>
            <div class="stat-label">获赞</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-box">
            <div class="stat-value">852</div>
            <div class="stat-label">作品</div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="quick-actions">
        <div class="action-item" @click="$router.push('/start-live')">
          <div class="action-icon live">
            <svg viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </div>
          <span class="action-label">开始直播</span>
        </div>
        
        <div class="action-item" @click="$router.push('/my-videos')">
          <div class="action-icon">
            <svg viewBox="0 0 24 24">
              <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
            </svg>
          </div>
          <span class="action-label">我的作品</span>
        </div>
        
        <div class="action-item" @click="$router.push('/wallet')">
          <div class="action-icon">
            <svg viewBox="0 0 24 24">
              <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>
          <span class="action-label">我的钱包</span>
        </div>
        
        <div class="action-item" @click="$router.push('/data-center')">
          <div class="action-icon">
            <svg viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
          </div>
          <span class="action-label">数据中心</span>
        </div>
      </div>

      <!-- 内容标签页 -->
      <div class="content-tabs">
        <div class="tabs-header">
          <button class="tab-btn active">作品</button>
          <button class="tab-btn">收藏</button>
          <button class="tab-btn">历史</button>
        </div>
        
        <div class="tab-content">
          <div class="videos-grid">
            <div class="video-card" v-for="i in 12" :key="i">
              <div class="video-thumbnail" @click="router.push('/player')">
                <img :src="`https://picsum.photos/300/400?random=${i+20}`" alt="Video" />
                <div class="video-overlay">
                  <div class="play-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
                <div class="video-stats">
                  <div class="stat-item">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span>{{ Math.floor(Math.random() * 50) + 10 }}K</span>
                  </div>
                </div>
              </div>
              <p class="video-title">精彩直播回放 #{{ i }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #16213e 50%, #0a0e27 100%);
  color: #fff;
}

/* 顶部导航 */
.profile-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10, 14, 39, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 247, 255, 0.2);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-btn,
.settings-btn {
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

.back-btn svg,
.settings-btn svg {
  width: 24px;
  height: 24px;
  fill: #00f7ff;
}

.back-btn:hover,
.settings-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: translateY(-2px);
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #fff, #00f7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 内容区域 */
.profile-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
}

/* 用户卡片 */
.user-card {
  position: relative;
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 32px;
  overflow: hidden;
}

.user-bg {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  background: radial-gradient(circle at 30% 50%, rgba(0, 247, 255, 0.1), transparent 50%);
}

.cyber-particles {
  position: absolute;
  inset: 0;
  background-image: 
    radial-gradient(circle, rgba(0, 247, 255, 0.3) 1px, transparent 1px);
  background-size: 30px 30px;
  animation: particlesFloat 20s linear infinite;
}

@keyframes particlesFloat {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-30px);
  }
}

.user-info {
  position: relative;
  display: flex;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 32px;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
}

.avatar-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00f7ff, #ff0080);
  animation: rotate 3s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.user-avatar {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #0a0e27;
}

.online-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #0f0, #00ff88);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  color: #000;
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
}

.user-details {
  flex: 1;
}

.username {
  font-size: 32px;
  font-weight: 900;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #fff, #00f7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.user-id {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
}

.user-bio {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: 16px;
}

.user-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 6px 14px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #00f7ff;
}

.edit-profile-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(0, 247, 255, 0.1);
  border: 2px solid rgba(0, 247, 255, 0.5);
  border-radius: 12px;
  color: #00f7ff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.edit-profile-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.edit-profile-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 247, 255, 0.3);
}

/* 统计数据 */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 24px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  border: 1px solid rgba(0, 247, 255, 0.1);
}

.stat-box {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 900;
  color: #00f7ff;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, transparent, rgba(0, 247, 255, 0.3), transparent);
}

/* 快捷操作 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-item:hover {
  transform: translateY(-5px);
  border-color: #00f7ff;
  box-shadow: 0 12px 32px rgba(0, 247, 255, 0.3);
}

.action-icon {
  width: 60px;
  height: 60px;
  background: rgba(0, 247, 255, 0.1);
  border: 2px solid rgba(0, 247, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.action-icon.live {
  background: rgba(255, 0, 80, 0.1);
  border-color: rgba(255, 0, 80, 0.5);
}

.action-icon svg {
  width: 28px;
  height: 28px;
  fill: #00f7ff;
}

.action-icon.live svg {
  fill: #ff0050;
}

.action-item:hover .action-icon {
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(0, 247, 255, 0.5);
}

.action-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

/* 内容标签页 */
.content-tabs {
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 20px;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  gap: 8px;
  padding: 20px 20px 0;
  border-bottom: 1px solid rgba(0, 247, 255, 0.1);
}

.tab-btn {
  padding: 12px 32px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.tab-btn::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00f7ff, #ff0080);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.tab-btn.active {
  color: #00f7ff;
}

.tab-btn.active::after {
  transform: scaleX(1);
}

.tab-content {
  padding: 32px;
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.video-card {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.video-card:hover {
  transform: translateY(-8px);
}

.video-thumbnail {
  position: relative;
  aspect-ratio: 9 / 16;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

.video-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.7));
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.video-card:hover .video-overlay {
  opacity: 1;
}

.play-icon {
  width: 50px;
  height: 50px;
  background: rgba(0, 247, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-icon svg {
  width: 24px;
  height: 24px;
  fill: #000;
  margin-left: 3px;
}

.video-stats {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.video-stats .stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.video-stats svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.video-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 响应式 */
@media (max-width: 1024px) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .profile-content {
    padding: 16px;
  }
  
  .user-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .username {
    font-size: 24px;
  }
  
  .stats-row {
    flex-wrap: wrap;
    gap: 20px;
  }
  
  .stat-divider {
    display: none;
  }
  
  .videos-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}
</style>
