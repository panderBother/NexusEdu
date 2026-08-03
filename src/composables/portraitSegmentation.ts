/**
 * 人像分割 - 纯函数模块
 *
 * 将 mask 合成逻辑从 worker 中抽出，便于在 Vitest 下直接单测与基准，
 * 同时仍被 Worker 复用，保证 worker 与测试使用同一份实现。
 *
 * 「合成」的含义：MediaPipe Selfie Segmentation 输出的 mask 是
 * 0/255 灰度图，人物区域 255、背景 0。我们需要把它转成
 * 「人物区域不透明黑、背景透明」的 RGBA mask，再 transfer 回主线程。
 */

export interface ComposeMaskInput {
  /** MediaPipe 输出的 mask，Uint8Array 或 ImageBitmap / CanvasImageSource */
  source: CanvasImageSource | Uint8Array;
  width: number;
  height: number;
}

export interface ComposeMaskResult {
  maskImageBitmap: ImageBitmap;
  hasPersonPixels: boolean;
}

/**
 * 检测 mask 中是否包含足够多的人物像素。
 * @param data     RGBA data（仅看 alpha 通道或灰度通道）
 * @param width
 * @param height
 * @param threshold 像素亮度阈值
 * @param minRatio  人物像素占画面比例下限
 */
export function detectPersonPixels(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  threshold = 8,
  minRatio = 0.002,
): boolean {
  let count = 0;
  const minCount = Math.max(20, width * height * minRatio);
  // 兼容 RGBA（每 4 字节）与单通道（每 1 字节）两种布局
  const stride = data.length >= width * height * 4 ? 4 : 1;
  // RGBA 时看 alpha 通道（i*4+3）；单通道时看像素本身
  const offset = stride === 4 ? 3 : 0;
  for (let i = 0; i < data.length; i += stride) {
    if (data[i + offset] > threshold) {
      count += 1;
      if (count >= minCount) return true;
    }
  }
  return false;
}

/**
 * 在 OffscreenCanvasRenderingContext2D 上合成 mask：
 * 1. 清空画布；
 * 2. 填充黑色背景；
 * 3. 用 destination-in 把 source 画上去，仅保留人物区域的黑色像素，
 *    背景变为透明；
 * 4. 通过 getImageData 检测人物像素；
 * 5. transferToImageBitmap 零拷贝转移。
 *
 * @param ctx    OffscreenCanvas 2D 上下文
 * @param source MediaPipe mask（CanvasImageSource）
 * @param width
 * @param height
 */
export function composeMaskOnContext(
  ctx: OffscreenCanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
): { hasPersonPixels: boolean } {
  ctx.clearRect(0, 0, width, height);
  // 先把整个画布涂黑
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  // destination-in：保留 source 与已有内容相交的部分，
  // 即只剩下人物区域的黑色像素，背景区域被清成透明
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(source, 0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  let hasPersonPixels = false;
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    hasPersonPixels = detectPersonPixels(imageData.data, width, height);
  } catch {
    // 某些环境 getImageData 会失败，保守认为有人
    hasPersonPixels = true;
  }
  return { hasPersonPixels };
}

/** Worker 与主线程之间的消息协议 */
export type WorkerInbound =
  | {
      type: "init";
      /** optional: 自定义 solutionPath */
      solutionPath?: string;
    }
  | {
      type: "infer";
      /** 从主线程 transfer 过来的视频帧 ImageBitmap（零拷贝） */
      frame: ImageBitmap;
      width: number;
      height: number;
    };

export type WorkerOutbound =
  | { type: "ready" }
  | { type: "init_error"; message: string }
  | {
      type: "mask";
      /** 合成后的 mask ImageBitmap，transfer 回主线程（零拷贝） */
      mask: ImageBitmap;
      hasPersonPixels: boolean;
      /** 本帧推理耗时 ms（worker 内测量） */
      inferenceMs: number;
    }
  | { type: "no_person" }
  | { type: "error"; message: string };
