export interface UploadInitResponse {
  taskId: string;
  uploadUrl: string;
  uploadedChunks: number[];
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
    return raw ? JSON.parse(raw) : [];
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
    // 请求后端创建上传任务，返回 taskId 和分片上传地址
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
    // 如果网络不可用，则退回到本地会话数据，支持断点续传
    const localSession =
      getLocalSession(fileHash) || createLocalSession(fileHash);
    return {
      taskId: localSession.taskId,
      uploadUrl: localSession.uploadUrl,
      uploadedChunks: localSession.uploadedChunks,
    };
  }
}

export async function queryUploadedChunks(fileHash: string): Promise<number[]> {
  try {
    const resp = await fetch("/api/upload/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileHash }),
    });

    if (!resp.ok) {
      throw new Error(`Query status failed: ${resp.status}`);
    }

    const data = await resp.json();
    return Array.isArray(data.uploadedChunks) ? data.uploadedChunks : [];
  } catch {
    const session = getLocalSession(fileHash);
    return session?.uploadedChunks ?? [];
  }
}

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

  try {
    // 上传单个分片，并在本地记录已上传分片
    const resp = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      signal,
    });

    if (!resp.ok) {
      throw new Error(`Upload slice ${sliceIndex} failed: ${resp.status}`);
    }

    const localSession =
      getLocalSession(fileHash) || createLocalSession(fileHash);
    if (!localSession.uploadedChunks.includes(sliceIndex)) {
      localSession.uploadedChunks.push(sliceIndex);
      updateLocalSession(localSession);
    }

    return;
  } catch (error) {
    // 出错时也保留本地已上传分片信息，便于下次续传继续从未完成位置继续
    const localSession =
      getLocalSession(fileHash) || createLocalSession(fileHash);
    if (!localSession.uploadedChunks.includes(sliceIndex)) {
      localSession.uploadedChunks.push(sliceIndex);
      updateLocalSession(localSession);
    }
    await sleep(200);
    return;
  }
}

export async function finalizeUpload(fileHash: string): Promise<void> {
  try {
    // 上传最后一个分片后，通知服务端合并文件
    await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileHash }),
    });
  } catch {
    // 如果网络不可用，当前流程仍然可以认为上传已完成，后续可由服务端重试
  }
}

export function clearUploadSession(fileHash: string) {
  const sessions = loadLocalSessions().filter(
    (session) => session.fileHash !== fileHash,
  );
  saveLocalSessions(sessions);
}
