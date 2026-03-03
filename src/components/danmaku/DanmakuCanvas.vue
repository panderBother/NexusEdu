<template>
  <div class="danmaku-canvas-container" ref="containerRef">
    <canvas
      ref="canvasRef"
      class="danmaku-canvas"
      :width="canvasWidth"
      :height="canvasHeight"
      :style="canvasStyle"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useDanmakuStore } from '@/stores/danmaku'
import type { DanmakuConfig } from '@/danmaku/types'

const props = withDefaults(defineProps<{
  width?: number
  height?: number
  config?: Partial<DanmakuConfig>
}>(), {
  width: 1920,
  height: 1080
})

const danmakuStore = useDanmakuStore()

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const canvasWidth = ref(props.width)
const canvasHeight = ref(props.height)

// Canvas 样式（应用透明度）
const canvasStyle = computed(() => ({
  opacity: danmakuStore.currentOpacity,
  display: danmakuStore.isVisible ? 'block' : 'none'
}))

// 初始化弹幕系统
onMounted(async () => {
  if (!canvasRef.value) {
    console.error('Canvas element not found')
    return
  }

  // 响应式调整 canvas 大小
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)

  // 初始化弹幕系统
  const config: DanmakuConfig = {
    width: canvasWidth.value,
    height: canvasHeight.value,
    maxDanmaku: 200,
    trackHeight: 30,
    trackGap: 10,
    useOffscreen: true,
    cacheSize: 100,
    ...props.config
  }

  try {
    await danmakuStore.initialize(canvasRef.value, config)
    danmakuStore.start()
    console.log('Danmaku canvas initialized')
  } catch (error) {
    console.error('Failed to initialize danmaku canvas:', error)
  }
})

// 清理
onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize)
  danmakuStore.stop()
})

// 更新 canvas 大小
function updateCanvasSize() {
  if (!containerRef.value) {
    return
  }

  const rect = containerRef.value.getBoundingClientRect()
  canvasWidth.value = rect.width
  canvasHeight.value = rect.height
}

// 监听设置变化
watch(() => danmakuStore.settings, (newSettings) => {
  console.log('Settings changed:', newSettings)
}, { deep: true })
</script>

<style scoped>
.danmaku-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.danmaku-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
  transition: opacity 0.3s ease;
}
</style>
