import { BaseBarrage, type BarrageOptions, type RenderFn } from "./barrage";
import Utils from "./utils";
import BarrageLayoutCalculate from "./core";
import { ErrorCode, BarrageOptionError } from "./errors";
import PreRenderOptimizer from "./core/pre-render-optimizer";
import { CompatibilityLayer, checkWorkerSupport } from "./worker/index";
import { AIMaskSystem, type AIMaskSystemOptions  } from "./ai-segmentation";

/**
 * 弹幕渲染器
 */
export default class BarrageRenderer {
  // 容器 DOM
  container: HTMLElement | null;
  // video 元素
  video: HTMLVideoElement;
  // Canvas 元素
  canvas: HTMLCanvasElement;
  // Canvas 渲染上下文;
  ctx: CanvasRenderingContext2D;
  // 弹幕中渲染图片的配置
  barrageImages?: BarrageImage[];
  // 默认渲染配置
  defaultRenderConfig: RenderConfig = {
    heightReduce: 0,
    speed: 200,
    opacity: 1,
    renderRegion: 1,
    fontFamily: "Microsoft YaHei",
    fontWeight: "normal",
    avoidOverlap: true,
    minSpace: 10,

    ...DEFAULT_FONT_STROKE,
    ...DEFAULT_FONT_SHADOW,
  };
  // 渲染配置
  renderConfig: RenderConfig = this.defaultRenderConfig;
  // 默认开发配置
  defaultDevConfig: DevConfig = {
    isRenderFPS: false,
    isRenderBarrageBorder: false,
    isLogKeyData: false,
  };
  // 开发相关配置
  devConfig: DevConfig = this.defaultDevConfig;
  // 弹幕布局计算器
  barrageLayoutCalculate = new BarrageLayoutCalculate({
    barrageRenderer: this,
  });

  // 用于标识弹幕功能是否被打开
  isOpen = true;

  animationHandle?: number;

  fps = "";
  lastFrameTime?: number;
  lastCalcTime = 0;

  // 记录上次布局计算时，container 的宽高
  lastContainerSize = { width: 0, height: 0 };

  // 离屏 canvas 优化
  offscreenCanvas: HTMLCanvasElement;
  offscreenCanvasCtx: CanvasRenderingContext2D;

  // 用于生成 ImageBitmap 预渲染数据的 canvas
  preRenderCanvas: HTMLCanvasElement;
  preRenderCanvasCtx: CanvasRenderingContext2D;
  // 预渲染优化器
  preRenderOptimizer: PreRenderOptimizer;

  // 显示物理设备 dpr
  dpr = Utils.Canvas.getDevicePixelRatio();

  // 一系列钩子函数
  // 每一帧渲染前的钩子函数
  beforeFrameRender?: FrameRenderHook;
  // 每一帧渲染后的钩子函数
  afterFrameRender?: FrameRenderHook;
  // 每个弹幕渲染前的钩子函数
  beforeBarrageRender?: BarrageRenderHook;
  // 每个弹幕渲染后的钩子函数
  afterBarrageRender?: BarrageRenderHook;

  // 蒙版数据，如果蒙版数据存在的话，每一帧的渲染中都会用到，用于实现人像免遮挡
  mask: Mask = {
    type: null,
    data: null,
  };

  // Worker 离屏渲染相关
  private compatibilityLayer: CompatibilityLayer | null = null;
  private enableWorkerRendering: boolean = false;
  private workerSupported: boolean = false;

  // AI 遮罩系统相关
  private aiMaskSystem: AIMaskSystem | null = null;
  private enableAIMask: boolean = false;

  constructor({
    container,
    video,
    barrages,
    barrageImages,
    renderConfig,
    devConfig,
    enableWorkerRendering = false,
    workerConfig,
    enableAIMask = false,
    aiMaskOptions,
    beforeFrameRender,
    afterFrameRender,
    beforeBarrageRender,
    afterBarrageRender,
    mask,
  }: RendererOptions) {
    this.video = video;

    // 检查 Worker 支持
    this.workerSupported = checkWorkerSupport();
    this.enableWorkerRendering = enableWorkerRendering && this.workerSupported;

    // 如果启用 Worker 渲染，初始化兼容性层
    if (this.enableWorkerRendering) {
      this.compatibilityLayer = new CompatibilityLayer();
    }

    // 检查 AI 遮罩支持
    this.enableAIMask = enableAIMask;

    // 创建、处理相关 DOM
    this.container =
      typeof container === "string"
        ? document.getElementById(container)
        : container;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvasCtx = this.offscreenCanvas.getContext(
      "2d",
    ) as CanvasRenderingContext2D;

    this.preRenderCanvas = document.createElement("canvas");
    this.preRenderCanvasCtx = this.preRenderCanvas.getContext(
      "2d",
    ) as CanvasRenderingContext2D;

    this.preRenderOptimizer = new PreRenderOptimizer(this);

    // 设置好渲染配置
    this.setRenderConfigInternal(renderConfig || {}, true);
    // 设置好开发配置
    this.setDevConfig(devConfig || {});

    this.handleDOM();

    // 设置渲染图片
    this.barrageImages = barrageImages;

    // 设置弹幕数据
    this.setBarragesOriginal(barrages);

    // 设置字体描边以及阴影
    this._setCtxFontStrokeShadow();

    // 设置钩子函数
    this.beforeFrameRender = beforeFrameRender;
    this.afterFrameRender = afterFrameRender;
    this.beforeBarrageRender = beforeBarrageRender;
    this.afterBarrageRender = afterBarrageRender;

    // 设置蒙版数据
    this.setMask(mask);

    // 初始化 Worker 渲染（如果启用）
    if (this.enableWorkerRendering && this.compatibilityLayer) {
      this.initializeWorkerRendering(workerConfig);
    }

    // 初始化 AI 遮罩系统（如果启用）
    if (this.enableAIMask) {
      this.initializeAIMaskSystem(aiMaskOptions);
    }

    this.devConfig.isLogKeyData && console.log("全局实例：", this);
  }

  /**
   * 处理 DOM 相关
   */
  private handleDOM() {
    if (!this.container) console.error("Unable to obtain container element");
    if (!this.ctx) console.error("Unable to obtain CanvasRenderingContext2D");
    if (!this.container || !this.ctx) return;
    // 设置容器
    this.container.style.position = "relative";

    // container 尺寸为 0 时跳过，避免 canvas 被设为 0 导致后续 drawImage 报错
    if (!this.container.clientWidth || !this.container.clientHeight) return;

    // 设置 canvas
    this.canvas.style.position = "absolute";
    this.canvas.style.left = "0px";
    this.canvas.style.top = "0px";
    this.canvas.style.pointerEvents = "none";
    this.canvas.width = this.container.clientWidth;
    this.canvas.height =
      this.container.clientHeight - (this.renderConfig.heightReduce ?? 0);

    // 将 canvas 添加到 container 中
    this.container.appendChild(this.canvas);

    this.handleHighDprVague(this.canvas, this.ctx);

    // 需要同步处理离屏 canvas
    this.offscreenCanvas.width = this.container.clientWidth;
    this.offscreenCanvas.height =
      this.container.clientHeight - (this.renderConfig.heightReduce ?? 0);
    this.handleHighDprVague(this.offscreenCanvas, this.offscreenCanvasCtx);

    // 需要同步处理离屏 canvas
    this.preRenderCanvas.width = this.container.clientWidth;
    this.preRenderCanvas.height =
      this.container.clientHeight - (this.renderConfig.heightReduce ?? 0);
    this.handleHighDprVague(this.preRenderCanvas, this.preRenderCanvasCtx);
  }

  /**
   * 处理 Canvas 在高分屏上渲染模糊的问题
   */
  handleHighDprVague(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const logicalWidth = canvas.width;
    const logicalHeight = canvas.height;
    canvas.width = logicalWidth * this.dpr;
    canvas.height = logicalHeight * this.dpr;
    canvas.style.width = logicalWidth + "px";
    canvas.style.height = logicalHeight + "px";

    ctx.scale(this.dpr, this.dpr);
    ctx.textBaseline = "hanging";
  }

  /**
   * container 元素尺寸变更后，调用进行重新计算
   */
  resizeOriginal() {
    // 先处理 DOM 相关
    this.handleDOM();

    const nowContainerSize = {
      width: this.container?.clientWidth || 0,
      height: this.container?.clientHeight || 0,
    };
    const { width, height } = this.lastContainerSize;

    const widthIsDiff = width !== nowContainerSize.width;
    const heightIsDiff = height !== nowContainerSize.height;

    if (widthIsDiff || heightIsDiff) {
      this.lastContainerSize = nowContainerSize;
      // 仅仅宽度发生了变化
      if (widthIsDiff && !heightIsDiff) {
        this.barrageLayoutCalculate.resize("ONLY_WIDTH");
      } else if (!widthIsDiff && heightIsDiff) {
        this.barrageLayoutCalculate.resize("ONLY_HEIGHT");
      } else {
        this.barrageLayoutCalculate.resize("BOTH");
      }
    }

    // 设置字体描边以及阴影
    this._setCtxFontStrokeShadow();

    // 触发一帧的渲染
    this.renderFrame();
  }

  /**
   * 设置弹幕数据
   * @param barrages 弹幕配置对象数组
   */
  setBarragesOriginal(barrages?: BarrageOptions[]) {
    // 如果没有弹幕数据的话，直接 return
    if (!barrages) return;

    // 因为来了新一批的弹幕，之前的预处理缓存可以清空了
    this.preRenderOptimizer.clear();

    // 对不合规范的弹幕数据进行过滤
    barrages = barrages.filter((barrage) => {
      return this.validateBarrageOption(barrage) === true;
    });

    // 使用弹幕布局计算器进行计算
    this.barrageLayoutCalculate.setBarrages(barrages);

    // 记录此时的宽和高
    this.lastContainerSize = {
      width: this.container?.clientWidth || 0,
      height: this.container?.clientHeight || 0,
    };
  }

  /**
   * 设置渲染配置（可以部分设置配置）
   * @param renderConfig 配置对象
   * @param init 是不是初始化
   */
  private setRenderConfigInternal(
    renderConfig: Partial<RenderConfig>,
    init = false,
  ) {
    // 清空预渲染缓存
    this.preRenderOptimizer.clear();

    const renderConfigKeys = Object.keys(renderConfig);
    const isSpeedChange =
      renderConfigKeys.includes("speed") &&
      renderConfig.speed !== this.renderConfig.speed;
    const isHeightReduceChange =
      renderConfigKeys.includes("heightReduce") &&
      renderConfig.heightReduce !== this.renderConfig.heightReduce;
    const isRenderRegionChange =
      renderConfigKeys.includes("renderRegion") &&
      renderConfig.renderRegion !== this.renderConfig.renderRegion;
    const isAvoidOverlapChange =
      renderConfigKeys.includes("avoidOverlap") &&
      renderConfig.avoidOverlap !== this.renderConfig.avoidOverlap;
    const isMinSpaceChange =
      renderConfigKeys.includes("minSpace") &&
      renderConfig.minSpace !== this.renderConfig.minSpace;

    Object.assign(this.renderConfig, renderConfig);

    this._setCtxFontStrokeShadow();

    // 如果 init 为 false 的话，说明此时是外部触发的 setRenderConfig，需要根据设置的 render 属性进行额外的处理
    // 对布局有影响的属性：speed、heightReduce、renderRegion、avoidOverlap
    if (
      !init &&
      (isSpeedChange ||
        isHeightReduceChange ||
        isRenderRegionChange ||
        isAvoidOverlapChange)
    ) {
      // 高度缩减需要重新处理 DOM
      if (isHeightReduceChange) this.handleDOM();
      this.barrageLayoutCalculate.renderConfigChange(
        isSpeedChange,
        isHeightReduceChange,
        isRenderRegionChange,
        isAvoidOverlapChange,
        isMinSpaceChange,
      );
    }
    // 触发一帧的渲染
    if (!this.animationHandle && !init) this._render();
  }

  /**
   * 设置渲染配置（可以部分设置配置）
   * @param renderConfig 渲染配置
   */
  setRenderConfig(renderConfig: Partial<RenderConfig>) {
    this.setRenderConfigInternal(renderConfig);
  }

  /**
   * 设置开发配置（可以部分设置配置）
   * @param devConfig 开发配置
   */
  setDevConfig(devConfig: Partial<DevConfig>) {
    Object.assign(this.devConfig, devConfig);
  }

  /**
   * 负责每一帧的渲染
   * @private
   */
  private _render() {
    // 如果是弹幕关闭状态的话，直接 return
    if (!this.isOpen) return;

    // 防御：canvas 尺寸为 0 时跳过渲染，避免 drawImage 报错
    if (this.offscreenCanvas.width === 0 || this.offscreenCanvas.height === 0)
      return;

    // 获取需要渲染的弹幕
    let renderBarrages = this.barrageLayoutCalculate.getRenderBarrages(
      this.progress,
    );

    // 对需要渲染的弹幕进行一层自定义过滤
    if (this.renderConfig.barrageFilter) {
      renderBarrages = renderBarrages.filter((barrage) =>
        this.renderConfig.barrageFilter!(barrage),
      );
    }

    // 将内容先绘制到离屏 canvas 中
    this.offscreenCanvasCtx.clearRect(
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height,
    );

    // 每一帧渲染前
    this.beforeFrameRender &&
      this.beforeFrameRender({
        ctx: this.offscreenCanvasCtx,
        br: this,
      });

    this.offscreenCanvasCtx.save();
    this.offscreenCanvasCtx.globalAlpha = this.renderConfig.opacity;
    // 遍历弹幕实例进行渲染
    renderBarrages.forEach((barrage) => {
      barrage.render(this.offscreenCanvasCtx);
    });

    if (this.devConfig.isRenderFPS) this.renderFps();

    this.offscreenCanvasCtx.restore();
    // 每一帧渲染后
    this.afterFrameRender &&
      this.afterFrameRender({
        ctx: this.offscreenCanvasCtx,
        br: this,
      });

    // 将离屏中的内容绘制到 ctx 中
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    // 进行蒙版的绘制
    // 注意：ctx 已经 scale(dpr, dpr)，所以这里用逻辑像素尺寸
    const logicalW = this.canvas.width / this.dpr;
    const logicalH = this.canvas.height / this.dpr;
    if (this.mask.data) {
      const { type, data } = this.mask;
      if (type === "URL") {
        this.ctx.drawImage(data, 0, 0, logicalW, logicalH);
      } else if (type === "ImageData") {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = data.width;
        tempCanvas.height = data.height;
        tempCanvas.getContext("2d")!.putImageData(data, 0, 0);
        // 只取 mask 顶部与 barrage canvas 等高的区域，保持宽高比不变形
        const srcH = Math.min(
          data.height,
          Math.round((data.width * logicalH) / logicalW),
        );
        this.ctx.drawImage(
          tempCanvas,
          0,
          0,
          data.width,
          srcH,
          0,
          0,
          logicalW,
          logicalH,
        );
      } else if (type === "Canvas") {
        // maskCanvas 是视频逻辑尺寸（vw × vh），barrage canvas 是 vw × (vh - heightReduce)
        // 只取 maskCanvas 顶部对应 barrage canvas 高度的区域，避免垂直压缩
        const srcH = Math.round((data.width * logicalH) / logicalW);
        this.ctx.drawImage(
          data,
          0,
          0,
          data.width,
          Math.min(srcH, data.height),
          0,
          0,
          logicalW,
          logicalH,
        );
      }
      this.ctx.globalCompositeOperation = "source-out";
    }

    this.ctx.drawImage(
      this.offscreenCanvas,
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height,
      0,
      0,
      this.canvas.width / this.dpr,
      this.canvas.height / this.dpr,
    );
    this.ctx.restore();

    // 执行下一帧
    if (this.animationHandle) {
      requestAnimationFrame(() => this._render());
    }
  }

  /**
   * 创建动画任务
   * @private
   */
  private _createAnimation() {
    if (!this.animationHandle && this.isOpen) {
      this.animationHandle = requestAnimationFrame(() => this._render());
    }
  }

  /**
   * 设置字体描边以及阴影
   * @private
   */
  private _setCtxFontStrokeShadow() {
    const {
      strokeStyle,
      lineWidth,
      lineCap,
      lineJoin,
      miterLimit,

      shadowColor,
      shadowBlur,
      shadowOffsetX,
      shadowOffsetY,
    } = this.renderConfig;
    // 离屏 Canvas Ctx 设置
    this.offscreenCanvasCtx.strokeStyle = strokeStyle;
    this.offscreenCanvasCtx.lineWidth = lineWidth;
    this.offscreenCanvasCtx.lineCap = lineCap;
    this.offscreenCanvasCtx.lineJoin = lineJoin;
    this.offscreenCanvasCtx.miterLimit = miterLimit;

    this.offscreenCanvasCtx.shadowColor = shadowColor;
    this.offscreenCanvasCtx.shadowBlur = shadowBlur;
    this.offscreenCanvasCtx.shadowOffsetX = shadowOffsetX;
    this.offscreenCanvasCtx.shadowOffsetY = shadowOffsetY;

    // 预渲染 Canvas Ctx 设置
    this.preRenderCanvasCtx.strokeStyle = strokeStyle;
    this.preRenderCanvasCtx.lineWidth = lineWidth;
    this.preRenderCanvasCtx.lineCap = lineCap;
    this.preRenderCanvasCtx.lineJoin = lineJoin;
    this.preRenderCanvasCtx.miterLimit = miterLimit;

    this.preRenderCanvasCtx.shadowColor = shadowColor;
    this.preRenderCanvasCtx.shadowBlur = shadowBlur;
    this.preRenderCanvasCtx.shadowOffsetX = shadowOffsetX;
    this.preRenderCanvasCtx.shadowOffsetY = shadowOffsetY;
  }

  /**
   * 当前动画的播放进度，单位：毫秒
   */
  get progress() {
    return this.videoStatus.currentTime;
  }

  /**
   * video 的状态
   */
  get videoStatus() {
    return {
      // 当前视频的播放进度（ms）
      currentTime: this.video.currentTime * 1000,
      // 当前视频是不是播放中
      playing: !this.video.paused,
    };
  }

  /**
   * canvas 的尺寸
   */
  get canvasSize() {
    return {
      width: this.canvas.width / this.dpr,
      height: this.canvas.height / this.dpr,
    };
  }

  /**
   * 弹幕运行速度，仅对滚动弹幕有效（每毫秒多少像素）
   */
  get speedPerMs() {
    return this.renderConfig.speed / 1000;
  }

  /**
   * 触发一帧的渲染
   */
  renderFrame() {
    if (!this.animationHandle) this._render();
  }

  /**
   * 执行弹幕的播放
   */
  playOriginal() {
    // 执行动画
    this._createAnimation();
  }

  /**
   * 暂停弹幕的播放
   */
  pauseOriginal() {
    this.animationHandle && cancelAnimationFrame(this.animationHandle);
    this.animationHandle = undefined;
  }

  /**
   * 是否打开弹幕
   * @param isOpen 是否打开弹幕
   */
  switch(isOpen: boolean) {
    this.isOpen = isOpen;
    if (isOpen) {
      // 进行打开操作，根据当前是不是播放状态进行不同的处理
      this.videoStatus.playing ? this._createAnimation() : this._render();
    } else {
      // 进行关闭操作
      this.animationHandle && cancelAnimationFrame(this.animationHandle);
      this.animationHandle = undefined;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * 设置蒙版数据
   * @param mask 图片的 url 或者 ImageData 数据
   */
  setMask(mask?: string | ImageData | HTMLCanvasElement) {
    if (typeof mask === "string") {
      this.mask.type = "URL";
      Utils.Cache.loadImage(mask).then((img) => {
        this.mask.data = img;
      });
    } else if (mask instanceof ImageData) {
      this.mask.type = "ImageData";
      this.mask.data = mask;
    } else if (mask instanceof HTMLCanvasElement) {
      this.mask.type = "Canvas";
      this.mask.data = mask;
    } else {
      this.mask.type = null;
      this.mask.data = null;
    }
  }

  /**
   * 渲染 FPS
   */
  private renderFps() {
    const now = Date.now();
    // 如果上一帧存在，并且距离上次计算 fps 有 200ms 的话，则重新计算 fps
    if (this.lastFrameTime && now - this.lastCalcTime > 200) {
      this.fps = `${Math.floor(1000 / (now - this.lastFrameTime))}FPS`;
      this.lastCalcTime = now;
    }

    // 记录这一帧的时间
    this.lastFrameTime = now;

    if (this.fps) {
      this.offscreenCanvasCtx.font = "bold 32px Microsoft YaHei";
      this.offscreenCanvasCtx.fillStyle = "blue";
      this.offscreenCanvasCtx.fillText(this.fps, 20, 30);
    }
  }

  /**
   * 判断弹幕数据是否合规
   * @param barrage 弹幕配置对象
   */
  private validateBarrageOption(
    barrage: BarrageOptions,
  ): true | BarrageOptionError {
    // 固定弹幕
    if (barrage.barrageType === "top" || barrage.barrageType === "bottom") {
      // 固定弹幕的持续时间小于等于 0 的话，过滤掉
      if (barrage.duration <= 0) {
        return new BarrageOptionError({
          code: ErrorCode.FIXED_DURATION_ERROR,
          message: "The duration of the fixed barrage should be greater than 0",
        });
      }
    }

    // 高级弹幕
    if (barrage.barrageType === "senior") {
      const { totalDuration, delay, motionDuration } =
        barrage.seniorBarrageConfig;
      if (totalDuration <= 0) {
        return new BarrageOptionError({
          code: ErrorCode.SENIOR_TOTAL_ERROR,
          message:
            "The totalDuration of senior barrage should be greater than 0",
        });
      }
      if (delay < 0) {
        return new BarrageOptionError({
          code: ErrorCode.SENIOR_DELAY_ERROR,
          message:
            "The delay of senior barrage should be greater than or equal to 0",
        });
      }
      if (motionDuration < 0) {
        return new BarrageOptionError({
          code: ErrorCode.SENIOR_MOTION_ERROR,
          message:
            "The motionDuration of senior barrage should be greater than or equal to 0",
        });
      }
    }

    // 如果合规的话，返回 true
    return true;
  }

  /**
   * 初始化 Worker 渲染
   */
  private async initializeWorkerRendering(workerConfig?: any): Promise<void> {
    if (!this.compatibilityLayer || !this.canvas) return;

    try {
      await this.compatibilityLayer.initialize(
        this.canvas,
        this,
        this.enableWorkerRendering,
      );

      if (this.compatibilityLayer.getCurrentMode() === "worker") {
        console.log("Worker 离屏渲染已启用");
      } else {
        console.log("回退到主线程渲染");
      }
    } catch (error) {
      console.warn("Worker 渲染初始化失败:", error);
      this.enableWorkerRendering = false;
    }
  }
  /**
   * 动态启用 Worker 渲染模式
   */
  async enableWorkerMode(): Promise<boolean> {
    if (!this.workerSupported) {
      console.warn("浏览器不支持 Worker 离屏渲染");
      return false;
    }

    if (!this.compatibilityLayer) {
      this.compatibilityLayer = new CompatibilityLayer();
      await this.compatibilityLayer.initialize(this.canvas!, this, true);
    }

    try {
      await this.compatibilityLayer.setWorkerMode(true);
      this.enableWorkerRendering = true;
      return true;
    } catch (error) {
      console.error("启用 Worker 模式失败:", error);
      return false;
    }
  }

  /**
   * 动态禁用 Worker 渲染模式
   */
  async disableWorkerMode(): Promise<void> {
    if (this.compatibilityLayer) {
      await this.compatibilityLayer.setWorkerMode(false);
      this.enableWorkerRendering = false;
    }
  }

  /**
   * 获取当前渲染模式
   */
  getCurrentRenderMode(): "worker" | "main" {
    return this.compatibilityLayer?.getCurrentMode() || "main";
  }

  /**
   * 检查是否支持 Worker 渲染
   */
  isWorkerSupported(): boolean {
    return this.workerSupported;
  }

  /**
   * 初始化 AI 遮罩系统
   */
  private async initializeAIMaskSystem(
    aiMaskOptions?: AIMaskSystemOptions,
  ): Promise<void> {
    if (!this.video) {
      console.warn("Video element not available for AI mask system");
      return;
    }

    try {
      this.aiMaskSystem = new AIMaskSystem(this as any, {
        ...aiMaskOptions,
        videoElement: this.video,
        autoStart: false, // 手动控制启动
      });

      console.log("AI mask system initialized");
    } catch (error) {
      console.error("Failed to initialize AI mask system:", error);
      this.enableAIMask = false;
      this.aiMaskSystem = null;
    }
  }

  /**
   * 启用 AI 遮罩系统
   */
  async enableAIMaskSystem(): Promise<boolean> {
    if (!this.aiMaskSystem) {
      console.warn("AI mask system not initialized");
      return false;
    }

    try {
      await this.aiMaskSystem.start();
      this.enableAIMask = true;
      return true;
    } catch (error) {
      console.error("Failed to enable AI mask system:", error);
      return false;
    }
  }

  /**
   * 禁用 AI 遮罩系统
   */
  async disableAIMaskSystem(): Promise<void> {
    if (this.aiMaskSystem) {
      await this.aiMaskSystem.stop();
      this.enableAIMask = false;
    }
  }

  /**
   * 获取 AI 遮罩系统状态
   */
  getAIMaskSystemStatus(): any {
    return this.aiMaskSystem?.getSystemState() || null;
  }

  /**
   * 更新 AI 遮罩系统配置
   */
  updateAIMaskConfig(options: Partial<AIMaskSystemOptions>): void {
    if (this.aiMaskSystem) {
      this.aiMaskSystem.updateConfig(options);
    }
  }

  /**
   * 重写 send 方法以支持 Worker 模式
   */
  async send(barrage: BarrageOptions): Promise<void> {
    const validateResult = this.validateBarrageOption(barrage);
    if (validateResult !== true) {
      throw validateResult;
    }

    if (this.enableWorkerRendering && this.compatibilityLayer) {
      await this.compatibilityLayer.addBarrage(barrage);
    } else {
      // 原有的主线程逻辑
      this.barrageLayoutCalculate.send(barrage);
    }
  }

  /**
   * 批量发送弹幕
   */
  async sendBatch(barrages: BarrageOptions[]): Promise<void> {
    // 验证所有弹幕
    for (const barrage of barrages) {
      const validateResult = this.validateBarrageOption(barrage);
      if (validateResult !== true) {
        throw validateResult;
      }
    }

    if (this.enableWorkerRendering && this.compatibilityLayer) {
      await this.compatibilityLayer.addBarrages(barrages);
    } else {
      // 主线程批量处理
      barrages.forEach((barrage) => {
        this.barrageLayoutCalculate.send(barrage);
      });
    }
  }

  /**
   * 重写 setBarrages 方法以支持 Worker 模式
   */
  async setBarrages(barrages?: BarrageOptions[]): Promise<void> {
    // 如果没有弹幕数据的话，直接 return
    if (!barrages) return;

    // 对不合规范的弹幕数据进行过滤
    const validBarrages = barrages.filter((barrage) => {
      return this.validateBarrageOption(barrage) === true;
    });

    if (this.enableWorkerRendering && this.compatibilityLayer) {
      await this.compatibilityLayer.addBarrages(validBarrages);
    } else {
      // 原有的主线程逻辑
      // 因为来了新一批的弹幕，之前的预处理缓存可以清空了
      this.preRenderOptimizer.clear();

      // 使用弹幕布局计算器进行计算
      this.barrageLayoutCalculate.setBarrages(validBarrages);

      // 记录此时的宽和高
      this.lastContainerSize = {
        width: this.container?.clientWidth || 0,
        height: this.container?.clientHeight || 0,
      };
    }
  }

  /**
   * 重写 pause 方法以支持 Worker 模式
   */
  async pause(): Promise<void> {
    if (this.enableWorkerRendering && this.compatibilityLayer) {
      await this.compatibilityLayer.pause();
    } else {
      // 原有的主线程逻辑
      this.animationHandle && cancelAnimationFrame(this.animationHandle);
      this.animationHandle = undefined;
    }
  }

  /**
   * 重写 play 方法以支持 Worker 模式
   */
  async play(): Promise<void> {
    if (this.enableWorkerRendering && this.compatibilityLayer) {
      await this.compatibilityLayer.resume();
    } else {
      // 原有的主线程逻辑
      this._createAnimation();
    }
  }

  /**
   * 重写 resize 方法以支持 Worker 模式
   */
  async resize(): Promise<void> {
    // 先处理 DOM 相关
    this.handleDOM();

    const nowContainerSize = {
      width: this.container?.clientWidth || 0,
      height: this.container?.clientHeight || 0,
    };

    if (this.enableWorkerRendering && this.compatibilityLayer) {
      await this.compatibilityLayer.resize(
        nowContainerSize.width,
        nowContainerSize.height,
      );
    } else {
      // 原有的主线程逻辑
      const { width, height } = this.lastContainerSize;

      const widthIsDiff = width !== nowContainerSize.width;
      const heightIsDiff = height !== nowContainerSize.height;

      if (widthIsDiff || heightIsDiff) {
        this.lastContainerSize = nowContainerSize;
        // 仅仅宽度发生了变化
        if (widthIsDiff && !heightIsDiff) {
          this.barrageLayoutCalculate.resize("ONLY_WIDTH");
        } else if (!widthIsDiff && heightIsDiff) {
          this.barrageLayoutCalculate.resize("ONLY_HEIGHT");
        } else {
          this.barrageLayoutCalculate.resize("BOTH");
        }
      }

      // 设置字体描边以及阴影
      this._setCtxFontStrokeShadow();

      // 触发一帧的渲染
      this.renderFrame();
    }
  }

  /**
   * 清理资源，包括 Worker 和 AI 遮罩系统
   */
  destroy(): void {
    if (this.compatibilityLayer) {
      this.compatibilityLayer.destroy();
    }

    // 清理 AI 遮罩系统
    if (this.aiMaskSystem) {
      this.aiMaskSystem.dispose();
      this.aiMaskSystem = null;
    }

    // 清理主线程资源
    if (this.animationHandle) {
      cancelAnimationFrame(this.animationHandle);
    }

    this.preRenderOptimizer.clear();
  }
}

/**
 * 弹幕渲染器 class 构造函数的参数
 */
export type RendererOptions = {
  // 容器 DOM
  container: string | HTMLElement;
  // video 元素（获取 video 元素，只是为了获取播放状态，不会对 video 执行其他操作）
  video: HTMLVideoElement;
  // 弹幕数据
  barrages?: BarrageOptions[];
  // 弹幕中渲染图片的配置
  barrageImages?: BarrageImage[];

  // 渲染相关配置
  renderConfig?: Partial<RenderConfig>;
  // 开发相关配置
  devConfig?: Partial<DevConfig>;

  // Worker 离屏渲染配置
  enableWorkerRendering?: boolean;
  workerConfig?: {
    maxBarrages?: number;
    enableOptimization?: boolean;
    fps?: number;
  };

  // AI 遮罩系统配置
  enableAIMask?: boolean;
  aiMaskOptions?: AIMaskSystemOptions;

  // 一系列钩子函数
  // 每一帧渲染前的钩子函数
  beforeFrameRender?: FrameRenderHook;
  // 每一帧渲染后的钩子函数
  afterFrameRender?: FrameRenderHook;
  // 每个弹幕渲染前的钩子函数
  beforeBarrageRender?: BarrageRenderHook;
  // 每个弹幕渲染后的钩子函数
  afterBarrageRender?: BarrageRenderHook;

  // 蒙版数据
  mask?: string | ImageData;
};

/**
 * 蒙版数据类型
 */
type Mask =
  | {
      type: "URL";
      data: HTMLImageElement;
    }
  | {
      type: "ImageData";
      data: ImageData;
    }
  | {
      type: "Canvas";
      data: HTMLCanvasElement;
    }
  | {
      type: null;
      data: null;
    };

/**
 * 帧渲染钩子函数的类型
 */
export type FrameRenderHook = (data: {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  br: BarrageRenderer;
}) => void;

/**
 * 弹幕渲染钩子函数的类型
 */
export type BarrageRenderHook = (data: {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  br: BarrageRenderer;
  barrage: BaseBarrage;
}) => void;

// 字体描边相关
export type FontStroke = {
  // 描边颜色
  strokeStyle: string;
  // 描边宽度
  lineWidth: number;
  // 线条端点样式
  lineCap: CanvasLineCap;
  // 线条连接样式
  lineJoin: CanvasLineJoin;
  // 控制锐角处斜接角的最大长度
  miterLimit: number;
};

// 字体描边的默认值
export const DEFAULT_FONT_STROKE: FontStroke = {
  strokeStyle: "rgba(0, 0, 0, 0)",
  lineWidth: 1,
  lineCap: "butt",
  lineJoin: "miter",
  miterLimit: 10,
};

// 字体阴影相关
export type FontShadow = {
  // 阴影颜色
  shadowColor: string;
  // 阴影模糊半径
  shadowBlur: number;
  // 阴影在 X 轴的偏移量
  shadowOffsetX: number;
  // 阴影在 Y 轴的偏移量
  shadowOffsetY: number;
};

// 字体阴影的默认值
export const DEFAULT_FONT_SHADOW: FontShadow = {
  shadowColor: "rgba(0, 0, 0, 0)",
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
};

export type FontStrokeAndShadow = FontStroke & FontShadow;

/**
 * 弹幕渲染器渲染弹幕的配置
 */
export type RenderConfig = {
  // 自定义弹幕过滤器，返回 false，弹幕就会被过滤掉
  barrageFilter?: (barrage: BaseBarrage) => boolean;
  // 重要弹幕 边框 的自定义渲染函数
  priorBorderCustomRender?: RenderFn;

  // Canvas 元素默认和 container 等高，为了避免弹幕渲染遮挡住播放器的控制栏，可以设置减少一定的高度
  heightReduce: number;
  // 弹幕运行速度，仅对滚动弹幕有效（每秒多少像素）
  speed: number;
  // 显示区域，只针对滚动弹幕，有效值 0 ~ 1
  renderRegion: number;
  // 滚动弹幕水平最小间距
  minSpace: number;
  // 是否重叠，只适用于滚动弹幕
  avoidOverlap: boolean;

  // 透明度，有效值 0 ~ 1
  opacity: number;
  // 弹幕字体
  fontFamily: string;
  // 字体粗细
  fontWeight: string;
} & FontStrokeAndShadow;

/**
 * 弹幕中渲染图片的配置
 */
export type BarrageImage = {
  // 弹幕图片的唯一标识
  id: string;
  // 图片的地址
  url: string;
  // 渲染时的宽
  width: number;
  // 渲染时的高
  height: number;
};

/**
 * 开发相关配置
 */
export type DevConfig = {
  // 是否渲染 fps
  isRenderFPS: boolean;
  // 是否渲染弹幕边框
  isRenderBarrageBorder: boolean;
  // 是否打印关键数据
  isLogKeyData: boolean;
};

export { BarrageRenderer };

export * from "./barrage";

export * from "./errors";
