import type { DataSource } from "typeorm";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { getAssistantConfiguredKnowledgeBaseIds } from "@/server/knowledge-base/assistant-config";
import { retrieveKnowledgeBaseChunks } from "@/server/knowledge-base/search";
import { resolveKnowledgePreferenceByUserId } from "@/server/knowledge-base/user-preference";

export type KnowledgeInjectionResult = {
  needSearch: boolean;
  reason: string | null;
  chunks: Array<{
    knowledgeBaseId: string;
    knowledgeBaseName: string;
    chunkIndex: number;
    score: number;
    chunkContent: string;
  }>;
  systemMessageText: string | null;
};

export async function buildKnowledgeInjectionForChat(options: {
  ds: DataSource;
  userId: string;
  assistantId: string | null | undefined;
  userMessageText: string;
}): Promise<KnowledgeInjectionResult> {
  const { ds, userId, assistantId, userMessageText } = options;
  if (!assistantId) {
    return { needSearch: false, reason: null, chunks: [], systemMessageText: null };
  }

  const kbIds = await getAssistantConfiguredKnowledgeBaseIds(ds, assistantId, userId);
  if (kbIds.length === 0) {
    return { needSearch: false, reason: null, chunks: [], systemMessageText: null };
  }

  const kbRepo = ds.getRepository(KnowledgeBase);
  const kbs = await kbRepo.createQueryBuilder("kb")
    .where("kb.userId = :uid", { uid: userId })
    .andWhere("kb.id IN (:...ids)", { ids: kbIds })
    .getMany();

  const pref = await resolveKnowledgePreferenceByUserId(userId);
  const retrieved = await retrieveKnowledgeBaseChunks(ds, {
    userId,
    knowledgeBaseIds: kbIds,
    query: userMessageText,
    topK: pref.topK,
    threshold: pref.threshold,
  });

  const nameById = new Map(kbs.map((k) => [k.id, k.name]));
  const chunks = retrieved.map((c) => ({
    knowledgeBaseId: c.knowledgeBaseId,
    knowledgeBaseName: nameById.get(c.knowledgeBaseId) ?? c.knowledgeBaseId,
    chunkIndex: c.chunkIndex,
    score: c.score,
    chunkContent: c.chunkContent,
  }));

  const needSearch = chunks.length > 0;
  const reason = needSearch ? "direct_vector_search" : "no_hit_above_threshold";

  console.info(
    JSON.stringify({
      module: "kb.intent",
      userId,
      assistantId,
      needSearch,
      reason,
      intentSource: "removed_direct_search",
      knowledgeBaseCount: kbs.length,
      injectedChunkCount: chunks.length,
    }),
  );

  if (!needSearch) {
    return { needSearch, reason, chunks, systemMessageText: null };
  }

  const lines: string[] = [];
  lines.push(
    [
      "【知识库检索片段】",
      "以下内容来自当前用户已绑定知识库的向量检索结果（按相似度排序），仅供你结合其余系统提示词与用户消息判断是否采用、如何取舍。",
      "若你在回答中引用了某段内容：请勿编造该段中未出现的具体事实、数字、条款等；也不要将未出现于下列片段的信息表述为来自知识库。",
      "",
      "—— 以下为检索片段 ——",
    ].join("\n"),
  );
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    lines.push(
      `\n[${i + 1}] 知识库：${c.knowledgeBaseName}；chunkIndex=${c.chunkIndex}；score=${c.score.toFixed(6)}\n${c.chunkContent}`,
    );
  }
  lines.push("\n\n—— 以上为检索片段 ——");

  return { needSearch, reason, chunks, systemMessageText: lines.join("\n") };
}

