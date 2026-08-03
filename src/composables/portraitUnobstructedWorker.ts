/**
 * AI 防遮挡 Worker - 模型加载 + 推理 + mask 合成全部在 Worker 线程执行
 *
 * 主线程只负责：
 *  1. 从 video 抓帧 → createImageBitmap → transfer 给 worker（零拷贝）；
 *  2. 接收 worker 返回的 mask ImageBitmap → drawImage 到 maskCanvas → setMask。
 *
 * 这样 segmentPeople 推理（WebGL/CPU）造成的 Long Task 完全脱离主线程，
 * 不会阻塞弹幕渲染与 UI 响应。
 */
import {
  composeMaskOnContext,
  detectPersonPixels,
  type WorkerInbound,
  type WorkerOutbound,
} from "./portraitSegmentation";

let segmenter: any = null;
let initInProgress = false;
let offscreen: OffscreenCanvas | null = null;
let offCtx: OffscreenCanvasRenderingContext2D | null = null;

function post(msg: WorkerOutbound, transfer: Transferable[] = []) {
  (self as unknown as Worker).postMessage(msg, transfer);
}

async function ensureSegmenter(solutionPath?: string) {
  if (segmenter || initInProgress) return;
  initInProgress = true;
  try {
    // 动态 import，避免主线程也加载这些重量级依赖
    const tfCore = await import("@tensorflow/tfjs-core");
    await import("@tensorflow/tfjs-backend-webgl");
    await import("@mediapipe/selfie_segmentation");
    const bodySegmentation = await import("@tensorflow-models/body-segmentation");

    // 在 worker 中设置 webgl backend
    await tfCore.ready;

    segmenter = await bodySegmentation.createSegmenter(
      bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
      {
        runtime: "mediapipe",
        solutionPath:
          solutionPath ||
          "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation",
        modelType: "general",
      },
    );
    post({ type: "ready" });
  } catch (e) {
    post({ type: "init_error", message: (e as Error)?.message || String(e) });
  } finally {
    initInProgress = false;
  }
}

async function ensureCanvas(w: number, h: number) {
  if (!offscreen || offscreen.width !== w || offscreen.height !== h) {
    offscreen = new OffscreenCanvas(w, h);
    offCtx = offscreen.getContext("2d");
  }
}

self.onmessage = async (event: MessageEvent<WorkerInbound>) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === "init") {
    await ensureSegmenter(msg.solutionPath);
    return;
  }

  if (msg.type === "infer") {
    if (!segmenter) {
      // 模型还没 ready，丢弃这帧（主线程会按节流间隔继续发）
      return;
    }

    const { frame, width, height } = msg;
    const t0 = performance.now();
    try {
      // segmentPeople 接受 CanvasImageSource；ImageBitmap 本身即可作为 source
      const segmentation = await segmenter.segmentPeople(frame);
      // 帧数据用完即释放
      frame.close();

      if (!segmentation || segmentation.length === 0) {
        post({ type: "no_person" });
        return;
      }

      // 把 mask 转 CanvasImageSource
      let maskSource = await segmentation[0].mask.toCanvasImageSource();
      if (!(maskSource instanceof ImageBitmap)) {
        maskSource = await createImageBitmap(maskSource as CanvasImageSource);
      }

      await ensureCanvas(width, height);
      if (!offCtx || !offscreen) {
        post({ type: "error", message: "OffscreenCanvas 不可用" });
        return;
      }
      const { hasPersonPixels } = composeMaskOnContext(
        offCtx,
        maskSource,
        width,
        height,
      );
      // 释放中间 maskSource
      if (maskSource instanceof ImageBitmap) maskSource.close();

      if (!hasPersonPixels) {
        post({ type: "no_person" });
        return;
      }

      const mask = offscreen.transferToImageBitmap();
      const inferenceMs = performance.now() - t0;
      post({ type: "mask", mask, hasPersonPixels, inferenceMs }, [mask]);
    } catch (e) {
      frame?.close?.();
      post({ type: "error", message: (e as Error)?.message || String(e) });
    }
  }
};

// detectPersonPixels 在 worker 内不直接用，但保持引用以避免 tree-shake 删除
// （composeMaskOnContext 内部已使用）
export { detectPersonPixels };
