import type { DataSource } from "typeorm";
import { In } from "typeorm";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { KnowledgeBaseVectorChunk } from "@/server/db/entities/KnowledgeBaseVectorChunk";
import {
  embeddingModelId,
  getKnowledgeBaseEmbeddings,
  resolveKnowledgeBaseEmbeddingConfig,
} from "@/server/knowledge-base/embedding";
import { cosineSimilarity, cosineToUnitScore } from "@/server/knowledge-base/similarity";

export type RetrievedChunk = {
  knowledgeBaseId: string;
  chunkIndex: number;
  score: number;
  chunkContent: string;
};

export type RetrieveOptions = {
  userId: string;
  knowledgeBaseIds: string[];
  query: string;
  topK: number;
  threshold: number;
};

export async function retrieveKnowledgeBaseChunks(
  ds: DataSource,
  options: RetrieveOptions,
): Promise<RetrievedChunk[]> {
  const { userId, knowledgeBaseIds, query, topK, threshold } = options;
  if (knowledgeBaseIds.length === 0) return [];

  const kbRepo = ds.getRepository(KnowledgeBase);
  const chunkRepo = ds.getRepository(KnowledgeBaseVectorChunk);

  // 只允许检索本人知识库，且必须 vectorStatus=success
  const kbs = await kbRepo.find({
    where: { id: In(knowledgeBaseIds) } as any,
  });
  const readable = kbs.filter((k) => k.userId === userId && k.vectorStatus === "success");
  const scopeIds = readable.map((k) => k.id);
  if (scopeIds.length === 0) return [];

  // 仅取当前版本 hash 的 chunks（防旧内容混入）
  const currentHashByKb = new Map<string, string>();
  for (const k of readable) {
    if (k.vectorContentHash) currentHashByKb.set(k.id, k.vectorContentHash);
  }

  const cfg = await resolveKnowledgeBaseEmbeddingConfig(userId);
  const embeddings = getKnowledgeBaseEmbeddings(cfg);
  const queryVec = await embeddings.embedQuery(query);
  const embModel = embeddingModelId(cfg);

  const out: RetrievedChunk[] = [];
  for (const kbId of scopeIds) {
    const hash = currentHashByKb.get(kbId);
    if (!hash) continue;
    const chunks = await chunkRepo.find({
      where: { knowledgeBaseId: kbId, vectorContentHash: hash } as any,
    });
    for (const c of chunks) {
      const cos = cosineSimilarity(queryVec, c.embedding);
      const score = cosineToUnitScore(cos);
      if (score >= threshold) {
        out.push({
          knowledgeBaseId: kbId,
          chunkIndex: c.chunkIndex,
          score,
          chunkContent: c.chunkContent,
        });
      }
    }
  }

  out.sort((a, b) => b.score - a.score);
  const sliced = out.slice(0, topK);

  console.info(
    JSON.stringify({
      module: "kb.search",
      userId,
      knowledgeBaseIds: scopeIds,
      topK,
      threshold,
      embeddingModel: embModel,
      hitCount: out.length,
      shownCount: sliced.length,
    }),
  );

  return sliced;
}

