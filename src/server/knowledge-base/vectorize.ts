import { v4 as uuidv4 } from "uuid";
import type { DataSource } from "typeorm";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { KnowledgeBaseVectorChunk } from "@/server/db/entities/KnowledgeBaseVectorChunk";
import { computeKnowledgeBaseContentHash } from "@/server/knowledge-base/content-hash";
import { splitKnowledgeBaseContent } from "@/server/knowledge-base/chunking";
import {
  embeddingModelId,
  getKnowledgeBaseEmbeddings,
  resolveKnowledgeBaseEmbeddingConfig,
} from "@/server/knowledge-base/embedding";
import { resolveKnowledgePreferenceByUserId } from "@/server/knowledge-base/user-preference";

export type VectorizeResult = {
  knowledgeBaseId: string;
  vectorContentHash: string;
  chunkCount: number;
  embeddingModel: string;
};

function getHttpStatusFromError(e: unknown): number | null {
  if (!e || typeof e !== "object") return null;
  const any = e as Record<string, unknown>;
  const status = any.status;
  if (typeof status === "number" && Number.isFinite(status)) return status;
  const statusCode = any.statusCode;
  if (typeof statusCode === "number" && Number.isFinite(statusCode)) return statusCode;
  const response = any.response;
  if (response && typeof response === "object") {
    const rs = (response as Record<string, unknown>).status;
    if (typeof rs === "number" && Number.isFinite(rs)) return rs;
  }
  return null;
}

function toSafeErrorMessage(e: unknown, extra?: { embeddingModel?: string }): string {
  const raw = e instanceof Error ? e.message : String(e ?? "");
  const status = getHttpStatusFromError(e);
  const parts: string[] = [];
  if (status) parts.push(`${status}`);
  parts.push(raw);
  if (extra?.embeddingModel) parts.push(`embedding=${extra.embeddingModel}`);

  const merged = parts.filter(Boolean).join(" | ");
  const trimmed = merged.slice(0, 480);

  // 给常见云厂商兼容层错误补一个可行动提示（不含敏感信息）
  if (trimmed.includes("400") && trimmed.includes("no body")) {
    return `${trimmed} | 可能原因：向量化模型不支持或参数不兼容；请检查 KB_EMBEDDING_MODEL / KB_EMBEDDING_PROVIDER`;
  }
  if (status === 429) {
    return `${trimmed} | 可能触发限流（429），请稍后重试或降低并发/分片大小`;
  }
  return trimmed;
}

async function sleepMs(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function embedDocumentsWithRetry(
  fn: () => Promise<number[][]>,
  embeddingModel: string,
): Promise<number[][]> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const status = getHttpStatusFromError(e);
      const canRetry = status === 429 || status === 503;
      if (!canRetry || attempt === maxAttempts) {
        throw e;
      }
      const backoff = 600 * Math.pow(2, attempt - 1);
      console.warn(
        JSON.stringify({
          module: "kb.vectorize",
          action: "embed_retry",
          embeddingModel,
          attempt,
          backoffMs: backoff,
          status,
          message: e instanceof Error ? e.message : String(e),
        }),
      );
      await sleepMs(backoff);
    }
  }
  // unreachable
  return [];
}

function resolveEmbeddingBatchSize(): number {
  const raw = Number.parseInt(process.env.KB_EMBEDDING_BATCH_SIZE ?? "16", 10);
  if (!Number.isFinite(raw) || raw < 1) return 16;
  return Math.min(raw, 128);
}

async function embedDocumentsInBatchesWithAutoShrink(
  texts: string[],
  embeddingModel: string,
  embedBatch: (batch: string[]) => Promise<number[][]>,
): Promise<number[][]> {
  const out: number[][] = [];
  let batchSize = resolveEmbeddingBatchSize();
  let idx = 0;

  while (idx < texts.length) {
    const end = Math.min(idx + batchSize, texts.length);
    const batch = texts.slice(idx, end);
    try {
      const vectors = await embedDocumentsWithRetry(
        () => embedBatch(batch),
        embeddingModel,
      );
      out.push(...vectors);
      idx = end;
    } catch (e) {
      const status = getHttpStatusFromError(e);
      // 413 说明单请求过大：自动减小 batchSize 重试
      if (status === 413 && batchSize > 1) {
        const nextBatch = Math.max(1, Math.floor(batchSize / 2));
        console.warn(
          JSON.stringify({
            module: "kb.vectorize",
            action: "embed_batch_shrink",
            embeddingModel,
            status,
            fromBatchSize: batchSize,
            toBatchSize: nextBatch,
            atIndex: idx,
          }),
        );
        batchSize = nextBatch;
        continue;
      }
      throw e;
    }
  }

  return out;
}

export async function vectorizeKnowledgeBase(ds: DataSource, kb: KnowledgeBase): Promise<VectorizeResult> {
  const now = new Date();
  const kbRepo = ds.getRepository(KnowledgeBase);
  const chunkRepo = ds.getRepository(KnowledgeBaseVectorChunk);

  const vectorContentHash = computeKnowledgeBaseContentHash(kb.contentFormat, kb.content);

  // 先标记 pending，便于 UI 轮询
  await kbRepo.update(
    { id: kb.id, userId: kb.userId },
    {
      vectorStatus: "pending",
      vectorError: null,
      vectorLastStartedAt: now,
      vectorContentHash,
    },
  );

  try {
    const cfg = await resolveKnowledgeBaseEmbeddingConfig(kb.userId);
    const embeddings = getKnowledgeBaseEmbeddings(cfg);
    const embModel = embeddingModelId(cfg);

    const pref = await resolveKnowledgePreferenceByUserId(kb.userId);
    const chunks = await splitKnowledgeBaseContent(kb.contentFormat, kb.content, {
      chunkSize: pref.chunkSize,
      chunkOverlap: pref.chunkOverlap,
    });
    const texts = chunks.map((c) => c.content);
    const vectors = await embedDocumentsInBatchesWithAutoShrink(
      texts,
      embModel,
      (batch) => embeddings.embedDocuments(batch),
    );

    // 清理旧 chunks（同 knowledgeBaseId 下全部），避免旧内容混入
    await chunkRepo
      .createQueryBuilder()
      .delete()
      .where("knowledgeBaseId = :kid", { kid: kb.id })
      .execute();

    const rows = chunks.map((c, idx) =>
      chunkRepo.create({
        id: uuidv4(),
        knowledgeBaseId: kb.id,
        vectorContentHash,
        chunkIndex: c.chunkIndex,
        chunkContent: c.content,
        chunkMeta: c.meta ?? null,
        embeddingModel: embModel,
        embedding: vectors[idx] ?? [],
      }),
    );
    await chunkRepo.save(rows);

    await kbRepo.update(
      { id: kb.id, userId: kb.userId },
      {
        vectorStatus: "success",
        vectorUpdatedAt: new Date(),
        vectorError: null,
        vectorContentHash,
      },
    );

    console.info(
      JSON.stringify({
        module: "kb.vectorize",
        knowledgeBaseId: kb.id,
        userId: kb.userId,
        contentFormat: kb.contentFormat,
        contentLength: kb.content.length,
        chunkCount: rows.length,
        embeddingModel: embModel,
        chunkSize: pref.chunkSize,
        chunkOverlap: pref.chunkOverlap,
        status: "success",
      }),
    );

    return {
      knowledgeBaseId: kb.id,
      vectorContentHash,
      chunkCount: rows.length,
      embeddingModel: embModel,
    };
  } catch (e) {
    let emb: string | undefined;
    try {
      const cfg = await resolveKnowledgeBaseEmbeddingConfig(kb.userId);
      emb = embeddingModelId(cfg);
    } catch {
      emb = undefined;
    }
    const msg = toSafeErrorMessage(e, { embeddingModel: emb });
    await kbRepo.update(
      { id: kb.id, userId: kb.userId },
      { vectorStatus: "failed", vectorError: msg },
    );
    console.error(
      JSON.stringify({
        module: "kb.vectorize",
        knowledgeBaseId: kb.id,
        userId: kb.userId,
        status: "failed",
        httpStatus: getHttpStatusFromError(e),
        error: msg,
      }),
    );
    throw e;
  }
}

