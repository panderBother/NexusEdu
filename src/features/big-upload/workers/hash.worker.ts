import {
  computeFileHash,
} from "../services/hashCalculator";

interface ComputeHashPayload {
  file: File;
  chunkSize: number;
}

type WorkerRequest = {
  type: "COMPUTE_HASH";
  payload: ComputeHashPayload;
};

// 两阶段哈希：先逐分片 SHA-256，再基于所有分片哈希拼接结果做一次 SHA-256
// 作为整文件哈希。具体实现见 services/hashCalculator.ts，Worker 与单测共用同一份逻辑。

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

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { data } = event;

  if (data.type !== "COMPUTE_HASH") return;

  try {
    const { file, chunkSize } = data.payload;

    const { fileHash, chunkHashes } = await computeFileHash(
      file,
      chunkSize,
      (processedChunks, totalChunks) => {
        self.postMessage({
          type: "HASH_PROGRESS",
          payload: { processedChunks, totalChunks },
        });
      },
    );

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
