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
      "【Knowledge base retrieval — hits above threshold】",
      "The excerpts below were retrieved from the user's linked knowledge bases (sorted by similarity). They matched this turn and MUST be treated as the primary source for your answer.",
      "Instructions:",
      "1. Answer the user's question using these excerpts. Partial overlap is enough — synthesize steps, definitions, or guidance from what is present; do not refuse merely because the wording differs from the question (e.g. \"get started\" / \"launch\" can answer \"how to buy\" or \"how to provision\").",
      "2. Only state that the knowledge base lacks sufficient information if NONE of the excerpts below are relevant to the user's question at all.",
      "3. When you use an excerpt, do not invent specific facts, numbers, prices, or policy details that do not appear in that excerpt; do not attribute general knowledge as coming from the knowledge base.",
      "",
      "—— Retrieved excerpts ——",
    ].join("\n"),
  );
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    lines.push(
      `\n[${i + 1}] knowledgeBase=${c.knowledgeBaseName}; chunkIndex=${c.chunkIndex}; score=${c.score.toFixed(6)}\n${c.chunkContent}`,
    );
  }
  lines.push("\n\n—— End of retrieved excerpts ——");

  return { needSearch, reason, chunks, systemMessageText: lines.join("\n") };
}

