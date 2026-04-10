import { DEFAULT_PROMPT_CONFIG } from "@/common/constants/defautPromptConfig";

/** 与 `DEFAULT_PROMPT_CONFIG` 同步的 key，禁止手写漂移列表。 */
export type PromptConfigKey = keyof typeof DEFAULT_PROMPT_CONFIG;

/** 单项提示词配置（文件片段与 API 项共用形状）。 */
export type PromptConfigFragment = {
  name: string;
  desc: string;
  value: string;
};

/** GET 响应中的单行（含配置 key）。 */
export type PromptConfigApiItem = PromptConfigFragment & { key: PromptConfigKey };

export type PromptConfigFileState = "ok" | "invalid_json";
