import {
  KNOWLEDGE_BASE_CHUNK_OVERLAP_DEFAULT,
  KNOWLEDGE_BASE_CHUNK_SIZE_DEFAULT,
  KNOWLEDGE_BASE_SEARCH_THRESHOLD_DEFAULT,
  KNOWLEDGE_BASE_SEARCH_TOPK_DEFAULT,
} from "@/common/constants";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";

const TOPK_MIN = 1;
const TOPK_MAX = 20;
const THRESHOLD_MIN = 0;
const THRESHOLD_MAX = 1;
const CHUNK_SIZE_MIN = 200;
const CHUNK_SIZE_MAX = 4000;
const CHUNK_OVERLAP_MIN = 0;
const CHUNK_OVERLAP_MAX = 1000;

function clampNumber(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeTopK(raw: number | null | undefined): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return KNOWLEDGE_BASE_SEARCH_TOPK_DEFAULT;
  }
  return clampNumber(Math.floor(raw), TOPK_MIN, TOPK_MAX);
}

function normalizeThreshold(raw: number | null | undefined): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return KNOWLEDGE_BASE_SEARCH_THRESHOLD_DEFAULT;
  }
  return clampNumber(raw, THRESHOLD_MIN, THRESHOLD_MAX);
}

function normalizeChunkSize(raw: number | null | undefined): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return KNOWLEDGE_BASE_CHUNK_SIZE_DEFAULT;
  }
  return clampNumber(Math.floor(raw), CHUNK_SIZE_MIN, CHUNK_SIZE_MAX);
}

function normalizeChunkOverlap(
  raw: number | null | undefined,
  chunkSize: number,
): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return Math.min(KNOWLEDGE_BASE_CHUNK_OVERLAP_DEFAULT, Math.max(chunkSize - 1, 0));
  }
  const overlap = clampNumber(Math.floor(raw), CHUNK_OVERLAP_MIN, CHUNK_OVERLAP_MAX);
  return Math.min(overlap, Math.max(chunkSize - 1, 0));
}

export type ResolvedKnowledgePreference = {
  topK: number;
  threshold: number;
  chunkSize: number;
  chunkOverlap: number;
};

export function resolveKnowledgePreferenceFromUserRow(user: Pick<
  User,
  | "preferredKnowledgeTopK"
  | "preferredKnowledgeThreshold"
  | "preferredKnowledgeChunkSize"
  | "preferredKnowledgeChunkOverlap"
>): ResolvedKnowledgePreference {
  const chunkSize = normalizeChunkSize(user.preferredKnowledgeChunkSize);
  return {
    topK: normalizeTopK(user.preferredKnowledgeTopK),
    threshold: normalizeThreshold(user.preferredKnowledgeThreshold),
    chunkSize,
    chunkOverlap: normalizeChunkOverlap(user.preferredKnowledgeChunkOverlap, chunkSize),
  };
}

export async function resolveKnowledgePreferenceByUserId(
  userId: string,
): Promise<ResolvedKnowledgePreference> {
  const ds = await getDataSource();
  const userRepo = ds.getRepository(User);
  const row = await userRepo.findOne({ where: { id: userId } });
  if (!row) {
    return {
      topK: KNOWLEDGE_BASE_SEARCH_TOPK_DEFAULT,
      threshold: KNOWLEDGE_BASE_SEARCH_THRESHOLD_DEFAULT,
      chunkSize: KNOWLEDGE_BASE_CHUNK_SIZE_DEFAULT,
      chunkOverlap: Math.min(
        KNOWLEDGE_BASE_CHUNK_OVERLAP_DEFAULT,
        KNOWLEDGE_BASE_CHUNK_SIZE_DEFAULT - 1,
      ),
    };
  }
  return resolveKnowledgePreferenceFromUserRow(row);
}

