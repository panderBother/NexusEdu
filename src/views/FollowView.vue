<script setup lang="ts">
import BottomNav from './BottomNav.vue';
</script>

<template>
  <div class="follow-page">
    <!-- 顶部导航 -->
    <header class="page-header">
      <h1 class="page-title">关注</h1>
      <div class="header-actions">
        <button class="search-btn" @click="$router.push('/search')">
          <svg viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="page-content">
      <!-- 标签切换 -->
      <div class="tabs-container">
        <button class="tab-btn active">直播中</button>
        <button class="tab-btn">全部</button>
        <button class="tab-btn">最近访问</button>
      </div>

      <!-- 在线直播 -->
      <section class="live-section">
        <div class="section-header">
          <h2 class="section-title">正在直播 (12)</h2>
        </div>

        <div class="streamers-grid">
          <div class="streamer-card" v-for="i in 12" :key="i" @click="$router.push('/view')">
            <div class="streamer-cover">
              <img :src="`https://picsum.photos/400/500?random=${i+40}`" alt="Stream" />
              <div class="cover-overlay">
                <div class="live-badge">
                  <span class="live-dot"></span>
                  <span class="live-text">直播中</span>
                </div>
                <div class="viewer-count">
                  {{ (Math.random() * 50 + 5).toFixed(1) }}K 观众
                </div>
              </div>
            </div>
            
            <div class="streamer-info">
              <div class="avatar-wrapper">
                <img :src="`https://i.pravatar.cc/150?img=${i+20}`" alt="Avatar" class="streamer-avatar" />
                <div class="online-dot"></div>
              </div>
              <div class="streamer-details">
                <h3 class="streamer-name">主播名称_{{ i.toString().padStart(3, '0') }}</h3>
                <p class="stream-title">精彩直播中，快来围观！</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 未开播主播 -->
      <section class="offline-section">
        <div class="section-header">
          <h2 class="section-title">未开播</h2>
        </div>

        <div class="offline-list">
          <div class="offline-item" v-for="i in 8" :key="i" @click="$router.push(`/profile/${i}`)">
            <div class="avatar-container">
              <img :src="`https://i.pravatar.cc/150?img=${i+30}`" alt="Avatar" class="offline-avatar" />
            </div>
            <div class="offline-info">
              <h3 class="offline-name">主播昵称_{{ i }}</h3>
              <p class="last-live">最近开播：2小时前</p>
            </div>
            <button class="notify-btn">
              <svg viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
              <span>开播提醒</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 底部导航 -->
      <BottomNav />
    </div>
  </div>
</template>

<style scoped>
.follow-page {
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
  justify-content: space-between;
}

.page-title {
  font-size: 24px;
  font-weight: 900;
  background: linear-gradient(135deg, #fff, #00f7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-btn {
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

.search-btn svg {
  width: 20px;
  height: 20px;
  fill: #00f7ff;
}

.search-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: scale(1.05);
}

/* 页面内容 */
.page-content {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px 32px;
}

/* 标签切换 */
.tabs-container {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
  padding: 8px;
  background: rgba(0, 247, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(0, 247, 255, 0.1);
}

.tab-btn {
  padding: 10px 24px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: #00f7ff;
  background: rgba(0, 247, 255, 0.1);
}

.tab-btn.active {
  color: #fff;
  background: linear-gradient(135deg, #00f7ff, #0088ff);
  box-shadow: 0 4px 20px rgba(0, 247, 255, 0.3);
}

/* 直播区域 */
.live-section {
  margin-bottom: 48px;
}

.section-header {
  margin-bottom: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #00f7ff;
}

.streamers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.streamer-card {
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.streamer-card:hover {
  transform: translateY(-8px);
  border-color: #00f7ff;
  box-shadow: 0 16px 48px rgba(0, 247, 255, 0.3);
}

.streamer-cover {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
}

.streamer-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.streamer-card:hover .streamer-cover img {
  transform: scale(1.05);
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.7));
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 6px 12px;
  background: rgba(255, 0, 80, 0.9);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.live-dot {
  width: 6px;
  height: 6px;
  background: #fff;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
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
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}

.viewer-count {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

.streamer-info {
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.avatar-wrapper {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.streamer-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0, 247, 255, 0.5);
}

.online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 14px;
  height: 14px;
  background: #0f0;
  border: 2px solid #0a0e27;
  border-radius: 50%;
  box-shadow: 0 0 10px #0f0;
}

.streamer-details {
  flex: 1;
  min-width: 0;
}

.streamer-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stream-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 未开播区域 */
.offline-section {
  margin-bottom: 48px;
}

.offline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.offline-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.offline-item:hover {
  border-color: #00f7ff;
  background: rgba(0, 247, 255, 0.08);
  transform: translateX(5px);
}

.avatar-container {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}

.offline-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0, 247, 255, 0.3);
  opacity: 0.7;
}

.offline-info {
  flex: 1;
  min-width: 0;
}

.offline-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.last-live {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.notify-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 20px;
  color: #00f7ff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.notify-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.notify-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  box-shadow: 0 4px 15px rgba(0, 247, 255, 0.3);
}

/* 响应式 */
@media (max-width: 1024px) {
  .streamers-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

@media (max-width: 768px) {
  .page-content {
    padding: 16px;
  }
  
  .streamers-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .offline-item {
    flex-wrap: wrap;
  }
  
  .notify-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
