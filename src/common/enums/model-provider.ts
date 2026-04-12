/**
 * 与 `src/server/llm/model.ts` 中 `MODEL_PROVIDER_BASE_URL` 的键一致（大小写敏感）。
 */
export enum ModelProvider {
  ALYUN = "ALYUN",
  GLM = "GLM",
  DEEPSEEK = "DEEPSEEK",
  /** 月之暗面（Moonshot，OpenAI 兼容接口）；键与 `MODEL_PROVIDER_BASE_URL.KIMI` 一致 */
  KIMI = "KIMI",
  /** 硅基流动（SiliconFlow，OpenAI 兼容接口）；键与 `MODEL_PROVIDER_BASE_URL.SILICONFLOW` 一致 */
  SILICONFLOW = "SILICONFLOW",
}
