<template>
  <div class="discover-page">
    <!-- 顶部搜索 -->
    <header class="discover-header">
      <div class="search-container">
        <svg class="search-icon" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input 
          type="text" 
          class="search-input" 
          placeholder="搜索直播、主播..."
          @focus="$router.push('/search')"
        />
      </div>
    </header>

    <div class="page-content">
      <!-- 轮播横幅 -->
      <section class="banner-section">
        <div class="banner-carousel">
          <div class="banner-item active">
            <img src="https://picsum.photos/1200/400?random=1" alt="Banner" />
            <div class="banner-overlay">
              <h2 class="banner-title">赛博朋克直播周</h2>
              <p class="banner-desc">体验最炫酷的科技直播</p>
            </div>
          </div>
        </div>
        <div class="banner-dots">
          <span class="dot active"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </section>

      <!-- 分类导航 -->
      <section class="categories-section">
        <h2 class="section-title">
          <span class="title-icon">◆</span>
          热门分类
        </h2>
        
        <div class="categories-scroll">
          <div class="category-item" v-for="(cat, i) in categories" :key="i" @click="selectCategory(cat)">
            <div class="category-icon-wrapper">
              <div class="category-icon">{{ cat.icon }}</div>
            </div>
            <span class="category-name">{{ cat.name }}</span>
            <span class="category-count">{{ cat.count }}</span>
          </div>
        </div>
      </section>

      <!-- 热门标签 -->
      <section class="tags-section">
        <h2 class="section-title">
          <span class="title-icon">🔥</span>
          热门标签
        </h2>
        
        <div class="tags-container">
          <button class="tag-btn" v-for="(tag, i) in tags" :key="i">
            #{{ tag }}
          </button>
        </div>
      </section>

      <!-- 推荐主播 -->
      <section class="streamers-section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="title-icon">⭐</span>
            推荐主播
          </h2>
          <button class="more-btn" @click="$router.push('/follow')">
            <span>查看更多</span>
            <svg viewBox="0 0 24 24">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </button>
        </div>

        <div class="streamers-grid">
          <div class="streamer-card" v-for="i in 8" :key="i" @click="$router.push(`/profile/${i}`)">
            <div class="streamer-cover">
              <img :src="`https://i.pravatar.cc/300?img=${i+50}`" alt="Streamer" />
              <div class="follow-btn-overlay">
                <button class="follow-btn">
                  <svg viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="streamer-info">
              <h3 class="streamer-name">主播_{{ i }}</h3>
              <p class="streamer-fans">{{ (Math.random() * 500 + 50).toFixed(0) }}K 粉丝</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 排行榜 -->
      <section class="rankings-section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="title-icon">🏆</span>
            人气榜单
          </h2>
          <div class="ranking-tabs">
            <button class="ranking-tab active">今日</button>
            <button class="ranking-tab">本周</button>
            <button class="ranking-tab">本月</button>
          </div>
        </div>

        <div class="ranking-list">
          <div class="ranking-item" v-for="i in 10" :key="i" @click="$router.push('/view')">
            <div class="rank-number" :class="{ top: i <= 3 }">{{ i }}</div>
            <img :src="`https://i.pravatar.cc/150?img=${i+60}`" alt="Avatar" class="rank-avatar" />
            <div class="rank-info">
              <h3 class="rank-name">热门主播_{{ i }}</h3>
              <p class="rank-category">游戏 · 在线</p>
            </div>
            <div class="rank-stats">
              <div class="rank-value">{{ (Math.random() * 100 + 20).toFixed(1) }}K</div>
              <div class="rank-label">人气值</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import BottomNav from './BottomNav.vue';

const categories = [
  { icon: '🎮', name: '游戏', count: '25.5K' },
  { icon: '💻', name: '科技', count: '8.2K' },
  { icon: '🎵', name: '音乐', count: '12.8K' },
  { icon: '🎨', name: '创作', count: '6.3K' },
  { icon: '📱', name: '生活', count: '15.6K' },
  { icon: '🎭', name: '娱乐', count: '18.9K' },
  { icon: '🏃', name: '运动', count: '4.5K' },
  { icon: '🍳', name: '美食', count: '9.2K' }
];

const tags = [
  '赛博朋克', '电竞', 'APEX', 'LOL', '王者荣耀', 
  '和平精英', '原神', 'Steam游戏', 'Switch', 
  'PS5', 'XBOX', '独立游戏', 'VR游戏', '手游'
];

const selectCategory = (cat: any) => {
  console.log('Selected category:', cat);
};
</script>

<style scoped>
.discover-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #16213e 50%, #0a0e27 100%);
  color: #fff;
}

/* 顶部搜索 */
.discover-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10, 14, 39, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 247, 255, 0.2);
  padding: 16px 32px;
}

.search-container {
  max-width: 600px;
  margin: 0 auto;
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
  padding: 14px 20px 14px 48px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
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
  box-shadow: 0 0 20px rgba(0, 247, 255, 0.2);
}

/* 页面内容 */
.page-content {
  max-width: 1600px;
  margin: 0 auto;
  padding: 32px;
}

/* 轮播横幅 */
.banner-section {
  position: relative;
  margin-bottom: 48px;
}

.banner-carousel {
  border-radius: 20px;
  overflow: hidden;
}

.banner-item {
  position: relative;
  aspect-ratio: 3 / 1;
  border-radius: 20px;
  overflow: hidden;
}

.banner-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
}

.banner-title {
  font-size: 36px;
  font-weight: 900;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #00f7ff, #ff0080);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.banner-desc {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
}

.banner-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}

.dot {
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.dot.active {
  width: 24px;
  background: #00f7ff;
  border-radius: 4px;
}

/* 分类导航 */
.categories-section {
  margin-bottom: 48px;
}

.section-title {
  font-size: 24px;
  font-weight: 900;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 20px;
  filter: drop-shadow(0 0 10px rgba(0, 247, 255, 0.5));
}

.categories-scroll {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-item:hover {
  transform: translateY(-5px);
  border-color: #00f7ff;
  box-shadow: 0 12px 32px rgba(0, 247, 255, 0.3);
}

.category-icon-wrapper {
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

.category-item:hover .category-icon-wrapper {
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(0, 247, 255, 0.5);
}

.category-icon {
  font-size: 32px;
}

.category-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.category-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

/* 热门标签 */
.tags-section {
  margin-bottom: 48px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.tag-btn {
  padding: 10px 20px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 20px;
  color: #00f7ff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tag-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  border-color: #00f7ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 247, 255, 0.3);
}

/* 推荐主播 */
.streamers-section {
  margin-bottom: 48px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.more-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 20px;
  color: #00f7ff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.more-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.more-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: translateX(3px);
}

.streamers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 20px;
}

.streamer-card {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.streamer-card:hover {
  transform: translateY(-8px);
}

.streamer-cover {
  position: relative;
  aspect-ratio: 1;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 12px;
  border: 3px solid rgba(0, 247, 255, 0.3);
}

.streamer-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.follow-btn-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.streamer-card:hover .follow-btn-overlay {
  opacity: 1;
}

.follow-btn {
  width: 50px;
  height: 50px;
  background: #00f7ff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.follow-btn svg {
  width: 28px;
  height: 28px;
  fill: #000;
}

.follow-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 0 20px #00f7ff;
}

.streamer-info {
  text-align: center;
}

.streamer-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.streamer-fans {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

/* 排行榜 */
.rankings-section {
  margin-bottom: 48px;
}

.ranking-tabs {
  display: flex;
  gap: 8px;
}

.ranking-tab {
  padding: 8px 20px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.ranking-tab:hover,
.ranking-tab.active {
  background: rgba(0, 247, 255, 0.2);
  border-color: #00f7ff;
  color: #00f7ff;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
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

.ranking-item:hover {
  border-color: #00f7ff;
  background: rgba(0, 247, 255, 0.08);
  transform: translateX(5px);
}

.rank-number {
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
}

.rank-number.top {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #000;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.rank-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0, 247, 255, 0.5);
}

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.rank-category {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.rank-stats {
  text-align: right;
}

.rank-value {
  font-size: 18px;
  font-weight: 900;
  color: #00f7ff;
  margin-bottom: 4px;
}

.rank-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

/* 响应式 */
@media (max-width: 1024px) {
  .categories-scroll {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  
  .streamers-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}

@media (max-width: 768px) {
  .page-content {
    padding: 16px;
  }
  
  .banner-title {
    font-size: 24px;
  }
  
  .banner-desc {
    font-size: 14px;
  }
  
  .categories-scroll {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .streamers-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
