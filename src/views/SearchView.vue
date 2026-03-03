<template>
  <div class="search-page">
    <!-- 搜索头部 -->
    <header class="search-header">
      <button class="back-btn" @click="$router.back()">
        <svg viewBox="0 0 24 24">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button>
      
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input 
          ref="searchInput"
          type="text" 
          class="search-input"
          v-model="searchQuery"
          placeholder="搜索直播、主播、话题..."
          @input="handleSearch"
        />
        <button class="clear-btn" v-if="searchQuery" @click="clearSearch">
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="search-content">
      <!-- 搜索历史 -->
      <section class="search-history" v-if="!searchQuery && searchHistory.length > 0">
        <div class="history-header">
          <h3 class="history-title">搜索历史</h3>
          <button class="clear-history-btn" @click="clearHistory">
            <svg viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            清空
          </button>
        </div>
        
        <div class="history-tags">
          <button 
            class="history-tag" 
            v-for="(item, i) in searchHistory" 
            :key="i"
            @click="searchQuery = item"
          >
            {{ item }}
          </button>
        </div>
      </section>

      <!-- 热门搜索 -->
      <section class="hot-search" v-if="!searchQuery">
        <h3 class="section-title">
          <span class="title-icon">🔥</span>
          热门搜索
        </h3>
        
        <div class="hot-list">
          <div 
            class="hot-item" 
            v-for="i in 10" 
            :key="i"
            @click="searchQuery = `热门话题${i}`"
          >
            <div class="hot-rank" :class="{ top: i <= 3 }">{{ i }}</div>
            <div class="hot-content">
              <h4 class="hot-keyword">热门话题关键词_{{ i }}</h4>
              <p class="hot-stats">{{ (Math.random() * 500 + 100).toFixed(0) }}万 搜索</p>
            </div>
            <div class="hot-trend">
              <svg v-if="i % 2 === 0" viewBox="0 0 24 24" class="trend-up">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" class="trend-hot">
                <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <!-- 搜索结果 -->
      <section class="search-results" v-if="searchQuery">
        <!-- 结果标签 -->
        <div class="result-tabs">
          <button class="result-tab active">综合</button>
          <button class="result-tab">直播</button>
          <button class="result-tab">主播</button>
          <button class="result-tab">话题</button>
        </div>

        <!-- 直播结果 -->
        <div class="streams-results">
          <h3 class="results-title">直播 (128)</h3>
          
          <div class="streams-grid">
            <div class="stream-card" v-for="i in 8" :key="i" @click="$router.push('/view')">
              <div class="stream-thumbnail">
                <img :src="`https://picsum.photos/400/225?random=${i+100}`" alt="Stream" />
                <div class="thumbnail-overlay">
                  <div class="live-badge">
                    <span class="live-dot"></span>
                    <span class="live-text">LIVE</span>
                  </div>
                  <div class="viewer-count">
                    {{ (Math.random() * 50 + 5).toFixed(1) }}K
                  </div>
                </div>
              </div>
              
              <div class="stream-info">
                <div class="streamer-avatar">
                  <img :src="`https://i.pravatar.cc/150?img=${i+70}`" alt="Avatar" />
                </div>
                <div class="stream-details">
                  <h4 class="stream-title">{{ searchQuery }} - 精彩直播第{{ i }}期</h4>
                  <p class="streamer-name">主播_{{ i }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 主播结果 -->
        <div class="streamers-results">
          <h3 class="results-title">主播 (56)</h3>
          
          <div class="streamers-list">
            <div class="streamer-item" v-for="i in 6" :key="i" @click="$router.push(`/profile/${i}`)">
              <img :src="`https://i.pravatar.cc/150?img=${i+80}`" alt="Avatar" class="streamer-avatar-large" />
              <div class="streamer-details">
                <h4 class="streamer-name-large">主播昵称_{{ i }}</h4>
                <p class="streamer-desc">{{ (Math.random() * 500 + 50).toFixed(0) }}K 粉丝 · 游戏主播</p>
              </div>
              <button class="follow-btn-small">
                <svg viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                关注
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const searchInput = ref<HTMLInputElement>();
const searchQuery = ref('');
const searchHistory = ref(['赛博朋克', 'APEX', '王者荣耀', '原神']);

onMounted(() => {
  searchInput.value?.focus();
});

const handleSearch = () => {
  // 搜索逻辑
};

const clearSearch = () => {
  searchQuery.value = '';
  searchInput.value?.focus();
};

const clearHistory = () => {
  searchHistory.value = [];
};
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #16213e 50%, #0a0e27 100%);
  color: #fff;
}

/* 搜索头部 */
.search-header {
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
  flex-shrink: 0;
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

.search-box {
  flex: 1;
  max-width: 800px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  fill: rgba(255, 255, 255, 0.5);
}

.search-input {
  width: 100%;
  padding: 14px 50px 14px 48px;
  background: rgba(0, 247, 255, 0.1);
  border: 2px solid rgba(0, 247, 255, 0.3);
  border-radius: 25px;
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: all 0.3s ease;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-input:focus {
  border-color: #00f7ff;
  box-shadow: 0 0 25px rgba(0, 247, 255, 0.3);
}

.clear-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.clear-btn svg {
  width: 16px;
  height: 16px;
  fill: rgba(255, 255, 255, 0.6);
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 搜索内容 */
.search-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
}

/* 搜索历史 */
.search-history {
  margin-bottom: 48px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.history-title {
  font-size: 18px;
  font-weight: 700;
  color: #00f7ff;
}

.clear-history-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 0, 80, 0.1);
  border: 1px solid rgba(255, 0, 80, 0.3);
  border-radius: 20px;
  color: rgba(255, 0, 80, 0.8);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-history-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.clear-history-btn:hover {
  background: rgba(255, 0, 80, 0.2);
  border-color: #ff0050;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.history-tag {
  padding: 10px 20px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 20px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.history-tag:hover {
  background: rgba(0, 247, 255, 0.2);
  border-color: #00f7ff;
  color: #00f7ff;
}

/* 热门搜索 */
.hot-search {
  margin-bottom: 48px;
}

.section-title {
  font-size: 20px;
  font-weight: 900;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 20px;
  filter: drop-shadow(0 0 10px rgba(255, 100, 0, 0.5));
}

.hot-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hot-item {
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

.hot-item:hover {
  border-color: #00f7ff;
  background: rgba(0, 247, 255, 0.08);
  transform: translateX(5px);
}

.hot-rank {
  width: 32px;
  height: 32px;
  background: rgba(0, 247, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 900;
  color: #00f7ff;
  flex-shrink: 0;
}

.hot-rank.top {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #000;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.hot-content {
  flex: 1;
  min-width: 0;
}

.hot-keyword {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-stats {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.hot-trend {
  flex-shrink: 0;
}

.hot-trend svg {
  width: 24px;
  height: 24px;
}

.trend-up {
  fill: #0f0;
  filter: drop-shadow(0 0 5px rgba(0, 255, 0, 0.5));
}

.trend-hot {
  fill: #ff4500;
  filter: drop-shadow(0 0 5px rgba(255, 69, 0, 0.5));
}

/* 搜索结果 */
.search-results {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.result-tabs {
  display: flex;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 247, 255, 0.2);
}

.result-tab {
  padding: 10px 24px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.result-tab::after {
  content: '';
  position: absolute;
  bottom: -17px;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00f7ff, #ff0080);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.result-tab.active {
  color: #00f7ff;
}

.result-tab.active::after {
  transform: scaleX(1);
}

.results-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 20px;
}

/* 直播结果 */
.streams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.stream-card {
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stream-card:hover {
  transform: translateY(-5px);
  border-color: #00f7ff;
  box-shadow: 0 12px 32px rgba(0, 247, 255, 0.3);
}

.stream-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
}

.stream-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.6));
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 0, 80, 0.9);
  border-radius: 12px;
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
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.stream-info {
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.streamer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(0, 247, 255, 0.5);
}

.streamer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stream-details {
  flex: 1;
  min-width: 0;
}

.stream-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.streamer-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

/* 主播结果 */
.streamers-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.streamer-item {
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

.streamer-item:hover {
  border-color: #00f7ff;
  background: rgba(0, 247, 255, 0.08);
  transform: translateX(5px);
}

.streamer-avatar-large {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0, 247, 255, 0.5);
  flex-shrink: 0;
}

.streamer-details {
  flex: 1;
  min-width: 0;
}

.streamer-name-large {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.streamer-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.follow-btn-small {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #00f7ff, #0088ff);
  border: none;
  border-radius: 20px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.follow-btn-small svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.follow-btn-small:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 247, 255, 0.4);
}

/* 响应式 */
@media (max-width: 768px) {
  .search-content {
    padding: 16px;
  }
  
  .streams-grid {
    grid-template-columns: 1fr;
  }
  
  .streamer-item {
    flex-wrap: wrap;
  }
  
  .follow-btn-small {
    width: 100%;
    justify-content: center;
  }
}
</style>
