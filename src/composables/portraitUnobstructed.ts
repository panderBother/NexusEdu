import { ref, onUnmounted } from "vue";
import BarrageRenderer from "../../lib/index";
import type { VideoItem } from "./videoChange";
import type { Ref } from "vue";
import type { FrameRenderHook } from "../../lib/index.ts";

import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@mediapipe/selfie_segmentation";
import * as bodySegmentation from "@tensorflow-models/body-segmentation";

// 推理用的小尺寸，越小越快，精度与性能平衡
const INFER_W = 256;
const INFER_H = 144;
// 推理频率，150ms~66ms 之间体验较好，默认 66ms 约 15 FPS
const INFER_INTERVAL = 66;
// 连续无人帧次数阈值
const MAX_NO_PERSON_FRAMES = 3;

export default function usePortraitUnobstructed(
  video: Ref<HTMLVideoElement>,
  _currentVideoItem: Ref<VideoItem | undefined>,
  barrageRenderer: Ref<BarrageRenderer>,
) {
  const isOpenPortraitUnobstructed = ref(false);

  const grabCanvas = document.createElement("canvas");
  grabCanvas.width = INFER_W;
  grabCanvas.height = INFER_H;
  const grabCtx = grabCanvas.getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;

  const maskCanvas = document.createElement("canvas");
  const maskCtx = maskCanvas.getContext("2d");
  let hasMask = false;

  let segmenter: bodySegmentation.BodySegmenter | null = null;
  let segmenterLoading = false;
  let inferring = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let worker: Worker | null = null;
  let noPersonFrameCount = 0;

  const initWorker = () => {
    if (worker) return;

    worker = new Worker(
      new URL("./portraitUnobstructedWorker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    worker.onmessage = (event: MessageEvent) => {
      const { type, maskImageBitmap, hasPersonPixels } = event.data;
      if (type !== "mask") return;

      if (!hasPersonPixels) {
        noPersonFrameCount += 1;
        if (noPersonFrameCount >= MAX_NO_PERSON_FRAMES) {
          hasMask = false;
          barrageRenderer.value?.setMask();
          return;
        }
      } else {
        noPersonFrameCount = 0;
      }

      if (!maskImageBitmap || !maskCtx || !video.value) {
        return;
      }

      const vw = video.value.clientWidth;
      const vh = video.value.clientHeight;
      if (!vw || !vh) return;

      if (maskCanvas.width !== vw || maskCanvas.height !== vh) {
        maskCanvas.width = vw;
        maskCanvas.height = vh;
      }

      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.drawImage(
        maskImageBitmap,
        0,
        0,
        maskCanvas.width,
        maskCanvas.height,
      );
      maskImageBitmap.close();
      hasMask = true;
      barrageRenderer.value?.setMask(maskCanvas);
    };
  };

  const destroyWorker = () => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  };

  const initSegmenter = async () => {
    if (segmenter || segmenterLoading) return;
    segmenterLoading = true;
    console.log("[AI防遮挡] 开始加载模型...");

    initWorker();

    try {
      segmenter = await bodySegmentation.createSegmenter(
        bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
        {
          runtime: "mediapipe",
          solutionPath:
            "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation",
          modelType: "general",
        },
      );

      console.log("[AI防遮挡] 模型加载完成");
      startInferLoop();
    } catch (e) {
      console.error("[AI防遮挡] 模型加载失败:", e);
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
    destroyWorker();
    hasMask = false;
    inferring = false;
    noPersonFrameCount = 0;
    barrageRenderer.value?.setMask();
  };

  const startInferLoop = () => {
    const loop = async () => {
      if (!segmenter || !isOpenPortraitUnobstructed.value || !video.value)
        return;

      if (
        !inferring &&
        !video.value.paused &&
        video.value.readyState >= video.value.HAVE_ENOUGH_DATA
      ) {
        inferring = true;
        await runSegmentation();
        inferring = false;
      }

      timerId = setTimeout(loop, INFER_INTERVAL);
    };
    timerId = setTimeout(loop, INFER_INTERVAL);
  };

  const runSegmentation = async () => {
    if (!segmenter || !video.value || !worker) return;
    if (!maskCtx) return;

    const vw = video.value.clientWidth || video.value.videoWidth;
    const vh = video.value.clientHeight || video.value.videoHeight;
    if (!vw || !vh) return;

    grabCtx.clearRect(0, 0, INFER_W, INFER_H);
    grabCtx.drawImage(video.value, 0, 0, INFER_W, INFER_H);

    try {
      const segmentation = await segmenter.segmentPeople(grabCanvas);
      if (!segmentation || segmentation.length === 0) {
        noPersonFrameCount += 1;
        if (noPersonFrameCount >= MAX_NO_PERSON_FRAMES) {
          hasMask = false;
          barrageRenderer.value?.setMask();
        }
        return;
      }

      let maskSource = await segmentation[0].mask.toCanvasImageSource();
      if (!(maskSource instanceof ImageBitmap)) {
        maskSource = await createImageBitmap(maskSource as CanvasImageSource);
      }

      worker.postMessage(
        {
          type: "process",
          source: maskSource,
          width: INFER_W,
          height: INFER_H,
        },
        [maskSource],
      );
    } catch (err) {
      console.error("[AI防遮挡] 分割失败:", err);
    }
  };

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
