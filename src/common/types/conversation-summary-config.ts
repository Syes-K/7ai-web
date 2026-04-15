export type ConversationSummaryConfig = {
  enabled: boolean;
  /** 摘要生成提示词中的最大字数参数。 */
  maxChars: number;
  /** 摘要触发模式：按 token 估算或按消息条数。 */
  mode: "tokens" | "messages";
  /** token 模式：总 token 超过该阈值触发摘要。 */
  summaryTriggerTokens: number;
  /** token 模式：保留最近原文 token 预算。 */
  summaryKeepTokens: number;
  /** messages 模式：消息条数超过该阈值触发摘要。 */
  summaryTriggerMessages: number;
  /** messages 模式：保留最近原文消息条数。 */
  summaryKeepMessages: number;
  /** 无论何种模式，摘要后至少保留的最近原文消息条数。 */
  summaryMinRecentMessages: number;
};

export type ConversationSummaryConfigFileState = "ok" | "missing" | "invalid_json";
