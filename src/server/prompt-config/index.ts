/**
 * 提示词文件配置：合并读取与落盘。
 * 对话/其他模块需与 GET 管理端 API 使用同一套合并结果时，应通过本模块读取。
 */
export { getAuthoritativePromptKeys, mergePromptConfigFromFile, mergedToApiItems } from "./merge";
export { getPromptConfigPath, readPromptConfigFile, writePromptConfigAtomic } from "./io";

import { mergePromptConfigFromFile } from "./merge";
import { readPromptConfigFile } from "./io";

/** 当前磁盘上的合并结果（供服务端业务与 Handler 复用）。 */
export async function loadMergedPromptConfig() {
  const { raw } = await readPromptConfigFile();
  return mergePromptConfigFromFile(raw);
}
