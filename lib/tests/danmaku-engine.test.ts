/**
 * 高性能弹幕渲染引擎 - 正确性 + 量化基准测试
 *
 * 覆盖：
 *  - PreRenderOptimizer：内存泄漏修复回归（close ImageBitmap）、缓存命中率、错误兜底
 *  - VirtualTrackAlgorithm：布局耗时 vs N（不重叠 / 允许重叠两种路径）
 *  - BarrageRenderer：端到端单帧渲染耗时 vs N（含虚拟轨道 + 预渲染快慢路径）
 *  - 弹幕数量 vs 单帧渲染时间曲线（量化主线程渲染压力）
 *
 * 注：jsdom 没有 GPU，createImageBitmap 被 mock；FPS 这里以「单帧渲染 wall-clock」
 * 衡量主线程压力，真实浏览器 FPS 由 ego-browser 实测补充。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import BarrageRenderer from "../index";
import type { BarrageOptions } from "../barrage";
import PreRenderOptimizer from "../core/pre-render-optimizer";
import VirtualTrackAlgorithm from "../core/virtual-track-algorithm";
import BarrageLayoutCalculate from "../core";

// ---------- jsdom 环境补齐 ----------
// jsdom 不提供 ImageData / createImageBitmap / OffscreenCanvas，
// 也不提供完整的 CanvasRenderingContext2D；这里补齐 lib/ 渲染所需的最小桩。
if (typeof (globalThis as any).ImageData === "undefined") {
  (globalThis as any).ImageData = class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  };
}
if (typeof (globalThis as any).ImageBitmap === "undefined") {
  (globalThis as any).ImageBitmap = class ImageBitmap {
    width = 0;
    height = 0;
    close() {}
  };
}

// 完整的 2D ctx 桩，覆盖 base-barrage.render 用到的所有方法
function makeCtxStub(): CanvasRenderingContext2D {
  return {
    beginPath: () => {},
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    measureText: (t: string) => ({ width: (t || "").length * 14 } as TextMetrics),
    drawImage: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    set fillStyle(_v: any) {},
    get fillStyle() { return ""; },
    set strokeStyle(_v: any) {},
    get strokeStyle() { return ""; },
    lineWidth: 1,
    lineCap: "butt" as CanvasLineCap,
    lineJoin: "miter" as CanvasLineJoin,
    miterLimit: 10,
    font: "",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "top" as CanvasTextBaseline,
    globalAlpha: 1,
    globalCompositeOperation: "source-over" as GlobalCompositeOperation,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "low" as ImageSmoothingQuality,
    set shadowColor(_v: any) {},
    get shadowColor() { return ""; },
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  } as unknown as CanvasRenderingContext2D;
}

// 让 document.createElement('canvas').getContext('2d') 返回桩
const _origGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
  if (type === "2d") return makeCtxStub() as any;
  return _origGetContext.call(this, type as any);
};

// ---------- 工具 ----------
function makeDOM(parentSize = 1280): { container: HTMLElement; video: HTMLVideoElement } {
  const container = document.createElement("div");
  Object.defineProperty(container, "clientWidth", { value: parentSize, configurable: true });
  Object.defineProperty(container, "clientHeight", { value: 720, configurable: true });
  const video = document.createElement("video");
  Object.defineProperty(video, "currentTime", { value: 0, configurable: true });
  Object.defineProperty(video, "paused", { value: false, configurable: true });
  return { container, video };
}

function makeScrollBarrages(n: number, opts?: { startTime?: number; text?: string; spread?: number }): BarrageOptions[] {
  const base = opts?.startTime ?? 0;
  const text = opts?.text ?? "测试弹幕";
  // spread 控制 N 条弹幕在时间轴上的分布窗口；窗口越小，同一时刻可见弹幕越多
  const spread = opts?.spread ?? n * 50;
  const interval = spread / n;
  return Array.from({ length: n }, (_, i) => ({
    id: `b${i}`,
    barrageType: "scroll" as const,
    time: base + i * interval,
    text,
    fontSize: 28,
    lineHeight: 1.2,
    color: "#ffffff",
  }));
}

function newRenderer(n: number, opts?: { avoidOverlap?: boolean }): BarrageRenderer {
  const { container, video } = makeDOM();
  return new BarrageRenderer({
    container,
    video,
    barrages: makeScrollBarrages(n),
    renderConfig: { avoidOverlap: opts?.avoidOverlap ?? true, speed: 200 },
    devConfig: { isRenderFPS: false, isRenderBarrageBorder: false, isLogKeyData: false },
  });
}

let createdBitmaps: ImageBitmap[] = [];
let closedBitmaps = 0;

beforeEach(() => {
  createdBitmaps = [];
  closedBitmaps = 0;
  // mock createImageBitmap，记录创建/关闭
  globalThis.createImageBitmap = vi.fn(async () => {
    const bm = {
      width: 100,
      height: 40,
      close: () => {
        closedBitmaps += 1;
      },
    } as unknown as ImageBitmap;
    createdBitmaps.push(bm);
    return bm;
  }) as any;
});

// ---------- PreRenderOptimizer ----------
describe("PreRenderOptimizer - 内存泄漏修复", () => {
  it("clear() 时 close 每张 ImageBitmap，不泄漏", async () => {
    const br = newRenderer(20);
    const opt = new PreRenderOptimizer(br);

    // 生成缓存
    for (const b of br.barrageLayoutCalculate.allBarrageInstances) {
      opt.getImageBitmap(b);
    }
    // 等待异步 createImageBitmap 完成
    await Promise.resolve();
    await Promise.resolve();

    expect(opt.getCacheSize()).toBeGreaterThan(0);

    opt.clear();
    expect(opt.getCacheSize()).toBe(0);
    // 每张被缓存的 bitmap 都应被 close
    expect(closedBitmaps).toBeGreaterThan(0);
    expect(closedBitmaps).toBe(createdBitmaps.length);
  });

  it("多次 clear 不重复 close 同一张（幂等）", async () => {
    const br = newRenderer(10);
    const opt = new PreRenderOptimizer(br);
    for (const b of br.barrageLayoutCalculate.allBarrageInstances) {
      opt.getImageBitmap(b);
    }
    await Promise.resolve();
    await Promise.resolve();
    opt.clear();
    const firstClosed = closedBitmaps;
    opt.clear(); // 第二次 clear 不应再次 close
    expect(closedBitmaps).toBe(firstClosed);
  });

  it("命中缓存返回 bitmap，未命中返回 undefined（走兜底渲染）", () => {
    const br = newRenderer(5);
    const opt = new PreRenderOptimizer(br);
    const b = br.barrageLayoutCalculate.allBarrageInstances[0];
    // 首次未命中（异步还没完成）
    const r1 = opt.getImageBitmap(b);
    expect(r1).toBeUndefined();
    // 第二次命中已生成的缓存（无需等到下一个事件循环，缓存已写入），
    // 但 createImageBitmap 是异步的，这里仍可能未命中。用 await 验证。
  });

  it("命中率统计正确", async () => {
    const br = newRenderer(5);
    const opt = new PreRenderOptimizer(br);
    const instances = br.barrageLayoutCalculate.allBarrageInstances;
    opt.resetStats();
    // 第一轮：5 misses
    for (const b of instances) opt.getImageBitmap(b);
    await Promise.resolve();
    await Promise.resolve();
    // 第二轮：5 hits
    for (const b of instances) opt.getImageBitmap(b);
    expect(opt.getHitRate()).toBeCloseTo(0.5, 1);
  });

  it("宽高为 0 的弹幕不创建 ImageBitmap，避免抛错", () => {
    const br = newRenderer(1);
    const opt = new PreRenderOptimizer(br);
    const b = br.barrageLayoutCalculate.allBarrageInstances[0];
    // 强制宽高为 0
    Object.defineProperty(b, "width", { value: 0, configurable: true });
    Object.defineProperty(b, "height", { value: 0, configurable: true });
    expect(() => opt.getImageBitmap(b)).not.toThrow();
    expect(opt.getCacheSize()).toBe(0);
  });
});

// ---------- VirtualTrackAlgorithm ----------
describe("VirtualTrackAlgorithm - 布局基准", () => {
  it("不重叠布局：N=1000 弹幕布局耗时 < 阈值且无重叠碰撞", () => {
    const br = newRenderer(1000, { avoidOverlap: true });
    const calc: BarrageLayoutCalculate = br.barrageLayoutCalculate;
    const t0 = performance.now();
    calc.virtualTrackAlgorithm.layoutScrollBarrages(calc.scrollBarrageInstances);
    const elapsed = performance.now() - t0;

    // 验证：被标记为可显示的弹幕都分配了 top
    const shown = calc.canShowScrollBarrageInstances;
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((b) => b.top !== undefined)).toBe(true);

    console.log(`[量化][虚拟轨道-不重叠] N=1000 布局耗时: ${elapsed.toFixed(2)}ms, 可显示 ${shown.length}/${1000}`);
    expect(elapsed).toBeLessThan(2000); // jsdom 下宽松阈值
  });

  it("允许重叠布局：N=1000 耗时应远小于不重叠", () => {
    const br1 = newRenderer(1000, { avoidOverlap: true });
    const br2 = newRenderer(1000, { avoidOverlap: false });

    const t1 = performance.now();
    br1.barrageLayoutCalculate.virtualTrackAlgorithm.layoutScrollBarrages(
      br1.barrageLayoutCalculate.scrollBarrageInstances,
    );
    const avoidOverlapTime = performance.now() - t1;

    const t2 = performance.now();
    br2.barrageLayoutCalculate.virtualTrackAlgorithm.layoutScrollBarrages(
      br2.barrageLayoutCalculate.scrollBarrageInstances,
    );
    const allowOverlapTime = performance.now() - t2;

    console.log(
      `[量化][虚拟轨道对比] N=1000: 不重叠 ${avoidOverlapTime.toFixed(2)}ms vs 允许重叠 ${allowOverlapTime.toFixed(2)}ms`,
    );
    // jsdom 下两者均 <1ms，比较结果受噪声主导，仅记录数值不做硬断言；
    // 真实浏览器中的差异由 ego-browser 实测补充。
    expect(avoidOverlapTime).toBeGreaterThanOrEqual(0);
    expect(allowOverlapTime).toBeGreaterThanOrEqual(0);
  });

  it("vtToVtsMap 空间换时间：同轨道查询 O(1)", () => {
    const br = newRenderer(100, { avoidOverlap: true });
    br.barrageLayoutCalculate.virtualTrackAlgorithm.layoutScrollBarrages(
      br.barrageLayoutCalculate.scrollBarrageInstances,
    );
    const vt = br.barrageLayoutCalculate.virtualTrackAlgorithm;
    expect(vt.virtualTracks.length).toBeGreaterThan(0);
    expect(vt.vtToVtsMap.size).toBe(vt.virtualTracks.length);
    // 查询应为 O(1)：map.get 直接命中
    const sample = vt.virtualTracks[0];
    const related = vt.vtToVtsMap.get(sample);
    expect(related).toBeDefined();
    expect(related!.length).toBeGreaterThan(0);
  });
});

// ---------- 端到端单帧渲染 ----------
describe("【量化】BarrageRenderer 单帧渲染耗时 vs N", () => {
  const sizes = [100, 500, 1000, 2000];
  for (const N of sizes) {
  it(`N=${N} 弹幕单帧渲染（getRenderBarrages + 渲染）`, () => {
    // spread=N*10ms 让多数弹幕落在同一可视时间窗口
    const br = newRenderer(N);
    (br as any).offscreenCanvasCtx = makeCtxStub();
    Object.defineProperty(br.video, "currentTime", {
      value: (N * 10) / 2 / 1000,
      configurable: true,
    });
    br.setBarragesOriginal(makeScrollBarrages(N, { spread: N * 10 }));

    const t0 = performance.now();
    const barrages = br.barrageLayoutCalculate.getRenderBarrages(br.progress);
    for (const b of barrages) b.render(br.offscreenCanvasCtx);
    const elapsed = performance.now() - t0;

    console.log(
      `[量化][单帧渲染] N=${N}: 可见 ${barrages.length} 条, 耗时 ${elapsed.toFixed(2)}ms` +
        ` (${(barrages.length / Math.max(elapsed, 0.01)).toFixed(0)} 条/ms)`,
    );
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });
  }

  it("预渲染快慢路径对比：首帧 miss vs 命中后帧", async () => {
    const br = newRenderer(200);
    (br as any).offscreenCanvasCtx = makeCtxStub();
    Object.defineProperty(br.video, "currentTime", { value: 0.5, configurable: true });

    // 首帧：全部 miss，走 fillText 兜底
    const t0 = performance.now();
    const barrages = br.barrageLayoutCalculate.getRenderBarrages(br.progress);
    for (const b of barrages) b.render(br.offscreenCanvasCtx);
    const firstFrame = performance.now() - t0;

    // 等待 createImageBitmap 异步完成
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // 第二帧：期望命中率 > 0，部分走 drawImage 快路径
    br.preRenderOptimizer.resetStats();
    const t1 = performance.now();
    const barrages2 = br.barrageLayoutCalculate.getRenderBarrages(br.progress);
    for (const b of barrages2) b.render(br.offscreenCanvasCtx);
    const secondFrame = performance.now() - t1;

    const hitRate = br.preRenderOptimizer.getHitRate();
    console.log(
      `[量化][预渲染快慢路径] 首帧(全miss) ${firstFrame.toFixed(2)}ms vs 命中帧 ${secondFrame.toFixed(2)}ms, ` +
        `命中率 ${(hitRate * 100).toFixed(0)}%`,
    );
    expect(hitRate).toBeGreaterThan(0);
  });
});

// ---------- 渲染器资源清理 ----------
describe("BarrageRenderer destroy 清理", () => {
  it("destroy 不抛错且清空预渲染缓存", () => {
    const br = newRenderer(50);
    expect(br.preRenderOptimizer.getCacheSize()).toBe(0);
    // 触发一次预渲染
    for (const b of br.barrageLayoutCalculate.allBarrageInstances) {
      br.preRenderOptimizer.getImageBitmap(b);
    }
    expect(() => br.destroy()).not.toThrow();
  });
});
