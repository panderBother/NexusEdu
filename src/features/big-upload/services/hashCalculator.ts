/**
 * 纯函数哈希计算模块
 *
 * 从 hash.worker.ts 中抽取，便于在 Node/Vitest 环境下直接进行单测与吞吐基准，
 * 同时仍被 Worker 复用，保证 Worker 与测试使用同一份实现。
 *
 * 采用两阶段哈希：先逐分片 SHA-256，再将所有分片哈希拼接后做一次 SHA-256
 * 作为整文件哈希。相比对整个大文件做一次连续 SHA-256，这种做法可以：
 *  1) 流式逐片计算，内存占用恒定（与分片大小相关，而非文件大小）；
 *  2) 每个分片哈希同时作为分片完整性校验值随上传一起发送，服务端可逐片校验；
 *  3) 得到稳定的整文件指纹用于秒传判定。
 */

/** ArrayBuffer / Uint8Array 转 16 进制字符串 */
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/** 16 进制字符串转 Uint8Array */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/** 对任意 ArrayBuffer 计算 SHA-256，返回 16 进制字符串 */
export async function digest(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  // 统一转换为 Uint8Array 视图后再传入。crypto.subtle.digest 接受 BufferSource，
  // 但不同运行时（Node webcrypto / undici Blob.arrayBuffer()）对 ArrayBuffer
  // 跨realm 的 instanceof 判定不稳定，直接传 Uint8Array 视图最稳妥。
  const view =
    buffer instanceof Uint8Array
      ? buffer
      : new Uint8Array(buffer);
  const hash = await crypto.subtle.digest("SHA-256", view);
  return bufferToHex(hash);
}

/** 对单个分片（Blob）计算 SHA-256 */
export async function computeChunkHash(chunk: Blob): Promise<string> {
  const data = await chunk.arrayBuffer();
  return digest(data);
}

/**
 * 基于所有分片哈希计算整文件哈希。
 * 将所有分片哈希（每个 32 字节）紧凑拼接后做一次 SHA-256。
 */
export async function computeFileHashFromChunkHashes(
  chunkHashes: string[],
): Promise<string> {
  const metaBuffer = new Uint8Array(chunkHashes.length * 32);
  chunkHashes.forEach((hash, index) => {
    metaBuffer.set(hexToBytes(hash), index * 32);
  });
  return digest(metaBuffer);
}

/**
 * 完整的两阶段哈希计算：返回整文件哈希与各分片哈希。
 *
 * @param file      待计算文件
 * @param chunkSize 分片大小（字节）
 * @param onProgress 可选进度回调，每完成一个分片触发一次
 */
export async function computeFileHash(
  file: File | Blob,
  chunkSize: number,
  onProgress?: (processedChunks: number, totalChunks: number) => void,
): Promise<{ fileHash: string; chunkHashes: string[] }> {
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
  const chunkHashes: string[] = [];

  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunk = file.slice(start, end);
    // eslint-disable-next-line no-await-in-loop
    const chunkHash = await computeChunkHash(chunk);
    chunkHashes.push(chunkHash);
    onProgress?.(index + 1, totalChunks);
  }

  const fileHash = await computeFileHashFromChunkHashes(chunkHashes);
  return { fileHash, chunkHashes };
}
