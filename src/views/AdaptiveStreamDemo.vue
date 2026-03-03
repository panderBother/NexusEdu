<template>
  <div class="adaptive-stream-demo">
    <div class="demo-header">
      <h1>多协议自适应拉流系统</h1>
      <p class="description">
        智能视频流播放解决方案，根据网络状况自动在 WebRTC、FLV 和 HLS 三种协议间切换
      </p>
    </div>

    <div class="demo-content">
      <!-- 播放器组件 -->
      <AdaptivePlayer />

      <!-- 使用说明 -->
      <div class="usage-guide">
        <h2>使用说明</h2>
        <div class="guide-section">
          <h3>🎯 功能特性</h3>
          <ul>
            <li><strong>自动协议切换：</strong>根据网络质量自动选择最优协议</li>
            <li><strong>低延迟优先：</strong>网络良好时优先使用 WebRTC 协议</li>
            <li><strong>无缝切换：</strong>协议切换过程平滑，不中断播放</li>
            <li><strong>手动控制：</strong>支持手动选择播放协议</li>
          </ul>
        </div>

        <div class="guide-section">
          <h3>📊 协议说明</h3>
          <div class="protocol-info">
            <div class="protocol-card">
              <h4>WebRTC</h4>
              <p class="protocol-desc">超低延迟（&lt;1秒）</p>
              <p class="protocol-usage">适用于网络质量优秀时</p>
            </div>
            <div class="protocol-card">
              <h4>FLV</h4>
              <p class="protocol-desc">低延迟（1-3秒）</p>
              <p class="protocol-usage">适用于网络质量良好时</p>
            </div>
            <div class="protocol-card">
              <h4>HLS</h4>
              <p class="protocol-desc">高延迟（5-10秒）</p>
              <p class="protocol-usage">适用于网络质量较差时</p>
            </div>
          </div>
        </div>

        <div class="guide-section">
          <h3>🔧 操作指南</h3>
          <ol>
            <li><strong>自动模式：</strong>系统会根据网络状况自动选择最优协议</li>
            <li><strong>手动模式：</strong>点击"切换到手动"按钮，然后选择想要的协议</li>
            <li><strong>查看状态：</strong>实时查看当前协议、网络质量和播放状态</li>
            <li><strong>网络指标：</strong>查看 RTT、丢包率和带宽等详细指标</li>
          </ol>
        </div>

        <div class="guide-section">
          <h3>⚙️ 配置信息</h3>
          <div class="config-info">
            <div class="config-item">
              <span class="config-label">SRS 服务器：</span>
              <span class="config-value">{{ store.config.srsHost }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">应用名称：</span>
              <span class="config-value">{{ store.config.app }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">流 ID：</span>
              <span class="config-value">{{ store.config.streamId }}</span>
            </div>
          </div>
        </div>

        <div class="guide-section">
          <h3>💡 技术架构</h3>
          <ul>
            <li><strong>网络监测：</strong>每 2 秒采集一次网络指标（RTT、丢包率、带宽）</li>
            <li><strong>智能决策：</strong>连续 3 次采样稳定后才执行协议切换</li>
            <li><strong>频率限制：</strong>两次切换之间至少间隔 10 秒</li>
            <li><strong>错误恢复：</strong>切换失败时自动降级到下一个协议</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStreamStore } from '@/stores/stream';
import AdaptivePlayer from '@/components/AdaptivePlayer.vue';

const store = useStreamStore();
</script>

<style scoped>
.adaptive-stream-demo {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
}

.demo-header {
  text-align: center;
  color: white;
  margin-bottom: 40px;
}

.demo-header h1 {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 15px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.description {
  font-size: 18px;
  opacity: 0.95;
  max-width: 800px;
  margin: 0 auto;
}

.demo-content {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  align-items: start;
}

.usage-guide {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.usage-guide h2 {
  font-size: 28px;
  color: #333;
  margin-bottom: 25px;
  border-bottom: 3px solid #667eea;
  padding-bottom: 10px;
}

.guide-section {
  margin-bottom: 30px;
}

.guide-section h3 {
  font-size: 20px;
  color: #555;
  margin-bottom: 15px;
}

.guide-section ul,
.guide-section ol {
  padding-left: 25px;
  line-height: 1.8;
  color: #666;
}

.guide-section li {
  margin-bottom: 10px;
}

.guide-section strong {
  color: #333;
}

.protocol-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-top: 15px;
}

.protocol-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  border: 2px solid #e9ecef;
  transition: all 0.3s;
}

.protocol-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.protocol-card h4 {
  font-size: 18px;
  color: #667eea;
  margin-bottom: 10px;
}

.protocol-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.protocol-usage {
  font-size: 13px;
  color: #999;
}

.config-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-top: 15px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #e9ecef;
}

.config-item:last-child {
  border-bottom: none;
}

.config-label {
  font-weight: 600;
  color: #555;
}

.config-value {
  color: #667eea;
  font-family: 'Courier New', monospace;
}

@media (max-width: 1200px) {
  .demo-content {
    grid-template-columns: 1fr;
  }

  .protocol-info {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .demo-header h1 {
    font-size: 28px;
  }

  .description {
    font-size: 16px;
  }

  .usage-guide {
    padding: 20px;
  }

  .usage-guide h2 {
    font-size: 24px;
  }

  .guide-section h3 {
    font-size: 18px;
  }
}
</style>
