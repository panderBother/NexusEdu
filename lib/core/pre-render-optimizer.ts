import BarrageRenderer from '../index';
import {BaseBarrage} from '../barrage/index';
import Utils from '../utils';

/**
 * 预渲染优化器
 * 将每条弹幕渲染成 ImageBitmap 并缓存，渲染时直接 drawImage 复用，
 * 避免每帧重复执行 fillText/strokeText 等昂贵的文本绘制。
 */
export default class PreRenderOptimizer {
  br: BarrageRenderer;
  imageBitmapCache = new Map<string, ImageBitmap>();

  // 命中统计，用于性能基准
  private hits = 0;
  private misses = 0;
  // 进行中的预渲染任务，避免 clear 后仍有异步任务回填脏数据
  private inflight = new Set<Promise<void>>();

  constructor(br: BarrageRenderer) {
    this.br = br;
  }

  /**
   * 获取弹幕对应的 ImageBitmap。
   * 命中缓存则同步返回；未命中则同步返回 undefined（调用方走常规渲染兜底），
   * 同时异步生成 ImageBitmap 并在完成后写入缓存，下一帧即可命中快路径。
   */
  getImageBitmap(barrage: BaseBarrage): ImageBitmap | undefined {
    if (this.imageBitmapCache.has(barrage.id)) {
      this.hits += 1;
      return this.imageBitmapCache.get(barrage.id);
    }

    this.misses += 1;

    // 防御：宽高为 0 时不创建 ImageBitmap，避免 createImageBitmap 抛错
    if (barrage.width <= 0 || barrage.height <= 0) {
      return undefined;
    }

    const { width, height } = this.preRenderCanvas;
    this.preRenderCanvasCtx.clearRect(0, 0, width, height);

    barrage.setCtxFont(this.preRenderCanvasCtx);

    barrage.sections.forEach(section => {
      if (section.sectionType === 'text') {
        if (
          this.br.renderConfig.strokeStyle &&
          Utils.Color.isVisibleColor(this.br.renderConfig.strokeStyle) &&
          this.br.renderConfig.lineWidth > 0
        ) {
          this.preRenderCanvasCtx.strokeText(section.text, section.leftOffset, section.topOffset);
        }
        this.preRenderCanvasCtx.fillText(section.text, section.leftOffset, section.topOffset);
      } else if (section.sectionType === 'image') {
        this.preRenderCanvasCtx.drawImage(
          Utils.Cache.imageElementFactory(section.url),
          section.leftOffset,
          section.topOffset,
          section.width,
          section.height,
        )
      }
    })

    const bitmapWidth = barrage.width * this.dpr;
    const bitmapHeight = barrage.height * this.dpr;
    const p = createImageBitmap(
      this.preRenderCanvas,
      0,
      0,
      bitmapWidth,
      bitmapHeight,
    ).then(imageBitmap => {
      // 仅当该任务未被 clear 取消时回填缓存
      if (this.inflight.has(p)) {
        this.imageBitmapCache.set(barrage.id, imageBitmap);
      } else {
        // 已被 clear，立即释放避免泄漏
        imageBitmap.close();
      }
    }).catch((err) => {
      // 单条弹幕预渲染失败不应影响整体渲染流程
      console.warn('[PreRender] createImageBitmap failed for', barrage.id, err);
    }).finally(() => {
      this.inflight.delete(p);
    });

    this.inflight.add(p);
    return undefined;
  }

  /**
   * 清空缓存：必须显式 close 每张 ImageBitmap 以释放底层位图内存，
   * 否则在切换弹幕集 / 调整渲染配置时会持续累积造成内存泄漏。
   * 同时取消所有进行中的异步任务，防止其完成后回填已废弃的缓存。
   */
  clear() {
    this.imageBitmapCache.forEach(bitmap => {
      if (bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }
    });
    this.imageBitmapCache.clear();
    // 标记所有在途任务为已取消（它们完成后会自行 close 新生成的 bitmap）
    this.inflight.clear();
  }

  /** 当前缓存条目数 */
  getCacheSize(): number {
    return this.imageBitmapCache.size;
  }

  /** 缓存命中率（0~1），用于性能基准 */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  /** 重置命中统计 */
  resetStats() {
    this.hits = 0;
    this.misses = 0;
  }

  get preRenderCanvas() {
    return this.br.preRenderCanvas;
  }

  get preRenderCanvasCtx() {
    return this.br.preRenderCanvasCtx;
  }

  get dpr() {
    return this.br.dpr;
  }
}
