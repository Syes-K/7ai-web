import { OpenAIEmbeddings } from "@langchain/openai";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { MODEL_PROVIDER_BASE_URL } from "@/server/llm/model";
import { decryptApiKey } from "@/server/model-config/api-key-crypto";
import { findModelConfigUsableByUser } from "@/server/model-config/find-usable-config";

export type KnowledgeBaseEmbeddingConfig = {
  provider: string;
  model: string;
  apiKey: string;
};

const PROVIDER_MODEL_EXAMPLES: Record<string, string> = {
  // 下面是常见示例，实际以你在对应平台可用模型为准
  SILICONFLOW: "BAAI/bge-m3",
  ALYUN: "text-embedding-v4",
  GLM: "embedding-3",
};

export function getKnowledgeBaseEmbeddings(cfg: KnowledgeBaseEmbeddingConfig) {
  const baseURL = MODEL_PROVIDER_BASE_URL[cfg.provider];
  if (!baseURL) {
    throw new Error(`Embedding provider ${cfg.provider} not found`);
  }
  if (!cfg.apiKey) {
    throw new Error("未配置向量化 API Key");
  }
  return new OpenAIEmbeddings({
    model: cfg.model,
    apiKey: cfg.apiKey,
    configuration: { baseURL },
  });
}

export async function resolveKnowledgeBaseEmbeddingConfig(userId: string): Promise<KnowledgeBaseEmbeddingConfig> {
  // 优先使用用户「账号与偏好」中的向量模型配置
  try {
    const ds = await getDataSource();
    const user = await ds.getRepository(User).findOne({ where: { id: userId } });
    const prefVectorId = user?.preferredVectorModelConfigId ?? null;
    if (prefVectorId) {
      const cfg = await findModelConfigUsableByUser(ds, prefVectorId, userId);
      if (cfg) {
        const plainKey = decryptApiKey(cfg.apiKeyCipher);
        return {
          provider: cfg.provider,
          model: cfg.modelName,
          apiKey: plainKey,
        };
      }
    }
  } catch (e) {
    // 偏好解析失败时回退环境变量，不阻塞主流程
    console.warn(
      JSON.stringify({
        module: "kb.embedding",
        action: "resolve_from_user_preference_failed",
        userId,
        message: e instanceof Error ? e.message : String(e),
      }),
    );
  }

  // 回退环境变量
  const provider =
    (process.env.KB_EMBEDDING_PROVIDER ?? process.env.CHAT_LLM_PROVIDER ?? "").trim();
  const model = (process.env.KB_EMBEDDING_MODEL ?? "").trim();
  const apiKey = (process.env.KB_EMBEDDING_API_KEY ?? process.env.CHAT_LLM_API_KEY ?? "").trim();
  if (!provider) {
    throw new Error("未配置 KB_EMBEDDING_PROVIDER（或回退 CHAT_LLM_PROVIDER）");
  }
  if (!model) {
    const example = PROVIDER_MODEL_EXAMPLES[provider];
    throw new Error(
      example
        ? `未配置 KB_EMBEDDING_MODEL；当前 provider=${provider}，可参考模型名：${example}`
        : `未配置 KB_EMBEDDING_MODEL；当前 provider=${provider}，请填写该 provider 可用的 embedding 模型名`,
    );
  }
  return { provider, model, apiKey };
}

export function embeddingModelId(cfg: KnowledgeBaseEmbeddingConfig): string {
  return `${cfg.provider}:${cfg.model}`;
}

