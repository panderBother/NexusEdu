<script setup lang="ts">
import BottomNav from './BottomNav.vue';
</script>

<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-bg">
        <div class="cyber-grid"></div>
        <div class="particle-layer"></div>
      </div>
      
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="title-line">进入未来</span>
          <span class="title-line gradient-text">赛博直播世界</span>
        </h1>
        <p class="hero-subtitle">体验最前沿的科技直播平台，沉浸式的视觉体验</p>
        
        <div class="hero-actions">
          <button class="hero-btn primary">
            <span>开始探索</span>
            <div class="btn-glow"></div>
          </button>
          <button class="hero-btn secondary">
            <span>了解更多</span>
          </button>
        </div>
        
        <div class="hero-stats">
          <div class="stat-item">
            <div class="stat-number">12.5M</div>
            <div class="stat-label">活跃用户</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-number">50K+</div>
            <div class="stat-label">直播频道</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-number">24/7</div>
            <div class="stat-label">实时在线</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Streams -->
    <section class="streams-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">▶</span>
          热门直播
        </h2>
        <div class="section-filters">
          <button class="filter-btn active">全部</button>
          <button class="filter-btn">游戏</button>
          <button class="filter-btn">科技</button>
          <button class="filter-btn">音乐</button>
          <button class="filter-btn">娱乐</button>
        </div>
      </div>

      <div class="streams-grid">
        <!-- Stream Card 1 -->
        <div class="stream-card">
          <div class="stream-thumbnail">
            <img src="https://picsum.photos/400/225?random=1" alt="Stream" />
            <div class="thumbnail-overlay">
              <div class="live-indicator">
                <span class="live-dot"></span>
                <span class="live-label">LIVE</span>
              </div>
              <div class="viewer-badge">12.5K 观众</div>
            </div>
            <div class="stream-duration">02:34:12</div>
            <div class="cyber-border"></div>
          </div>
          
          <div class="stream-info">
            <div class="streamer-avatar">
              <img src="https://i.pravatar.cc/150?img=10" alt="Streamer" />
              <div class="avatar-status"></div>
            </div>
            <div class="stream-details">
              <h3 class="stream-title">赛博朋克2077 - 夜之城探险</h3>
              <p class="streamer-name">CyberGamer_001</p>
              <div class="stream-tags">
                <span class="tag">游戏</span>
                <span class="tag">4K</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stream Card 2 -->
        <div class="stream-card">
          <div class="stream-thumbnail">
            <img src="https://picsum.photos/400/225?random=2" alt="Stream" />
            <div class="thumbnail-overlay">
              <div class="live-indicator">
                <span class="live-dot"></span>
                <span class="live-label">LIVE</span>
              </div>
              <div class="viewer-badge">8.2K 观众</div>
            </div>
            <div class="stream-duration">01:45:30</div>
            <div class="cyber-border"></div>
          </div>
          
          <div class="stream-info">
            <div class="streamer-avatar">
              <img src="https://i.pravatar.cc/150?img=11" alt="Streamer" />
              <div class="avatar-status"></div>
            </div>
            <div class="stream-details">
              <h3 class="stream-title">未来科技产品开箱评测</h3>
              <p class="streamer-name">TechVision_Pro</p>
              <div class="stream-tags">
                <span class="tag">科技</span>
                <span class="tag">评测</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stream Card 3 -->
        <div class="stream-card">
          <div class="stream-thumbnail">
            <img src="https://picsum.photos/400/225?random=3" alt="Stream" />
            <div class="thumbnail-overlay">
              <div class="live-indicator">
                <span class="live-dot"></span>
                <span class="live-label">LIVE</span>
              </div>
              <div class="viewer-badge">15.8K 观众</div>
            </div>
            <div class="stream-duration">03:12:45</div>
            <div class="cyber-border"></div>
          </div>
          
          <div class="stream-info">
            <div class="streamer-avatar">
              <img src="https://i.pravatar.cc/150?img=12" alt="Streamer" />
              <div class="avatar-status"></div>
            </div>
            <div class="stream-details">
              <h3 class="stream-title">电子音乐现场混音表演</h3>
              <p class="streamer-name">NeonBeats_DJ</p>
              <div class="stream-tags">
                <span class="tag">音乐</span>
                <span class="tag">现场</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stream Card 4 -->
        <div class="stream-card">
          <div class="stream-thumbnail">
            <img src="https://picsum.photos/400/225?random=4" alt="Stream" />
            <div class="thumbnail-overlay">
              <div class="live-indicator">
                <span class="live-dot"></span>
                <span class="live-label">LIVE</span>
              </div>
              <div class="viewer-badge">6.5K 观众</div>
            </div>
            <div class="stream-duration">00:58:20</div>
            <div class="cyber-border"></div>
          </div>
          
          <div class="stream-info">
            <div class="streamer-avatar">
              <img src="https://i.pravatar.cc/150?img=13" alt="Streamer" />
              <div class="avatar-status"></div>
            </div>
            <div class="stream-details">
              <h3 class="stream-title">Apex Legends 顶级对决</h3>
              <p class="streamer-name">ProGamer_Elite</p>
              <div class="stream-tags">
                <span class="tag">游戏</span>
                <span class="tag">竞技</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stream Card 5 -->
        <div class="stream-card">
          <div class="stream-thumbnail">
            <img src="https://picsum.photos/400/225?random=5" alt="Stream" />
            <div class="thumbnail-overlay">
              <div class="live-indicator">
                <span class="live-dot"></span>
                <span class="live-label">LIVE</span>
              </div>
              <div class="viewer-badge">9.3K 观众</div>
            </div>
            <div class="stream-duration">02:15:10</div>
            <div class="cyber-border"></div>
          </div>
          
          <div class="stream-info">
            <div class="streamer-avatar">
              <img src="https://i.pravatar.cc/150?img=14" alt="Streamer" />
              <div class="avatar-status"></div>
            </div>
            <div class="stream-details">
              <h3 class="stream-title">AI 编程技术分享</h3>
              <p class="streamer-name">CodeMaster_AI</p>
              <div class="stream-tags">
                <span class="tag">科技</span>
                <span class="tag">编程</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stream Card 6 -->
        <div class="stream-card">
          <div class="stream-thumbnail">
            <img src="https://picsum.photos/400/225?random=6" alt="Stream" />
            <div class="thumbnail-overlay">
              <div class="live-indicator">
                <span class="live-dot"></span>
                <span class="live-label">LIVE</span>
              </div>
              <div class="viewer-badge">11.2K 观众</div>
            </div>
            <div class="stream-duration">04:20:35</div>
            <div class="cyber-border"></div>
          </div>
          
          <div class="stream-info">
            <div class="streamer-avatar">
              <img src="https://i.pravatar.cc/150?img=15" alt="Streamer" />
              <div class="avatar-status"></div>
            </div>
            <div class="stream-details">
              <h3 class="stream-title">元宇宙探索之旅</h3>
              <p class="streamer-name">MetaExplorer</p>
              <div class="stream-tags">
                <span class="tag">VR</span>
                <span class="tag">元宇宙</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="load-more-section">
        <button class="load-more-btn">
          <span>加载更多</span>
          <svg viewBox="0 0 24 24">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </button>
      </div>
    </section>

    <!-- Categories Section -->
    <section class="categories-section">
      <h2 class="section-title">
        <span class="title-icon">◆</span>
        热门分类
      </h2>
      
      <div class="categories-grid">
        <div class="category-card">
          <div class="category-icon">🎮</div>
          <h3 class="category-name">游戏</h3>
          <p class="category-count">25.5K 直播</p>
          <div class="category-glow"></div>
        </div>
        
        <div class="category-card">
          <div class="category-icon">💻</div>
          <h3 class="category-name">科技</h3>
          <p class="category-count">8.2K 直播</p>
          <div class="category-glow"></div>
        </div>
        
        <div class="category-card">
          <div class="category-icon">🎵</div>
          <h3 class="category-name">音乐</h3>
          <p class="category-count">12.8K 直播</p>
          <div class="category-glow"></div>
        </div>
        
        <div class="category-card">
          <div class="category-icon">🎨</div>
          <h3 class="category-name">创作</h3>
          <p class="category-count">6.3K 直播</p>
          <div class="category-glow"></div>
        </div>
        
        <div class="category-card">
          <div class="category-icon">📱</div>
          <h3 class="category-name">生活</h3>
          <p class="category-count">15.6K 直播</p>
          <div class="category-glow"></div>
        </div>
        
        <div class="category-card">
          <div class="category-icon">🎭</div>
          <h3 class="category-name">娱乐</h3>
          <p class="category-count">18.9K 直播</p>
          <div class="category-glow"></div>
        </div>
      </div>
    </section>

    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #16213e 50%, #0a0e27 100%);
  color: #fff;
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 32px;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.cyber-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(0deg, rgba(0, 247, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 247, 255, 0.05) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(50px, 50px);
  }
}

.particle-layer {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 50%, rgba(0, 247, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 50%, rgba(255, 0, 128, 0.1) 0%, transparent 50%);
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 900px;
}

.hero-title {
  font-size: 72px;
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title-line {
  display: block;
}

.gradient-text {
  background: linear-gradient(135deg, #00f7ff 0%, #ff0080 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {
  0%, 100% {
    filter: hue-rotate(0deg);
  }
  50% {
    filter: hue-rotate(20deg);
  }
}

.hero-subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 48px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 80px;
}

.hero-btn {
  position: relative;
  padding: 16px 48px;
  font-size: 16px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.hero-btn.primary {
  background: linear-gradient(135deg, #00f7ff, #0088ff);
  color: #fff;
  box-shadow: 0 8px 32px rgba(0, 247, 255, 0.3);
}

.hero-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 247, 255, 0.5);
}

.hero-btn.secondary {
  background: rgba(0, 247, 255, 0.1);
  border: 2px solid rgba(0, 247, 255, 0.5);
  color: #00f7ff;
}

.hero-btn.secondary:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: translateY(-2px);
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

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 36px;
  font-weight: 900;
  background: linear-gradient(135deg, #00f7ff, #00d4ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, transparent, rgba(0, 247, 255, 0.5), transparent);
}

/* Streams Section */
.streams-section {
  max-width: 1600px;
  margin: 0 auto;
  padding: 80px 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 48px;
}

.section-title {
  font-size: 32px;
  font-weight: 900;
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  color: #00f7ff;
  font-size: 24px;
  text-shadow: 0 0 20px rgba(0, 247, 255, 0.8);
}

.section-filters {
  display: flex;
  gap: 12px;
}

.filter-btn {
  padding: 10px 24px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 20px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-btn:hover,
.filter-btn.active {
  background: rgba(0, 247, 255, 0.2);
  border-color: #00f7ff;
  color: #00f7ff;
  box-shadow: 0 0 20px rgba(0, 247, 255, 0.3);
}

.streams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 32px;
  margin-bottom: 48px;
}

.stream-card {
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stream-card:hover {
  transform: translateY(-8px);
  border-color: #00f7ff;
  box-shadow: 0 16px 48px rgba(0, 247, 255, 0.3);
}

.stream-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.stream-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.stream-card:hover .stream-thumbnail img {
  transform: scale(1.05);
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.6));
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
}

.live-indicator {
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

.live-label {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}

.viewer-badge {
  width: fit-content;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.stream-duration {
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.cyber-border {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  pointer-events: none;
  transition: all 0.3s ease;
}

.stream-card:hover .cyber-border {
  border-color: rgba(0, 247, 255, 0.5);
  box-shadow: inset 0 0 20px rgba(0, 247, 255, 0.2);
}

.stream-info {
  padding: 16px;
  display: flex;
  gap: 12px;
}

.streamer-avatar {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.streamer-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0, 247, 255, 0.5);
}

.avatar-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 14px;
  height: 14px;
  background: #0f0;
  border: 2px solid #0a0e27;
  border-radius: 50%;
  box-shadow: 0 0 8px #0f0;
}

.stream-details {
  flex: 1;
  min-width: 0;
}

.stream-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.streamer-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
}

.stream-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  padding: 4px 10px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #00f7ff;
}

.load-more-section {
  display: flex;
  justify-content: center;
}

.load-more-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: rgba(0, 247, 255, 0.1);
  border: 2px solid rgba(0, 247, 255, 0.3);
  border-radius: 12px;
  color: #00f7ff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.load-more-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.load-more-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  border-color: #00f7ff;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 247, 255, 0.3);
}

/* Categories Section */
.categories-section {
  max-width: 1600px;
  margin: 0 auto;
  padding: 80px 32px;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-top: 48px;
}

.category-card {
  position: relative;
  padding: 40px 24px;
  background: linear-gradient(135deg, rgba(0, 247, 255, 0.05), rgba(255, 0, 128, 0.05));
  border: 1px solid rgba(0, 247, 255, 0.2);
  border-radius: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.category-card:hover {
  transform: translateY(-8px);
  border-color: #00f7ff;
  box-shadow: 0 16px 48px rgba(0, 247, 255, 0.3);
}

.category-icon {
  font-size: 48px;
  margin-bottom: 16px;
  filter: drop-shadow(0 0 20px rgba(0, 247, 255, 0.5));
}

.category-name {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}

.category-count {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.category-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(0, 247, 255, 0.1), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.category-card:hover .category-glow {
  opacity: 1;
}

/* Responsive */
@media (max-width: 1200px) {
  .hero-title {
    font-size: 56px;
  }
  
  .streams-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 60px 24px;
  }
  
  .hero-title {
    font-size: 40px;
  }
  
  .hero-subtitle {
    font-size: 16px;
  }
  
  .hero-actions {
    flex-direction: column;
  }
  
  .hero-stats {
    flex-direction: column;
    gap: 24px;
  }
  
  .stat-divider {
    width: 40px;
    height: 1px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }
  
  .section-filters {
    overflow-x: auto;
    width: 100%;
  }
  
  .streams-grid {
    grid-template-columns: 1fr;
  }
  
  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
