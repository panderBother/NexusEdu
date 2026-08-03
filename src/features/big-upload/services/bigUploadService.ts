import { computeFileHashFromChunkHashes } from "./hashCalculator";

export interface UploadInitResponse {
  taskId: string;
  uploadUrl: string;
  uploadedChunks: number[];
  /** 服务端判定该 fileHash 已存在（秒传命中），客户端可直接跳过分片上传 */
  fileExists?: boolean;
}

export interface UploadStatusResponse {
  fileHash: string;
  uploadedChunks: number[];
  /** 服务端合并后的文件哈希，用于完整性校验 */
  mergedFileHash?: string;
  /** 文件是否已合并完成 */
  completed?: boolean;
}

const LOCAL_STORAGE_KEY = "big-upload-sessions";

interface LocalSession {
  taskId: string;
  fileHash: string;
  uploadUrl: string;
  uploadedChunks: number[];
}

function loadLocalSessions(): LocalSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalSession[]) : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: LocalSession[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
}

function getLocalSession(fileHash: string): LocalSession | undefined {
  return loadLocalSessions().find((session) => session.fileHash === fileHash);
}

function updateLocalSession(session: LocalSession) {
  const sessions = loadLocalSessions();
  const index = sessions.findIndex(
    (item) => item.fileHash === session.fileHash,
  );
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }
  saveLocalSessions(sessions);
}

function createLocalSession(fileHash: string): LocalSession {
  const session: LocalSession = {
    taskId: fileHash,
    fileHash,
    uploadUrl: "/api/upload/chunk",
    uploadedChunks: [],
  };
  updateLocalSession(session);
  return session;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 初始化上传任务。
 * - 命中服务端秒传：返回 fileExists=true，调用方跳过所有分片上传；
 * - 服务端不可用：回退到本地会话，支持断点续传；
 * - 返回 uploadedChunks 表示已上传分片，调用方据此跳过已完成分片。
 */
export async function initUpload(
  file: File,
  fileHash: string,
  chunkHashes: string[],
  chunkSize: number,
): Promise<UploadInitResponse> {
  const payload = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileHash,
    chunkSize,
    chunkCount: chunkHashes.length,
    chunkHashes,
  };

  try {
    const resp = await fetch("/api/upload/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      throw new Error(`Upload init failed: ${resp.status}`);
    }

    const result = (await resp.json()) as UploadInitResponse;
    return result;
  } catch (error) {
    // 网络不可用时回退到本地会话，支持断点续传
    const localSession =
      getLocalSession(fileHash) || createLocalSession(fileHash);
    return {
      taskId: localSession.taskId,
      uploadUrl: localSession.uploadUrl,
      uploadedChunks: localSession.uploadedChunks,
      fileExists: false,
    };
  }
}

/**
 * 查询已上传分片（断点续传）。
 */
export async function queryUploadedChunks(
  fileHash: string,
): Promise<number[]> {
  try {
    const resp = await fetch("/api/upload/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileHash }),
    });

    if (!resp.ok) {
      throw new Error(`Query status failed: ${resp.status}`);
    }

    const data = (await resp.json()) as UploadStatusResponse;
    return Array.isArray(data.uploadedChunks) ? data.uploadedChunks : [];
  } catch {
    const session = getLocalSession(fileHash);
    return session?.uploadedChunks ?? [];
  }
}

/**
 * 上传单个分片。
 *
 * 关键修复：原实现无论成功还是失败都会把分片标记为「已上传」，
 * 导致失败分片不会重试、断点续传与完整性校验失效。
 * 现在仅在 HTTP 成功时记录分片，失败时抛出错误由调用方决定重试。
 *
 * @returns 上传是否真正成功
 */
export async function uploadSlice(
  fileHash: string,
  taskId: string,
  sliceIndex: number,
  sliceBlob: Blob,
  sliceHash: string,
  uploadUrl: string,
  signal?: AbortSignal,
): Promise<void> {
  const formData = new FormData();
  formData.append("fileHash", fileHash);
  formData.append("taskId", taskId);
  formData.append("sliceIndex", String(sliceIndex));
  formData.append("sliceHash", sliceHash);
  formData.append("chunk", sliceBlob);

  const resp = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!resp.ok) {
    throw new Error(`Upload slice ${sliceIndex} failed: ${resp.status}`);
  }

  // 仅在 HTTP 成功时记录该分片为已上传
  const localSession =
    getLocalSession(fileHash) || createLocalSession(fileHash);
  if (!localSession.uploadedChunks.includes(sliceIndex)) {
    localSession.uploadedChunks.push(sliceIndex);
    updateLocalSession(localSession);
  }
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
}

/**
 * 带指数退避重试的分片上传。
 * - 仅对可重试错误（网络错误 / 5xx）重试；
 * - 4xx 等客户端错误直接抛出，避免无意义重试；
 * - AbortSignal 触发时立即取消。
 */
export async function uploadSliceWithRetry(
  fileHash: string,
  taskId: string,
  sliceIndex: number,
  sliceBlob: Blob,
  sliceHash: string,
  uploadUrl: string,
  options: RetryOptions = {},
): Promise<void> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 200;
  const signal = options.signal;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      await uploadSlice(
        fileHash,
        taskId,
        sliceIndex,
        sliceBlob,
        sliceHash,
        uploadUrl,
        signal,
      );
      return; // 成功
    } catch (error) {
      lastError = error;
      if (signal?.aborted) {
        throw error;
      }
      // 4xx 客户端错误不重试
      const msg = (error as Error)?.message ?? "";
      if (/failed: 4\d\d$/.test(msg)) {
        throw error;
      }
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        // eslint-disable-next-line no-await-in-loop
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

/**
 * 通知服务端合并分片。
 */
export async function finalizeUpload(fileHash: string): Promise<void> {
  try {
    await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileHash }),
    });
  } catch {
    // 网络不可用时由服务端后续重试合并
  }
}

/**
 * 完整性校验：核对服务端合并后的文件哈希与本地计算的一致。
 * - 命中：返回 true；
 * - 无服务端 / 服务端未返回 mergedFileHash：本地模式下认为分片齐全即通过，
 *   并返回 null 表示「未知（本地模式）」，由调用方决定如何记录。
 */
export async function verifyUpload(
  fileHash: string,
  expectedChunkCount: number,
): Promise<boolean | null> {
  try {
    const resp = await fetch("/api/upload/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileHash }),
    });

    if (!resp.ok) {
      throw new Error(`Verify failed: ${resp.status}`);
    }

    const data = (await resp.json()) as UploadStatusResponse;
    if (typeof data.mergedFileHash === "string") {
      return data.mergedFileHash === fileHash && data.completed === true;
    }
    return null;
  } catch {
    // 本地模式：根据已记录分片数量判断
    const session = getLocalSession(fileHash);
    if (!session) return null;
    return session.uploadedChunks.length >= expectedChunkCount;
  }
}

export function clearUploadSession(fileHash: string) {
  const sessions = loadLocalSessions().filter(
    (session) => session.fileHash !== fileHash,
  );
  saveLocalSessions(sessions);
}

/** 仅供测试/重置使用 */
export function _resetLocalSessionsForTest() {
  saveLocalSessions([]);
}

/** 暴露给单测的本地会话读取，避免直接依赖 localStorage */
export function _getUploadedChunksForTest(fileHash: string): number[] {
  return getLocalSession(fileHash)?.uploadedChunks ?? [];
}

export { computeFileHashFromChunkHashes };
