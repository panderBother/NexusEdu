import {  ref, onUnmounted } from 'vue';
import BarrageRenderer from '../../lib/index';
import type { VideoItem } from './videoChange';
import type { Ref } from 'vue';
import type { FrameRenderHook } from '../../lib/index.ts';

import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@mediapipe/selfie_segmentation';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';

// 推理用的缩小尺寸，越小越快，256x144 在大多数场景下精度够用
const INFER_W = 256;
const INFER_H = 144;
// 推理间隔（ms），100ms ≈ 10fps，主线程渲染帧不受影响
const INFER_INTERVAL = 100;

export default function usePortraitUnobstructed(
  video: Ref<HTMLVideoElement>,
  _currentVideoItem: Ref<VideoItem | undefined>,
  barrageRenderer: Ref<BarrageRenderer>
) {
  const isOpenPortraitUnobstructed = ref(false);

  // 推理用的小尺寸离屏 canvas
  const grabCanvas = document.createElement('canvas');
  grabCanvas.width = INFER_W;
  grabCanvas.height = INFER_H;
  const grabCtx = grabCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;

  // 遮罩 canvas，与视频元素逻辑尺寸一致，供渲染器使用
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d')!;
  let hasMask = false;

  let segmenter: bodySegmentation.BodySegmenter | null = null;
  let segmenterLoading = false;
  // 推理是否正在进行中（防止重叠调用）
  let inferring = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const initSegmenter = async () => {
    if (segmenter || segmenterLoading) return;
    segmenterLoading = true;
    console.log('[AI防遮挡] 开始加载模型...');
    try {
      segmenter = await bodySegmentation.createSegmenter(
        bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
        {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
          modelType: 'general',
        }
      );
      console.log('[AI防遮挡] 模型加载完成');
      startInferLoop();
    } catch (e) {
      console.error('[AI防遮挡] 模型加载失败:', e);
    } finally {
      segmenterLoading = false;
    }
  };

  const destroySegmenter = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    segmenter?.dispose();
    segmenter = null;
    hasMask = false;
    inferring = false;
    barrageRenderer.value?.setMask();
  };

  /**
   * 推理循环：用 setTimeout 而非 rAF，与渲染帧完全解耦。
   * 推理期间渲染帧继续用上一次的 mask，不会卡顿。
   */
  const startInferLoop = () => {
    const loop = async () => {
      if (!segmenter || !isOpenPortraitUnobstructed.value) return;

      if (!inferring && video.value?.readyState >= video.value?.HAVE_ENOUGH_DATA) {
        inferring = true;
        await runSegmentation();
        inferring = false;
      }

      timerId = setTimeout(loop, INFER_INTERVAL);
    };
    timerId = setTimeout(loop, INFER_INTERVAL);
  };

  const runSegmentation = async () => {
    if (!segmenter || !video.value || !barrageRenderer.value) return;

    const vw = video.value.clientWidth;
    const vh = video.value.clientHeight;
    if (!vw || !vh) return;

    // 把视频帧缩小绘制到 grabCanvas，推理速度大幅提升
    grabCtx.clearRect(0, 0, INFER_W, INFER_H);
    grabCtx.drawImage(video.value, 0, 0, INFER_W, INFER_H);
    const imageData = grabCtx.getImageData(0, 0, INFER_W, INFER_H);

    try {
      const people = await segmenter.segmentPeople(imageData);

      const mask = await bodySegmentation.toBinaryMask(
        people,
        { r: 0, g: 0, b: 0, a: 255 }, // 人体：不透明 → source-out 裁掉弹幕
        { r: 0, g: 0, b: 0, a: 0 },   // 背景：透明 → 弹幕正常显示
        false,
        0.5
      );

      // maskCanvas 保持视频逻辑尺寸，把小尺寸 mask 拉伸上去
      if (maskCanvas.width !== vw || maskCanvas.height !== vh) {
        maskCanvas.width = vw;
        maskCanvas.height = vh;
      }
      maskCtx.clearRect(0, 0, vw, vh);

      // mask → tempCanvas → 拉伸到 maskCanvas（视频尺寸）
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = mask.width;
      tempCanvas.height = mask.height;
      tempCanvas.getContext('2d')!.putImageData(mask, 0, 0);
      maskCtx.drawImage(tempCanvas, 0, 0, vw, vh);
      hasMask = true;

    } catch {
      // 推理失败静默忽略，继续用上一帧 mask
    }
  };

  // 每帧渲染前同步设置遮罩（同步，零开销）
  const beforeFrameRender: FrameRenderHook = ({ br }) => {
    if (isOpenPortraitUnobstructed.value && hasMask) {
      br.setMask(maskCanvas);
    } else if (!isOpenPortraitUnobstructed.value) {
      br.setMask();
    }
  };

  const handleAIUnobstructedChange = async () => {
    if (isOpenPortraitUnobstructed.value) {
      await initSegmenter();
    } else {
      destroySegmenter();
    }
  };

  onUnmounted(() => {
    destroySegmenter();
  });

  return {
    beforeFrameRender,
    isOpenPortraitUnobstructed,
    handleAIUnobstructedChange,
  };
}
