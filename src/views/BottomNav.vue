<template>
  <nav class="bottom-nav">
    <router-link to="/" class="nav-item" active-class="active">
      <div class="nav-icon">
        <svg viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      </div>
      <span class="nav-label">首页</span>
      <div class="nav-glow"></div>
    </router-link>

    <router-link to="/discover" class="nav-item" active-class="active">
      <div class="nav-icon">
        <svg viewBox="0 0 24 24">
          <path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"/>
        </svg>
      </div>
      <span class="nav-label">发现</span>
      <div class="nav-glow"></div>
    </router-link>

    <button class="nav-item center-item" @click="$router.push('/start-live')">
      <div class="center-icon">
        <svg viewBox="0 0 24 24">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </div>
      <div class="center-pulse"></div>
    </button>

    <router-link to="/follow" class="nav-item" active-class="active">
      <div class="nav-icon">
        <svg viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
      <span class="nav-label">关注</span>
      <div class="nav-glow"></div>
    </router-link>

    <router-link to="/profile" class="nav-item" active-class="active">
      <div class="nav-icon">
        <svg viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      <span class="nav-label">我的</span>
      <div class="nav-glow"></div>
    </router-link>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: rgba(10, 14, 39, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 247, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 20px;
  z-index: 1000;
  box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.5);
}

.nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
  cursor: pointer;
  background: none;
  border: none;
}

.nav-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.nav-icon svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
  transition: all 0.3s ease;
}

.nav-label {
  font-size: 11px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.nav-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(0, 247, 255, 0.2), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 12px;
}

.nav-item:hover {
  color: #00f7ff;
  transform: translateY(-2px);
}

.nav-item:hover .nav-glow {
  opacity: 1;
}

.nav-item.active {
  color: #00f7ff;
}

.nav-item.active .nav-icon {
  filter: drop-shadow(0 0 8px rgba(0, 247, 255, 0.8));
}

.nav-item.active .nav-glow {
  opacity: 1;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* 中间发布按钮 */
.center-item {
  position: relative;
  margin-top: -25px;
}

.center-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #ff0050, #ff4d4d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(255, 0, 80, 0.5);
  transition: all 0.3s ease;
  border: 3px solid #0a0e27;
}

.center-icon svg {
  width: 32px;
  height: 32px;
  fill: #fff;
}

.center-pulse {
  position: absolute;
  inset: -8px;
  border: 2px solid rgba(255, 0, 80, 0.5);
  border-radius: 50%;
  animation: centerPulse 2s ease-in-out infinite;
}

@keyframes centerPulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.center-item:hover .center-icon {
  transform: scale(1.1);
  box-shadow: 0 12px 40px rgba(255, 0, 80, 0.7);
}

/* 适配安全区域 */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-nav {
    padding-bottom: env(safe-area-inset-bottom);
    height: calc(70px + env(safe-area-inset-bottom));
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .bottom-nav {
    padding: 0 10px;
  }
  
  .nav-item {
    padding: 8px 12px;
  }
  
  .nav-label {
    font-size: 10px;
  }
}
</style>
