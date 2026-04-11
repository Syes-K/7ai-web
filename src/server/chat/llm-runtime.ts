import {
  CHAT_LLM_DEFAULT_MODEL,
  CHAT_LLM_DEFAULT_PROVIDER,
} from "@/common/constants";
import { getModel } from "@/server/llm/model";

/**
 * 对话路由使用的 Chat 模型实例（环境变量可覆盖默认提供商与模型名）。
 */
export function getChatRuntimeModel() {
  const provider = process.env.CHAT_LLM_PROVIDER ?? CHAT_LLM_DEFAULT_PROVIDER;
  const modelName = process.env.CHAT_LLM_MODEL ?? CHAT_LLM_DEFAULT_MODEL;
  return getModel(modelName, provider, 0.7);
}
