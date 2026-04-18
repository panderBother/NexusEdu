self.onmessage = async (event: MessageEvent) => {
  const { type, source, width, height } = event.data;

  if (type !== "process" || !source) {
    return;
  }

  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext("2d");
  if (!ctx) {
    self.postMessage({
      type: "error",
      message: "无法获取 OffscreenCanvas 上下文",
    });
    return;
  }

  // 将 mask 转换为“人物区域不透明、背景透明”的遮罩
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(source, 0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  // 检测画面是否包含人物像素
  let hasPersonPixels = false;
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    let count = 0;
    const threshold = 8;
    const minCount = Math.max(20, width * height * 0.002);

    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > threshold) {
        count += 1;
        if (count >= minCount) {
          hasPersonPixels = true;
          break;
        }
      }
    }
  } catch (error) {
    // getImageData 可能在某些浏览器下失败，但这不是主路径
    hasPersonPixels = true;
  }

  const maskImageBitmap = offscreen.transferToImageBitmap();
  self.postMessage(
    {
      type: "mask",
      maskImageBitmap,
      hasPersonPixels,
    },
    { transfer: [maskImageBitmap] },
  );
};
