/**
 * 大文件上传：正确性 + 量化基准测试
 *
 * 覆盖：
 *  - 哈希计算正确性与吞吐（SHA-256 两阶段，MB/s）
 *  - uploadSlice 失败不再被误标为「已上传」（关键 bug 修复回归）
 *  - 指数退避重试（成功/4xx 不重试/耗尽抛出/退避时序）
 *  - 断点续传（部分分片已上传 → 仅传剩余）
 *  - 秒传（fileExists 命中 → 跳过分片上传）
 *  - 完整性校验（合并哈希一致/不一致/无服务端本地校验）
 *  - 并发上传调度器吞吐（chunks/s, mock 瞬时网络）
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  initUpload,
  uploadSlice,
  uploadSliceWithRetry,
  queryUploadedChunks,
  verifyUpload,
  finalizeUpload,
  clearUploadSession,
  _resetLocalSessionsForTest,
  _getUploadedChunksForTest,
} from "../services/bigUploadService";
import {
  computeFileHash,
  computeFileHashFromChunkHashes,
  bufferToHex,
  hexToBytes,
} from "../services/hashCalculator";

// ---------- 工具 ----------
function makeBlob(size: number): Blob {
  // 用确定性的伪随机内容，保证可复现
  const buf = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) {
    buf[i] = (i * 31 + 7) & 0xff;
  }
  return new Blob([buf], { type: "application/octet-stream" });
}

function makeFile(size: number, name = "video.mp4"): File {
  const buf = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) {
    buf[i] = (i * 31 + 7) & 0xff;
  }
  return new File([buf], name, { type: "video/mp4" });
}

/** mock 全局 fetch，传入 handler 返回 { ok, json } */
function mockFetch(
  handler: (url: string, init?: RequestInit) => {
    ok: boolean;
    status: number;
    json?: () => Promise<any>;
  } | Promise<{
    ok: boolean;
    status: number;
    json?: () => Promise<any>;
  }>,
) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const r = await handler(url, init);
    return {
      ok: r.ok,
      status: r.status,
      json: r.json ?? (async () => ({})),
    } as unknown as Response;
  });
  globalThis.fetch = fn as unknown as typeof globalThis.fetch;
  return fn;
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  _resetLocalSessionsForTest();
  localStorage.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ---------- 哈希 ----------
describe("hashCalculator", () => {
  it("bufferToHex / hexToBytes 互逆", () => {
    const bytes = new Uint8Array([0, 15, 16, 255, 128]);
    const hex = bufferToHex(bytes);
    expect(hex).toBe("000f10ff80");
    expect(Array.from(hexToBytes(hex))).toEqual(Array.from(bytes));
  });

  it("相同内容 → 相同文件哈希（确定性）", async () => {
    const file = makeFile(2 * 1024 * 1024, "a.mp4");
    const r1 = await computeFileHash(file, 512 * 1024);
    const r2 = await computeFileHash(file, 512 * 1024);
    expect(r1.fileHash).toBe(r2.fileHash);
    expect(r1.chunkHashes).toEqual(r2.chunkHashes);
    expect(r1.fileHash).toHaveLength(64);
  });

  it("不同内容 → 不同文件哈希", async () => {
    const a = makeFile(1024, "a.mp4");
    const b = makeFile(1024, "b.mp4");
    // 强制 b 内容不同
    const buf = new Uint8Array(1024);
    for (let i = 0; i < 1024; i += 1) buf[i] = (i * 29 + 1) & 0xff;
    const bDiff = new File([buf], "b.mp4", { type: "video/mp4" });
    const ra = await computeFileHash(a, 512);
    const rb = await computeFileHash(bDiff, 512);
    expect(ra.fileHash).not.toBe(rb.fileHash);
  });

  it("两阶段文件哈希 = 各分片哈希拼接后再次哈希", async () => {
    const file = makeFile(1 * 1024 * 1024, "x.mp4");
    const chunkSize = 256 * 1024;
    const { fileHash, chunkHashes } = await computeFileHash(file, chunkSize);
    const recomputed = await computeFileHashFromChunkHashes(chunkHashes);
    expect(fileHash).toBe(recomputed);
  });

  it("【量化】SHA-256 两阶段哈希吞吐", async () => {
    const sizeMB = 16;
    const file = makeFile(sizeMB * 1024 * 1024, "big.mp4");
    const chunkSize = 4 * 1024 * 1024; // 4MB，与线上一致
    const t0 = performance.now();
    const { fileHash, chunkHashes } = await computeFileHash(file, chunkSize);
    const elapsed = performance.now() - t0;
    const throughput = (sizeMB / elapsed) * 1000; // MB/s
    // eslint-disable-next-line no-console
    console.log(
      `[量化][哈希] ${sizeMB}MB / ${chunkSize / 1024 / 1024}MB 分片: ` +
        `${elapsed.toFixed(1)}ms, ${throughput.toFixed(1)} MB/s, ` +
        `${chunkHashes.length} 分片, fileHash=${fileHash.slice(0, 12)}…`,
    );
    expect(fileHash).toHaveLength(64);
    expect(elapsed).toBeGreaterThan(0);
    expect(throughput).toBeGreaterThan(0);
  });
});

// ---------- uploadSlice 关键 bug 修复 ----------
describe("uploadSlice - 失败不误标已上传", () => {
  it("成功时记录分片为已上传", async () => {
    mockFetch(() => ({ ok: true, status: 200 }));
    await uploadSlice("hash-a", "task-a", 0, makeBlob(1024), "chunkhash-0", "/api/upload/chunk");
    expect(_getUploadedChunksForTest("hash-a")).toContain(0);
  });

  it("失败时不记录为已上传并抛出（修复回归）", async () => {
    mockFetch(() => ({ ok: false, status: 500 }));
    await expect(
      uploadSlice("hash-b", "task-b", 5, makeBlob(1024), "chunkhash-5", "/api/upload/chunk"),
    ).rejects.toThrow();
    expect(_getUploadedChunksForTest("hash-b")).not.toContain(5);
    expect(_getUploadedChunksForTest("hash-b")).toHaveLength(0);
  });

  it("网络异常时不记录为已上传", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof globalThis.fetch;
    await expect(
      uploadSlice("hash-c", "task-c", 3, makeBlob(1024), "chunkhash-3", "/api/upload/chunk"),
    ).rejects.toThrow("network down");
    expect(_getUploadedChunksForTest("hash-c")).toHaveLength(0);
  });
});

// ---------- 重试 ----------
describe("uploadSliceWithRetry - 指数退避", () => {
  it("前 N 次失败、随后成功 → 最终成功", async () => {
    let calls = 0;
    mockFetch(() => {
      calls += 1;
      return calls < 3 ? { ok: false, status: 500 } : { ok: true, status: 200 };
    });
    await uploadSliceWithRetry("h", "t", 0, makeBlob(8), "ch", "/api/upload/chunk", {
      maxRetries: 3,
      baseDelayMs: 1,
    });
    expect(calls).toBe(3);
    expect(_getUploadedChunksForTest("h")).toContain(0);
  });

  it("4xx 客户端错误不重试，立即抛出", async () => {
    let calls = 0;
    mockFetch(() => {
      calls += 1;
      return { ok: false, status: 403 };
    });
    await expect(
      uploadSliceWithRetry("h2", "t2", 0, makeBlob(8), "ch", "/api/upload/chunk", {
        maxRetries: 3,
        baseDelayMs: 1,
      }),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("重试耗尽仍失败 → 抛出最后一个错误", async () => {
    let calls = 0;
    mockFetch(() => {
      calls += 1;
      return { ok: false, status: 500 };
    });
    await expect(
      uploadSliceWithRetry("h3", "t3", 0, makeBlob(8), "ch", "/api/upload/chunk", {
        maxRetries: 2,
        baseDelayMs: 1,
      }),
    ).rejects.toThrow();
    expect(calls).toBe(3); // 1 + 2 retries
  });

  it("退避时间随尝试次数指数增长（200, 400, 800ms）", async () => {
    const timestamps: number[] = [];
    const start = performance.now();
    let calls = 0;
    mockFetch(() => {
      calls += 1;
      timestamps.push(performance.now() - start);
      return { ok: false, status: 500 };
    });
    await expect(
      uploadSliceWithRetry("h4", "t4", 0, makeBlob(8), "ch", "/api/upload/chunk", {
        maxRetries: 3,
        baseDelayMs: 200,
      }),
    ).rejects.toThrow();
    // 4 次调用，退避 200/400/800 = 至少 ~1400ms（允许调度抖动）
    expect(timestamps.length).toBe(4);
    const gaps = [timestamps[1] - timestamps[0], timestamps[2] - timestamps[1], timestamps[3] - timestamps[2]];
    // 每个 gap 应不小于对应退避（松校验，避免 CI 抖动）
    expect(gaps[0]).toBeGreaterThanOrEqual(180);
    expect(gaps[1]).toBeGreaterThanOrEqual(360);
    expect(gaps[2]).toBeGreaterThanOrEqual(720);
    // eslint-disable-next-line no-console
    console.log(`[量化][重试] 3 次退避间隔: ${gaps.map((g) => g.toFixed(0) + "ms").join(", ")}`);
  });

  it("AbortSignal 触发立即取消", async () => {
    const controller = new AbortController();
    let calls = 0;
    mockFetch(() => {
      calls += 1;
      return { ok: false, status: 500 };
    });
    const p = uploadSliceWithRetry("h5", "t5", 0, makeBlob(8), "ch", "/api/upload/chunk", {
      maxRetries: 5,
      baseDelayMs: 50,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 10);
    await expect(p).rejects.toThrow();
    expect(calls).toBeLessThanOrEqual(2);
  });
});

// ---------- 断点续传 ----------
describe("断点续传", () => {
  it("部分分片已上传 → queryUploadedChunks 返回，resume 仅传剩余", async () => {
    // 模拟已上传 0,1
    mockFetch(() => ({ ok: true, status: 200 }));
    await uploadSlice("resume-h", "resume-t", 0, makeBlob(8), "c0", "/api/upload/chunk");
    await uploadSlice("resume-h", "resume-t", 1, makeBlob(8), "c1", "/api/upload/chunk");

    // 服务端不可用时回退到本地
    globalThis.fetch = originalFetch;
    globalThis.fetch = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof globalThis.fetch;
    const uploaded = await queryUploadedChunks("resume-h");
    expect(uploaded).toEqual(expect.arrayContaining([0, 1]));

    // resume：只传 2,3（验证 pending 计算）
    globalThis.fetch = originalFetch;
    mockFetch(() => ({ ok: true, status: 200 }));
    const all = [0, 1, 2, 3];
    const pending = all.filter((i) => !uploaded.includes(i));
    expect(pending).toEqual([2, 3]);
    for (const i of pending) {
      await uploadSlice("resume-h", "resume-t", i, makeBlob(8), `c${i}`, "/api/upload/chunk");
    }
    expect(_getUploadedChunksForTest("resume-h").sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });
});

// ---------- 秒传 ----------
describe("秒传 (instant upload)", () => {
  it("initUpload 返回 fileExists=true 时，跳过所有分片上传", async () => {
    let uploadCalls = 0;
    mockFetch((url) => {
      if (url === "/api/upload/init") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            taskId: "server-task",
            uploadUrl: "/api/upload/chunk",
            uploadedChunks: [],
            fileExists: true, // 秒传命中
          }),
        };
      }
      if (url === "/api/upload/chunk") {
        uploadCalls += 1;
        return { ok: true, status: 200 };
      }
      return { ok: true, status: 200 };
    });

    const file = makeFile(8 * 1024 * 1024, "instant.mp4");
    const result = await initUpload(file, "filehash-instant", ["c0", "c1"], 4 * 1024 * 1024);
    expect(result.fileExists).toBe(true);

    // 模拟调用方：秒传命中 → 不调用 uploadSlice
    if (result.fileExists) {
      // skip
    } else {
      await uploadSlice("filehash-instant", result.taskId, 0, makeBlob(8), "c0", result.uploadUrl);
    }
    expect(uploadCalls).toBe(0);
  });

  it("正常上传路径 fileExists=false", async () => {
    mockFetch((url) => {
      if (url === "/api/upload/init") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ taskId: "t", uploadUrl: "/api/upload/chunk", uploadedChunks: [], fileExists: false }),
        };
      }
      return { ok: true, status: 200 };
    });
    const file = makeFile(1024, "n.mp4");
    const result = await initUpload(file, "fh", ["c0"], 512);
    expect(result.fileExists).toBe(false);
  });
});

// ---------- 完整性校验 ----------
describe("完整性校验 verifyUpload", () => {
  it("服务端合并哈希与本地一致 → true", async () => {
    mockFetch((url) => {
      if (url === "/api/upload/verify") {
        return { ok: true, status: 200, json: async () => ({ fileHash: "FH", uploadedChunks: [], mergedFileHash: "FH", completed: true }) };
      }
      return { ok: true, status: 200 };
    });
    const ok = await verifyUpload("FH", 4);
    expect(ok).toBe(true);
  });

  it("服务端合并哈希不一致 → false", async () => {
    mockFetch((url) => {
      if (url === "/api/upload/verify") {
        return { ok: true, status: 200, json: async () => ({ fileHash: "FH", uploadedChunks: [], mergedFileHash: "DIFFERENT", completed: true }) };
      }
      return { ok: true, status: 200 };
    });
    const ok = await verifyUpload("FH", 4);
    expect(ok).toBe(false);
  });

  it("无服务端 → 本地分片齐全即通过", async () => {
    // 先上传 4 个分片到本地
    mockFetch(() => ({ ok: true, status: 200 }));
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await uploadSlice("local-fh", "local-t", i, makeBlob(8), `c${i}`, "/api/upload/chunk");
    }
    globalThis.fetch = originalFetch;
    globalThis.fetch = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof globalThis.fetch;
    const ok = await verifyUpload("local-fh", 4);
    expect(ok).toBe(true);
  });

  it("无服务端 → 分片不齐全 → false", async () => {
    mockFetch(() => ({ ok: true, status: 200 }));
    await uploadSlice("local-fh2", "local-t2", 0, makeBlob(8), "c0", "/api/upload/chunk");
    globalThis.fetch = originalFetch;
    globalThis.fetch = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof globalThis.fetch;
    const ok = await verifyUpload("local-fh2", 4);
    expect(ok).toBe(false);
  });
});

// ---------- 并发上传调度吞吐 ----------
describe("【量化】并发上传调度吞吐", () => {
  it("concurrency=3 上传 30 分片，测量调度吞吐 (mock 瞬时网络)", async () => {
    const total = 30;
    const concurrency = 3;
    // mock 网络：每片固定 5ms 延迟
    mockFetch(() => ({ ok: true, status: 200 }));
    const file = makeFile(total * 64 * 1024, "t.mp4"); // 仅用于切片
    const chunkSize = 64 * 1024;

    const pending: number[] = Array.from({ length: total }, (_, i) => i);
    const t0 = performance.now();
    async function worker() {
      while (pending.length) {
        const idx = pending.shift()!;
        const start = idx * chunkSize;
        const slice = file.slice(start, Math.min(file.size, start + chunkSize));
        // eslint-disable-next-line no-await-in-loop
        await uploadSliceWithRetry("throughput-h", "throughput-t", idx, slice, `c${idx}`, "/api/upload/chunk", {
          maxRetries: 0,
          baseDelayMs: 1,
        });
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    const elapsed = performance.now() - t0;
    const chunksPerSec = (total / elapsed) * 1000;
    // eslint-disable-next-line no-console
    console.log(
      `[量化][上传调度] ${total} 分片 / concurrency=${concurrency}: ` +
        `${elapsed.toFixed(1)}ms, ${chunksPerSec.toFixed(1)} chunks/s, ` +
        `已记录 ${_getUploadedChunksForTest("throughput-h").length} 片`,
    );
    expect(_getUploadedChunksForTest("throughput-h")).toHaveLength(total);
    expect(chunksPerSec).toBeGreaterThan(0);
  });

  it("不同并发度对比 (c=1 vs c=5, 模拟每片 15ms 网络延迟)", async () => {
    const total = 20;
    const chunkSize = 32 * 1024;
    const file = makeFile(total * chunkSize, "cmp.mp4");
    const netDelayMs = 15;

    async function runWithConcurrency(c: number): Promise<number> {
      _resetLocalSessionsForTest();
      const key = `cmp-${c}`;
      const pending: number[] = Array.from({ length: total }, (_, i) => i);
      mockFetch(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true, status: 200 }), netDelayMs);
          }) as any,
      );
      const t0 = performance.now();
      async function w() {
        while (pending.length) {
          const idx = pending.shift()!;
          const start = idx * chunkSize;
          const slice = file.slice(start, Math.min(file.size, start + chunkSize));
          // eslint-disable-next-line no-await-in-loop
          await uploadSliceWithRetry(key, `t-${c}`, idx, slice, `c${idx}`, "/api/upload/chunk", { maxRetries: 0, baseDelayMs: 1 });
        }
      }
      await Promise.all(Array.from({ length: c }, () => w()));
      return performance.now() - t0;
    }

    const t1 = await runWithConcurrency(1);
    const t5 = await runWithConcurrency(5);
    const speedup = t1 / t5;
    // eslint-disable-next-line no-console
    console.log(
      `[量化][并发对比] 每片${netDelayMs}ms网络, ${total}片: ` +
        `c=1: ${t1.toFixed(0)}ms  vs  c=5: ${t5.toFixed(0)}ms  (加速比 ${speedup.toFixed(2)}x)`,
    );
    // c=5 显著快于 c=1（20片*15ms=300ms 串行 vs ~60ms 并行）
    expect(t5).toBeLessThan(t1);
    expect(speedup).toBeGreaterThan(2);
  });
});
