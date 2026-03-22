<!-- 赛博朋克风格弹幕播放器 -->
<template>
  <div class="cyberpunk-main">
    <!-- 背景动画层 -->
    <div class="bg-animation">
      <div class="grid-overlay"></div>
      <div class="scan-lines"></div>
      <div class="floating-particles"></div>
    </div>

    <div class="player-container">
      <!-- 左侧：视频和控制区 -->
      <div class="main-content">
        <!-- 主播放器区域 -->
        <div class="video-section">
          <div class="video-frame">
            <div id="container" class="video-wrapper">
              <video
                ref="video"
                id="video"
                controls
                autoplay
                :src="videoSrc"
                :volume="0.05"
                @play="videoPlay"
                @pause="videoPause"
                @ended="changeNextVideo"
              />
              <!-- 全息边框效果 -->
              <div class="hologram-border">
                <div class="corner corner-tl"></div>
                <div class="corner corner-tr"></div>
                <div class="corner corner-bl"></div>
                <div class="corner corner-br"></div>
              </div>

              <!-- 底部控制栏 -->
              <div class="control-bar">
                <!-- 弹幕开关 -->
                <div class="neon-switch" :class="{ active: barrageOpen }">
                  <input 
                    type="checkbox" 
                    v-model="barrageOpen" 
                    @change="barrageOpenChange"
                    id="barrage-toggle"
                  />
                  <label for="barrage-toggle">
                    <span class="switch-text">弹幕</span>
                    <div class="switch-indicator"></div>
                  </label>
                </div>

                <!-- 弹幕输入区 -->
                <div class="cyber-input-group">
                  <!-- 弹幕样式选择 -->
                  <el-popover
                    placement="top"
                    :width="280"
                    :show-arrow="false"
                    popper-class="cyberpunk-popover"
                    trigger="hover"
                  >
                    <div class="style-panel">
                      <div class="style-section">
                        <div class="section-title">字号</div>
                        <div class="size-options">
                          <div 
                            v-for="item in fontSizes" 
                            :key="item.value"
                            class="size-option"
                            :class="{ active: currentFontsize === item.value }"
                            @click="currentFontsize = item.value"
                          >
                            {{ item.label }}
                          </div>
                        </div>
                      </div>
                      
                      <div class="style-section">
                        <div class="section-title">模式</div>
                        <div class="mode-options">
                          <div 
                            v-for="item in barrageModes" 
                            :key="item.value"
                            class="mode-option"
                            :class="{ active: currentBarrageMode === item.value }"
                            @click="currentBarrageMode = item.value"
                          >
                            {{ item.label }}
                          </div>
                        </div>
                      </div>

                      <div class="style-section">
                        <div class="section-title">颜色</div>
                        <div class="color-palette">
                          <div 
                            v-for="color in barrageColors" 
                            :key="color"
                            class="color-option"
                            :class="{ active: color === currentBarrageColor }"
                            :style="`background: ${color}`"
                            @click="currentBarrageColor = color"
                          ></div>
                        </div>
                      </div>
                    </div>

                    <template #reference>
                      <button class="input-addon-btn">
                        <svg class="icon" viewBox="0 0 24 24">
                          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                        </svg>
                      </button>
                    </template>
                  </el-popover>

                  <!-- 主输入框 -->
                  <input 
                    v-model="barrageText"
                    placeholder="发送弹幕到赛博空间..."
                    @keyup.enter="sendBarrage"
                    class="input-field"
                  />

                  <!-- 图片选择 -->
                  <el-popover
                    placement="top"
                    :width="400"
                    :show-arrow="false"
                    popper-class="cyberpunk-popover"
                    trigger="hover"
                  >
                    <div class="image-panel">
                      <div class="image-tabs">
                        <div 
                          v-for="group in imageGroupsRef" 
                          :key="group.id"
                          class="image-tab"
                          :class="{ active: currentGroupId === group.id }"
                          @click="currentGroupId = group.id"
                        >
                          {{ group.label }}
                        </div>
                      </div>
                      <div class="image-grid">
                        <img
                          v-for="img in currentGroup.images"
                          :key="img.id"
                          :src="img.url"
                          class="barrage-img"
                          :style="`width: ${img.width}px; height: ${img.height}px;`"
                          @click="barrageImgClick(img)"
                        />
                      </div>
                    </div>

                    <template #reference>
                      <button class="input-addon-btn">
                        <svg class="icon" viewBox="0 0 24 24">
                          <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/>
                        </svg>
                      </button>
                    </template>
                  </el-popover>

                  <!-- 发送按钮 -->
                  <button class="cyber-btn primary" @click="sendBarrage">发送</button>
                  <button class="cyber-btn secondary" @click="sendBlessingBarrage">祝福</button>
                </div>

                <!-- 视频选择 -->
                <div class="cyber-select">
                  <select v-model="currentVideo" class="select-field">
                    <option v-for="item in videos" :key="item.id" :value="item.id">
                      {{ item.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 控制面板已移到视频底部 -->
      </div>

      <!-- 右侧：设置侧边栏 -->
      <div class="settings-sidebar">
        <div class="sidebar-glow"></div>
        <div class="settings-panel sidebar-panel">
          <div class="panel-header">
            <h3>系统配置</h3>
            <div class="header-line"></div>
          </div>

          <!-- 弹幕类型过滤 -->
          <div class="setting-section">
            <div class="section-title">
              <span class="title-icon">🎯</span>
              类型屏蔽
            </div>
            <div class="checkbox-grid">
              <div 
                v-for="item in barrageRenderList" 
                :key="item.key"
                class="cyber-checkbox"
                :class="{ checked: item.value }"
                @click="item.value = !item.value; renderFrame()"
              >
                <div class="checkbox-indicator"></div>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </div>

          <!-- 智能屏蔽等级 -->
          <div class="setting-section">
            <div class="section-title">
              <span class="title-icon">🛡️</span>
              智能屏蔽等级
            </div>
            <div class="cyber-slider">
              <input 
                type="range" 
                v-model="shieldGrade" 
                :min="1" 
                :max="10" 
                @input="renderFrame"
                class="slider-input"
              />
              <div class="slider-track"></div>
              <div class="slider-value">{{ shieldGrade }}</div>
            </div>
            <button class="cyber-btn primary" @click="isOpenDrawer = true">
              <span class="btn-glow"></span>
              添加屏蔽词
            </button>
          </div>

          <!-- 透明度控制 -->
          <div class="setting-section">
            <div class="section-title">
              <span class="title-icon">👁️</span>
              不透明度
            </div>
            <div class="cyber-slider">
              <input 
                type="range" 
                v-model="opacity" 
                :min="0" 
                :max="100" 
                @input="opacityChange"
                class="slider-input"
              />
              <div class="slider-value">{{ opacity }}%</div>
            </div>
          </div>

          <!-- 显示区域 -->
          <div class="setting-section">
            <div class="section-title">
              <span class="title-icon">📺</span>
              显示区域
            </div>
            <div class="radio-group">
              <div 
                v-for="item in renderRegions" 
                :key="item.value"
                class="cyber-radio"
                :class="{ active: currentRenderRegions === item.value }"
                @click="currentRenderRegions = item.value; renderRegionsChange()"
              >
                <div class="radio-indicator"></div>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </div>

          <!-- 弹幕速度 -->
          <div class="setting-section">
            <div class="section-title">
              <span class="title-icon">⚡</span>
              弹幕速度
            </div>
            <div class="radio-group">
              <div 
                v-for="item in speeds" 
                :key="item.value"
                class="cyber-radio"
                :class="{ active: currentSpeed === item.value }"
                @click="currentSpeed = item.value; speedChange()"
              >
                <div class="radio-indicator"></div>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </div>

          <!-- AI功能开关 -->
          <div class="setting-section">
            <div class="section-title">
              <span class="title-icon">🤖</span>
              AI增强功能
            </div>
            <div class="ai-controls">
              <div class="ai-feature">
                <span>人像防挡</span>
                <div class="neon-switch mini" :class="{ active: isOpenPortraitUnobstructed }">
                  <input 
                    type="checkbox" 
                    v-model="isOpenPortraitUnobstructed" 
                    @change="handleAIUnobstructedChange"
                    id="ai-portrait"
                  />
                  <label for="ai-portrait">
                    <div class="switch-indicator"></div>
                  </label>
                </div>
              </div>
              <div class="ai-feature">
                <span>Worker渲染</span>
                <div class="neon-switch mini" :class="{ active: workerEnabled }">
                  <input 
                    type="checkbox" 
                    v-model="workerEnabled" 
                    @change="toggleWorkerMode"
                    :disabled="!workerSupported"
                    id="worker-mode"
                  />
                  <label for="worker-mode">
                    <div class="switch-indicator"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 调试面板 -->
    <div v-if="showDebugInfo" class="debug-terminal">
      <div class="terminal-header">
        <div class="terminal-title">
          <span class="terminal-icon">⚡</span>
          系统监控终端
        </div>
        <div class="terminal-controls">
          <button class="terminal-btn" @click="clearDebugLogs">清空</button>
          <button class="terminal-btn close" @click="showDebugInfo = false">×</button>
        </div>
      </div>
      
      <div class="terminal-content">
        <div class="system-status">
          <div class="status-item">
            <span class="status-label">Worker支持:</span>
            <span class="status-value" :class="workerSupported ? 'online' : 'offline'">
              {{ workerSupported ? 'ONLINE' : 'OFFLINE' }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">渲染模式:</span>
            <span class="status-value" :class="workerEnabled ? 'worker' : 'main'">
              {{ workerEnabled ? 'WORKER' : 'MAIN_THREAD' }}
            </span>
          </div>
        </div>
        
        <div class="terminal-logs">
          <div class="log-header">系统日志 [{{ debugLogs.length }}]</div>
          <div class="log-content">
            <div 
              v-for="(log, index) in debugLogs" 
              :key="index"
              class="log-line"
              :class="getLogClass(log)"
            >
              {{ log }}
            </div>
            <div v-if="debugLogs.length === 0" class="no-logs">
              等待系统日志...
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 屏蔽词管理抽屉 -->
    <el-drawer
      v-model="isOpenDrawer"
      title="屏蔽词管理"
      direction="rtl"
      :size="400"
      modal-class="cyberpunk-drawer-modal"
      class="cyberpunk-drawer"
    >
      <div class="shield-words-panel">
        <div class="words-list">
          <div 
            v-for="tag in shieldWords" 
            :key="tag"
            class="word-tag"
          >
            <span>{{ tag }}</span>
            <button class="remove-btn" @click="handleClose(tag)">×</button>
          </div>
        </div>
        
        <div class="add-word-section">
          <div v-if="shieldWordInputVisible" class="input-container">
            <input 
              ref="InputRef"
              v-model="shieldWordInputValue"
              class="word-input"
              placeholder="输入屏蔽词..."
              @keyup.enter="handleInputConfirm"
              @blur="handleInputConfirm"
            />
          </div>
          <div class="action-buttons">
            <button 
              v-if="!shieldWordInputVisible"
              class="cyber-btn primary"
              @click="showInput"
            >
              <span class="btn-glow"></span>
              添加屏蔽词
            </button>
            <button class="cyber-btn danger" @click="shieldWords = []">
              <span class="btn-glow"></span>
              清空全部
            </button>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>
<script setup lang="ts">
import BarrageRenderer, { BaseBarrage } from '../lib/index';
import { CompatibilityLayer, checkWorkerSupport } from '../lib/worker/index';
import { onMounted, ref, computed, watch, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { barrageImages, imageGroups, generateBarrageData } from './data';
import type { ImageGroups } from './data';
import {
  useBarrageOpen, useDisable, useResize,
  useOpacity, useRenderRegion, useSpeed,
  useAvoidOverlap, useVideoChange, useSendBarrage,
  usePortraitUnobstructed, useFontStrokeAndShadow,
} from './composables';

const barrageRenderer = ref<BarrageRenderer>();
const video = ref();

// 所有的 group
const imageGroupsRef = ref<ImageGroups[]>(imageGroups);
// 当前显示的 group id
const currentGroupId = ref(2);
// 当前应该显示的 group
const currentGroup = computed(() => imageGroupsRef.value.find(group => group.id === currentGroupId.value)!);

onMounted(async () => {
  // 创建 BarrageRenderer 实例
  barrageRenderer.value = new BarrageRenderer({
    container: 'container',
    video: video.value,
    barrageImages,
    renderConfig: {
      heightReduce: 70,
      speed: currentSpeed.value,
      renderRegion: currentRenderRegions.value,
      fontWeight: 'bold',
      opacity: opacity.value / 100,
      avoidOverlap: avoidOverlap.value,
      ...currentStrokeShadowConfig.value,
      barrageFilter: (barrage: BaseBarrage) => {
        // 弹幕类型的过滤
        if (disableJudges.value.some(disableJudge => disableJudge(barrage))) return false;
        // 弹幕等级过滤
        if (barrage.addition?.grade < shieldGrade.value) return false;
        // 关键词过滤
        if (shieldWords.value.some(word => barrage.text.includes(word))) return false;
        // 其他情况，不过滤
        return true;
      },
      priorBorderCustomRender: ({ ctx, barrage }) => {
        ctx.save();
        // 设定矩形左上角的偏移量
        const leftOffset = 6;
        const topOffset = 2;
        const { left, top, width, height } = barrage;
        // 设置圆角矩形路径
        ctx.roundRect(left - leftOffset, top - topOffset, width + 2 * leftOffset, height + 2 * topOffset, 10);
        // 绘制边框
        ctx.strokeStyle = '#89D5FF';
        ctx.lineWidth = 2;
        ctx.stroke();
        // 绘制背景色
        ctx.fillStyle = 'rgba(137, 213, 255, 0.3)'
        ctx.fill();
        ctx.restore();
      }
    },
    devConfig: {
      isRenderFPS: true,
      isRenderBarrageBorder: false,
      isLogKeyData: true
    },
    beforeFrameRender,
  });

  generateBarrageDataSet();
  // 初始化 Worker 离屏渲染
  await initWorkerRendering();
});
// 和 video 结合
const videoPlay = () => {
  barrageRenderer.value?.play();
};

const videoPause = () => {
  barrageRenderer.value?.pause();
};

// 是否打开弹幕
const { barrageOpen, barrageOpenChange } = useBarrageOpen(barrageRenderer);

// 屏蔽相关
const {
  barrageRenderList, disableJudges, shieldGrade, shieldWords,
  isOpenDrawer, handleClose, shieldWordInputVisible, shieldWordInputValue,
  handleInputConfirm, InputRef, showInput
} = useDisable();

// 触发一帧的渲染
const renderFrame = () => {
  barrageRenderer.value?.renderFrame();
};

watch(shieldWords, renderFrame, { deep: true });

// 尺寸变化 Canvas 自适应
useResize(barrageRenderer);

// 弹幕透明度
const { opacity, opacityChange } = useOpacity(barrageRenderer);

// 显示区域
const { renderRegions, currentRenderRegions, renderRegionsChange } = useRenderRegion(barrageRenderer);

// 弹幕速度
const { speeds, currentSpeed, speedChange } = useSpeed(barrageRenderer);

// 弹幕是否遮挡
const { avoidOverlap, avoidOverlapChange } = useAvoidOverlap(barrageRenderer);

// 视频切换
const { videos, currentVideo, currentVideoItem, videoSrc, changeNextVideo } = useVideoChange();

// 获取新的弹幕并 set
const generateBarrageDataSet = () => {
  // 获取弹幕数据
  const barrages = generateBarrageData(currentVideo.value, {
    isFixed: true,
    isScroll: true,
    isSenior: true,
    isSpecial: true,
    fixedNum: 200,
    scrollNum: 1000,
    seniorNum: 0,
    specialNum: 100,
  });
  barrageRenderer.value?.setBarrages(barrages);
}

watch(currentVideo, generateBarrageDataSet);
// 发送的弹幕（这里只处理发送滚动弹幕、顶部弹幕、底部弹幕）
const {
  barrageText, barrageImgClick, fontSizes,
  currentFontsize, barrageModes, currentBarrageMode,
  barrageColors, currentBarrageColor, sendBarrage,
  seniorBarrageConfig, sendSeniorBarrage, sendBlessingBarrage,
} = useSendBarrage(barrageRenderer, video);

// 蒙版相关
const {
  beforeFrameRender,
  isOpenPortraitUnobstructed,
  handleAIUnobstructedChange,
} = usePortraitUnobstructed(video, currentVideoItem, barrageRenderer as Ref<BarrageRenderer>);

// 字体描边、阴影相关
const {
  fontStrokeAndShadowConfigs,
  currentStrokeShadowId,
  currentStrokeShadowConfig,
} = useFontStrokeAndShadow(barrageRenderer);

// Worker 离屏渲染相关
const workerEnabled = ref(false);
const workerSupported = ref(checkWorkerSupport());
const workerLayer = ref<CompatibilityLayer | null>(null);

// 调试信息相关
const showDebugInfo = ref(false);
const debugLogs = ref<string[]>([]);
const maxDebugLogs = 50;

// 添加调试日志的方法
const addDebugLog = (message: string, type: 'info' | 'warn' | 'error' = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  debugLogs.value.unshift(logMessage);
  if (debugLogs.value.length > maxDebugLogs) {
    debugLogs.value = debugLogs.value.slice(0, maxDebugLogs);
  }
  console.log(`🚀 Worker Debug: ${logMessage}`);
};

// 初始化 Worker 离屏渲染
const initWorkerRendering = async () => {
  if (!barrageRenderer.value || !workerSupported.value) {
    addDebugLog(workerSupported.value ? '弹幕渲染器未初始化' : '浏览器不支持 Worker 离屏渲染', 'warn');
    return;
  }

  try {
    addDebugLog('初始化 Worker 离屏渲染...');
    const canvas = document.querySelector('#container canvas') as HTMLCanvasElement;
    if (!canvas) {
      addDebugLog('找不到 Canvas 元素', 'error');
      return;
    }

    workerLayer.value = new CompatibilityLayer();
    await workerLayer.value.initialize(canvas, barrageRenderer.value, true);
    workerEnabled.value = workerLayer.value.getCurrentMode() === 'worker';
    addDebugLog(`Worker 渲染模式: ${workerLayer.value.getCurrentMode()}`, 'info');
  } catch (error: any) {
    addDebugLog(`Worker 初始化失败: ${error.message}`, 'error');
  }
};
// 切换 Worker 模式
const toggleWorkerMode = async () => {
  if (!workerLayer.value) return;

  try {
    await workerLayer.value.setWorkerMode(workerEnabled.value);
    addDebugLog(`已切换到 ${workerLayer.value.getCurrentMode()} 模式`, 'info');
  } catch (error: any) {
    workerEnabled.value = !workerEnabled.value;
    addDebugLog(`切换失败: ${error.message}`, 'error');
  }
};

// 清空调试日志
const clearDebugLogs = () => {
  debugLogs.value = [];
  addDebugLog('调试日志已清空');
};

// 获取日志样式类别
const getLogClass = (log: string) => {
  if (log.includes('[ERROR]')) return 'log-error';
  if (log.includes('[WARN]')) return 'log-warn';
  if (log.includes('[INFO]')) return 'log-info';
  return 'log-default';
};

// 组件销毁时清理资源
onUnmounted(() => {
  workerLayer.value?.destroy();
  barrageRenderer.value?.destroy();
});
</script>
<style scoped>
/* 赛博朋克主题色彩变量 */
:root {
  --cyber-primary: #00ffff;
  --cyber-secondary: #ff0080;
  --cyber-accent: #ffff00;
  --cyber-bg-dark: #0a0a0f;
  --cyber-bg-darker: #050508;
  --cyber-panel: rgba(10, 10, 15, 0.9);
  --cyber-border: rgba(0, 255, 255, 0.3);
  --cyber-glow: 0 0 20px rgba(0, 255, 255, 0.5);
  --cyber-text: #ffffff;
  --cyber-text-dim: #a0a0a0;
}

/* 主容器 */
.cyberpunk-main {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #16213e 100%);
  position: relative;
  overflow: hidden;
  font-family: 'Courier New', 'Monaco', monospace;
  color: var(--cyber-text);
}

/* 背景动画层 */
.bg-animation {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

.scan-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    transparent 50%,
    rgba(0, 255, 255, 0.03) 50%
  );
  background-size: 100% 4px;
  animation: scanLines 0.1s linear infinite;
}

@keyframes scanLines {
  0% { transform: translateY(0); }
  100% { transform: translateY(4px); }
}

.floating-particles {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(2px 2px at 20px 30px, rgba(0, 255, 255, 0.3), transparent),
    radial-gradient(2px 2px at 40px 70px, rgba(255, 0, 128, 0.3), transparent),
    radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 0, 0.3), transparent);
  background-repeat: repeat;
  background-size: 200px 100px;
  animation: particleFloat 15s ease-in-out infinite;
}

@keyframes particleFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

/* 播放器容器 */
.player-container {
  position: relative;
  z-index: 1;
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* 主内容区（视频+控制） */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 设置侧边栏 */
.settings-sidebar {
  position: sticky;
  top: 20px;
  width: 320px;
  flex-shrink: 0;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}

.sidebar-glow {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, var(--cyber-primary), var(--cyber-secondary), var(--cyber-accent));
  border-radius: 10px;
  z-index: -1;
  opacity: 0.3;
  filter: blur(4px);
}

.sidebar-panel {
  background: var(--cyber-panel);
  border: 1px solid var(--cyber-border);
  border-radius: 10px;
  padding: 20px;
  backdrop-filter: blur(10px);
  box-shadow: var(--cyber-glow);
}

/* 视频区域 */
.video-section {
  margin-bottom: 0;
}

.video-frame {
  position: relative;
  border-radius: 10px;
  overflow: visible;
  background: var(--cyber-bg-darker);
  box-shadow: 
    0 0 30px rgba(0, 255, 255, 0.2),
    inset 0 0 30px rgba(0, 255, 255, 0.1);
}

.video-wrapper {
  position: relative;
  width: 100%;
  height: 70vh;
  min-height: 400px;
  border-radius: 10px;
  overflow: hidden;
}

#video {
  width: 100%;
  object-fit: cover;
  background: #000;
}

/* 底部控制栏 - 紧贴视频底部 */
.control-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px 15px;
  background: rgba(10, 10, 20, 0.9);
  border-top: 2px solid rgba(0, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  z-index: 100;
}

/* 霓虹开关增强 */
.neon-switch {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.cyber-btn:hover .btn-glow {
  left: 100%;
}

.icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

/* 输入区域 */
.input-section {
  flex: 1;
  max-width: 600px;
}

.cyber-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--cyber-border);
  border-radius: 25px;
  padding: 5px;
  transition: all 0.3s ease;
}

.cyber-input-group:focus-within {
  border-color: var(--cyber-primary);
  box-shadow: var(--cyber-glow);
}

.cyber-input {
  flex: 1;
  position: relative;
}

.input-field {
  width: 100%;
  padding: 10px 15px;
  background: transparent;
  border: none;
  color: var(--cyber-text);
  font-family: inherit;
  font-size: 14px;
  outline: none;
}

.input-field::placeholder {
  color: var(--cyber-text-dim);
}

.input-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 20px;
  background: linear-gradient(45deg, transparent, rgba(0, 255, 255, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cyber-input:focus-within .input-glow {
  opacity: 1;
}

.input-addon-btn {
  padding: 8px;
  background: transparent;
  border: 1px solid var(--cyber-border);
  border-radius: 50%;
  color: var(--cyber-text-dim);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-addon-btn:hover {
  border-color: var(--cyber-primary);
  color: var(--cyber-primary);
  transform: scale(1.1);
}

.send-buttons {
  display: flex;
  gap: 5px;
}

/* 选择框 */
.cyber-select {
  position: relative;
}

.select-field {
  padding: 10px 15px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid var(--cyber-border);
  border-radius: 5px;
  color: var(--cyber-text);
  font-family: inherit;
  cursor: pointer;
  min-width: 150px;
}

.select-field:focus {
  outline: none;
  border-color: var(--cyber-primary);
  box-shadow: var(--cyber-glow);
}

.select-glow {
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  border-radius: 5px;
  background: linear-gradient(45deg, var(--cyber-primary), var(--cyber-secondary));
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cyber-select:focus-within .select-glow {
  opacity: 0.3;
}
/* 设置面板 */
.settings-panel {
  background: var(--cyber-bg-darker);
  border: 1px solid var(--cyber-border);
  border-radius: 10px;
  padding: 20px;
  color: var(--cyber-text);
}

.panel-header {
  margin-bottom: 20px;
}

.panel-header h3 {
  margin: 0;
  color: var(--cyber-primary);
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.header-line {
  height: 2px;
  background: linear-gradient(90deg, var(--cyber-primary), transparent);
  margin-top: 5px;
}

.setting-section {
  margin-bottom: 25px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  color: var(--cyber-accent);
  font-weight: bold;
  font-size: 14px;
  text-transform: uppercase;
}

.title-icon {
  font-size: 16px;
}

/* 复选框网格 */
.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.cyber-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--cyber-border);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px;
}

.cyber-checkbox:hover {
  border-color: var(--cyber-primary);
  background: rgba(0, 255, 255, 0.05);
}

.cyber-checkbox.checked {
  border-color: var(--cyber-primary);
  background: rgba(0, 255, 255, 0.1);
}

.checkbox-indicator {
  width: 12px;
  height: 12px;
  border: 1px solid var(--cyber-border);
  border-radius: 2px;
  position: relative;
  transition: all 0.3s ease;
}

.cyber-checkbox.checked .checkbox-indicator {
  background: var(--cyber-primary);
  border-color: var(--cyber-primary);
  box-shadow: 0 0 5px var(--cyber-primary);
}

.cyber-checkbox.checked .checkbox-indicator::after {
  content: '✓';
  position: absolute;
  top: -2px;
  left: 1px;
  color: var(--cyber-bg-dark);
  font-size: 10px;
  font-weight: bold;
}

/* 滑块 */
.cyber-slider {
  position: relative;
  margin: 10px 0;
}

.slider-input {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: var(--cyber-primary);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 10px var(--cyber-primary);
  transition: all 0.3s ease;
}

.slider-input::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 15px var(--cyber-primary);
}

.slider-value {
  position: absolute;
  top: -30px;
  right: 0;
  background: var(--cyber-primary);
  color: var(--cyber-bg-dark);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}

/* 单选按钮组 */
.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cyber-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--cyber-border);
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px;
}

.cyber-radio:hover {
  border-color: var(--cyber-primary);
  background: rgba(0, 255, 255, 0.05);
}

.cyber-radio.active {
  border-color: var(--cyber-primary);
  background: rgba(0, 255, 255, 0.1);
  color: var(--cyber-primary);
}

.radio-indicator {
  width: 10px;
  height: 10px;
  border: 1px solid var(--cyber-border);
  border-radius: 50%;
  position: relative;
  transition: all 0.3s ease;
}

.cyber-radio.active .radio-indicator {
  border-color: var(--cyber-primary);
  background: var(--cyber-primary);
  box-shadow: 0 0 5px var(--cyber-primary);
}

/* AI控制区域 */
.ai-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-feature {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--cyber-border);
  border-radius: 5px;
  font-size: 12px;
}

/* 样式面板 */
.style-panel {
  background: var(--cyber-bg-darker);
  border: 1px solid var(--cyber-border);
  border-radius: 10px;
  padding: 15px;
  color: var(--cyber-text);
}

.style-section {
  margin-bottom: 15px;
}

.style-section:last-child {
  margin-bottom: 0;
}

.size-options, .mode-options {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.size-option, .mode-option {
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--cyber-border);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 11px;
}

.size-option:hover, .mode-option:hover {
  border-color: var(--cyber-primary);
}

.size-option.active, .mode-option.active {
  background: var(--cyber-primary);
  color: var(--cyber-bg-dark);
  border-color: var(--cyber-primary);
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-top: 8px;
}

.color-option {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

.color-option:hover {
  transform: scale(1.1);
  border-color: var(--cyber-text);
}

.color-option.active {
  border-color: var(--cyber-primary);
  box-shadow: 0 0 5px var(--cyber-primary);
  transform: scale(1.2);
}

/* 图片面板 */
.image-panel {
  background: var(--cyber-bg-darker);
  border: 1px solid var(--cyber-border);
  border-radius: 10px;
  padding: 15px;
  color: var(--cyber-text);
}

.image-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 15px;
}

.image-tab {
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--cyber-border);
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px;
}

.image-tab:hover {
  border-color: var(--cyber-primary);
}

.image-tab.active {
  background: var(--cyber-primary);
  color: var(--cyber-bg-dark);
  border-color: var(--cyber-primary);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.barrage-img {
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.barrage-img:hover {
  border-color: var(--cyber-primary);
  transform: scale(1.05);
  box-shadow: 0 0 10px var(--cyber-primary);
}
/* 调试终端 */
.debug-terminal {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 450px;
  max-height: 80vh;
  background: var(--cyber-bg-darker);
  border: 1px solid var(--cyber-primary);
  border-radius: 10px;
  box-shadow: 
    0 0 30px rgba(0, 255, 255, 0.3),
    inset 0 0 30px rgba(0, 255, 255, 0.05);
  z-index: 1000;
  font-family: 'Courier New', monospace;
  overflow: hidden;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(0, 255, 255, 0.1);
  border-bottom: 1px solid var(--cyber-primary);
}

.terminal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--cyber-primary);
  font-weight: bold;
  font-size: 14px;
  text-transform: uppercase;
}

.terminal-icon {
  font-size: 16px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.terminal-controls {
  display: flex;
  gap: 8px;
}

.terminal-btn {
  padding: 4px 8px;
  background: transparent;
  border: 1px solid var(--cyber-border);
  border-radius: 3px;
  color: var(--cyber-text);
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.terminal-btn:hover {
  border-color: var(--cyber-primary);
  color: var(--cyber-primary);
}

.terminal-btn.close {
  border-color: #ff4444;
  color: #ff4444;
}

.terminal-btn.close:hover {
  background: rgba(255, 68, 68, 0.1);
}

.terminal-content {
  padding: 15px 20px;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.system-status {
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--cyber-border);
  border-radius: 5px;
  margin-bottom: 8px;
  font-size: 12px;
}

.status-label {
  color: var(--cyber-text-dim);
}

.status-value {
  font-weight: bold;
  text-transform: uppercase;
}

.status-value.online {
  color: #4CAF50;
  text-shadow: 0 0 5px #4CAF50;
}

.status-value.offline {
  color: #f44336;
  text-shadow: 0 0 5px #f44336;
}

.status-value.worker {
  color: var(--cyber-primary);
  text-shadow: 0 0 5px var(--cyber-primary);
}

.status-value.main {
  color: var(--cyber-accent);
  text-shadow: 0 0 5px var(--cyber-accent);
}

.terminal-logs {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--cyber-border);
  border-radius: 5px;
  padding: 10px;
}

.log-header {
  color: var(--cyber-accent);
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.log-content {
  max-height: 250px;
  overflow-y: auto;
}

.log-line {
  font-size: 11px;
  line-height: 1.4;
  margin-bottom: 4px;
  padding: 2px 0;
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
}

.log-line:last-child {
  border-bottom: none;
}

.log-error {
  color: #f44336;
}

.log-warn {
  color: #FF9800;
}

.log-info {
  color: #4CAF50;
}

.log-default {
  color: var(--cyber-text-dim);
}

.no-logs {
  color: var(--cyber-text-dim);
  text-align: center;
  padding: 20px;
  font-style: italic;
  font-size: 12px;
}

/* 屏蔽词管理抽屉 */
.shield-words-panel {
  padding: 20px;
  background: var(--cyber-bg-darker);
  color: var(--cyber-text);
  height: 100%;
}

.words-list {
  margin-bottom: 30px;
}

.word-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid var(--cyber-primary);
  border-radius: 15px;
  margin: 4px;
  font-size: 12px;
  color: var(--cyber-primary);
}

.remove-btn {
  background: none;
  border: none;
  color: var(--cyber-secondary);
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.remove-btn:hover {
  background: var(--cyber-secondary);
  color: var(--cyber-bg-dark);
}

.add-word-section {
  border-top: 1px solid var(--cyber-border);
  padding-top: 20px;
}

.input-container {
  margin-bottom: 15px;
}

.word-input {
  width: 100%;
  padding: 10px 15px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--cyber-border);
  border-radius: 5px;
  color: var(--cyber-text);
  font-family: inherit;
  outline: none;
}

.word-input:focus {
  border-color: var(--cyber-primary);
  box-shadow: var(--cyber-glow);
}

.action-buttons {
  display: flex;
  gap: 10px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .player-container {
    flex-direction: column;
  }

  .settings-sidebar {
    position: relative;
    width: 100%;
    max-height: none;
    top: 0;
  }

  .main-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .input-section {
    max-width: none;
  }

  .debug-terminal {
    width: 90vw;
    right: 5vw;
  }
}

@media (max-width: 768px) {
  .player-container {
    padding: 10px;
  }

  .video-wrapper {
    height: 50vh;
    min-height: 300px;
  }

  .cyber-input-group {
    flex-direction: column;
    align-items: stretch;
    border-radius: 10px;
  }

  .send-buttons {
    justify-content: center;
  }

  .checkbox-grid {
    grid-template-columns: 1fr;
  }

  .radio-group {
    flex-direction: column;
  }

  .debug-terminal {
    top: 10px;
    right: 10px;
    left: 10px;
    width: auto;
  }
}

/* 全局弹窗样式 */
:global(.cyberpunk-popover) {
  background: var(--cyber-bg-darker) !important;
  border: 1px solid var(--cyber-border) !important;
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.2) !important;
}

:global(.cyberpunk-drawer-modal) {
  background: rgba(0, 0, 0, 0.8) !important;
  backdrop-filter: blur(5px) !important;
}

:global(.cyberpunk-drawer) {
  background: var(--cyber-bg-darker) !important;
  border-left: 1px solid var(--cyber-primary) !important;
  box-shadow: -10px 0 30px rgba(0, 255, 255, 0.2) !important;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--cyber-primary);
  border-radius: 4px;
  box-shadow: 0 0 5px var(--cyber-primary);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 255, 0.8);
}
</style>