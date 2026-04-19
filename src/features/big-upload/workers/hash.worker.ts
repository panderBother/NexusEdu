interface ComputeHashPayload {
  file: File;
  chunkSize: number;
}

type WorkerRequest = {
  type: "COMPUTE_HASH";
  payload: ComputeHashPayload;
};

// 这里使用两阶段哈希：先计算每个分片的 hash，再基于所有分片 hash 计算完整文件 hash。
// 这样可以避免直接对整个大文件做一次完整哈希，提升计算效率。

type WorkerResponse =
  | {
      type: "HASH_PROGRESS";
      payload: { processedChunks: number; totalChunks: number };
    }
  | {
      type: "HASH_COMPLETE";
      payload: { fileHash: string; chunkHashes: string[] };
    }
  | { type: "HASH_ERROR"; payload: { message: string } };

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function digest(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return bufferToHex(hash);
}

async function computeChunkHash(chunk: Blob): Promise<string> {
  const data = await chunk.arrayBuffer();
  return digest(data);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { data } = event;

  if (data.type !== "COMPUTE_HASH") return;

  try {
    const { file, chunkSize } = data.payload;
    const totalChunks = Math.ceil(file.size / chunkSize);
    const chunkHashes: string[] = [];

    // 先逐个分片计算 hash，并将分片 hash 记录下来
    for (let index = 0; index < totalChunks; index += 1) {
      const start = index * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      const chunkHash = await computeChunkHash(chunk);
      chunkHashes.push(chunkHash);
      self.postMessage({
        type: "HASH_PROGRESS",
        payload: { processedChunks: index + 1, totalChunks },
      });
    }

    // 再通过所有分片 hash 的拼接结果计算整个文件 hash
    const metaBuffer = new Uint8Array(chunkHashes.length * 32);
    chunkHashes.forEach((hash, index) => {
      metaBuffer.set(hexToBytes(hash), index * 32);
    });

    const fileHash = await digest(metaBuffer.buffer);
    self.postMessage({
      type: "HASH_COMPLETE",
      payload: { fileHash, chunkHashes },
    });
  } catch (error: any) {
    self.postMessage({
      type: "HASH_ERROR",
      payload: { message: error?.message || "Unknown error" },
    });
  }
};
