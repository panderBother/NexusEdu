import { ref, onUnmounted } from "vue";
import BarrageRenderer from "../../lib/index";
import type { VideoItem } from "./videoChange";
import type { Ref } from "vue";
import type { FrameRenderHook } from "../../lib/index.ts";

// 推理用的小尺寸，越小越快，精度与性能平衡
const INFER_W = 256;
const INFER_H = 144;
// 推理频率，66ms 约 15 FPS；模型加载较慢时由 worker ready 后再启动
const INFER_INTERVAL = 66;
// 连续无人帧次数阈值
const MAX_NO_PERSON_FRAMES = 3;

export default function usePortraitUnobstructed(
  video: Ref<HTMLVideoElement>,
  _currentVideoItem: Ref<VideoItem | undefined>,
  barrageRenderer: Ref<BarrageRenderer>,
) {
  const isOpenPortraitUnobstructed = ref(false);

  // 抓帧用 canvas（主线程唯一接触 video 像素的地方）
  const grabCanvas = document.createElement("canvas");
  grabCanvas.width = INFER_W;
  grabCanvas.height = INFER_H;
  const grabCtx = grabCanvas.getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;

  // mask 输出 canvas，最终交给 BarrageRenderer.setMask
  const maskCanvas = document.createElement("canvas");
  const maskCtx = maskCanvas.getContext("2d");
  let hasMask = false;

  let worker: Worker | null = null;
  let workerReady = false;
  // fallback：worker 不可用时回退到主线程推理
  let fallbackSegmenter: any = null;
  let useFallback = false;

  let inferring = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let noPersonFrameCount = 0;

  // 性能指标，供 UI / 实测展示
  const stats = {
    inferenceMs: 0,
    inferenceCount: 0,
    lastInferenceMs: 0,
    maxInferenceMs: 0,
    workerMode: false,
  };

  const initWorker = () => {
    if (worker) return;
    worker = new Worker(
      new URL("./portraitUnobstructedWorker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === "ready") {
        workerReady = true;
        stats.workerMode = true;
        console.log("[AI防遮挡] Worker 模型加载完成，推理在 Worker 线程运行");
      } else if (data.type === "init_error") {
        console.warn(
          "[AI防遮挡] Worker 模型加载失败，回退到主线程推理:",
          data.message,
        );
        useFallback = true;
        initFallbackSegmenter();
      } else if (data.type === "mask") {
        handleMask(data.mask, data.hasPersonPixels, data.inferenceMs);
      } else if (data.type === "no_person") {
        noPersonFrameCount += 1;
        if (noPersonFrameCount >= MAX_NO_PERSON_FRAMES) {
          hasMask = false;
          barrageRenderer.value?.setMask();
        }
      } else if (data.type === "error") {
        console.error("[AI防遮挡] Worker 推理错误:", data.message);
      }
    };

    worker.onerror = (e) => {
      console.warn("[AI防遮挡] Worker 错误，回退主线程:", e.message);
      useFallback = true;
      workerReady = false;
      initFallbackSegmenter();
    };

    // 通知 worker 加载模型
    worker.postMessage({ type: "init" });
  };

  const handleMask = (
    maskImageBitmap: ImageBitmap,
    hasPersonPixels: boolean,
    inferenceMs: number,
  ) => {
    stats.inferenceCount += 1;
    stats.lastInferenceMs = inferenceMs;
    stats.inferenceMs = inferenceMs;
    if (inferenceMs > stats.maxInferenceMs) stats.maxInferenceMs = inferenceMs;

    if (!hasPersonPixels) {
      noPersonFrameCount += 1;
      if (noPersonFrameCount >= MAX_NO_PERSON_FRAMES) {
        hasMask = false;
        barrageRenderer.value?.setMask();
      }
      return;
    }
    noPersonFrameCount = 0;

    if (!maskImageBitmap || !maskCtx || !video.value) return;

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

  const initFallbackSegmenter = async () => {
    if (fallbackSegmenter) return;
    try {
      const bodySegmentation = await import("@tensorflow-models/body-segmentation");
      await import("@tensorflow/tfjs-core");
      await import("@tensorflow/tfjs-backend-webgl");
      await import("@mediapipe/selfie_segmentation");
      fallbackSegmenter = await bodySegmentation.createSegmenter(
        bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
        {
          runtime: "mediapipe",
          solutionPath:
            "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation",
          modelType: "general",
        },
      );
      console.log("[AI防遮挡] 主线程 fallback 模型加载完成");
    } catch (e) {
      console.error("[AI防遮挡] 主线程 fallback 加载失败:", e);
    }
  };

  const destroyWorker = () => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    workerReady = false;
  };

  const initSegmenter = async () => {
    console.log("[AI防遮挡] 开始加载模型（Worker 优先）...");
    initWorker();
    // 不在这里 await；worker ready 后会自动开始推理循环
    // 也启动主线程循环作为兜底（workerReady 之前空转）
    startInferLoop();
  };

  const destroySegmenter = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    fallbackSegmenter?.dispose?.();
    fallbackSegmenter = null;
    destroyWorker();
    hasMask = false;
    inferring = false;
    noPersonFrameCount = 0;
    useFallback = false;
    stats.inferenceCount = 0;
    stats.maxInferenceMs = 0;
    stats.lastInferenceMs = 0;
    barrageRenderer.value?.setMask();
  };

  const startInferLoop = () => {
    const loop = async () => {
      if (!isOpenPortraitUnobstructed.value || !video.value) return;

      if (
        !inferring &&
        !video.value.paused &&
        video.value.readyState >= video.value.HAVE_ENOUGH_DATA &&
        (workerReady || useFallback)
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
    if (!video.value) return;
    if (!maskCtx) return;

    // 抓帧到 grabCanvas（同步）
    grabCtx.clearRect(0, 0, INFER_W, INFER_H);
    grabCtx.drawImage(video.value, 0, 0, INFER_W, INFER_H);

    // === Worker 路径：transfer ImageBitmap 给 worker，零拷贝 ===
    if (workerReady && worker) {
      try {
        const bitmap = await createImageBitmap(grabCanvas);
        // transfer list 里放 bitmap，实现零拷贝传输
        worker.postMessage(
          { type: "infer", frame: bitmap, width: INFER_W, height: INFER_H },
          [bitmap],
        );
      } catch (e) {
        console.error("[AI防遮挡] 抓帧失败:", e);
      }
      return;
    }

    // === Fallback 路径：主线程推理（worker 不可用时） ===
    if (useFallback && fallbackSegmenter) {
      try {
        const t0 = performance.now();
        const segmentation = await fallbackSegmenter.segmentPeople(grabCanvas);
        const elapsed = performance.now() - t0;
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
        // 主线程路径直接合成（复用 maskCanvas）
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskCtx.fillStyle = "black";
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskCtx.globalCompositeOperation = "destination-in";
        maskCtx.drawImage(maskSource, 0, 0, maskCanvas.width, maskCanvas.height);
        maskCtx.globalCompositeOperation = "source-over";
        if (maskSource instanceof ImageBitmap) maskSource.close();
        hasMask = true;
        barrageRenderer.value?.setMask(maskCanvas);
        stats.lastInferenceMs = elapsed;
        stats.inferenceMs = elapsed;
        if (elapsed > stats.maxInferenceMs) stats.maxInferenceMs = elapsed;
        stats.inferenceCount += 1;
      } catch (e) {
        console.error("[AI防遮挡] fallback 推理失败:", e);
      }
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
    stats,
  };
}
