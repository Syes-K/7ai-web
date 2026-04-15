import type { PromptParamDef } from "@/common/types/prompt-param-def";

type PromptTemplateEntry = {
  name: string;
  desc: string;
  params?: PromptParamDef[];
  value: string;
};

export const DEFAULT_PROMPT_CONFIG: Record<string, PromptTemplateEntry> = {
    contextSummarySystem: {
        name: "摘要生成",
        desc: `用于生成会话滚动摘要时的后台系统提示词。该提示仅在后台自动刷新会话摘要时使用，非用户与模型直接对话时调用。`,
        params: [
            {
                name: "maxChars",
                type: "number",
                description: "摘要的总字符数限制（服务端注入）",
            },
            {
                name: "messages",
                type: "string",
                description:
                    "待摘要的多轮对话正文；由 LangChain summarizationMiddleware 在运行时注入，勿删占位符",
            },
        ],
        value: `你是对话摘要助手。用户将提供当前会话的全部多轮对话（与后续对话请求里单独传入的「最近若干条原文」在内容上会有重叠，属预期行为）。请用简洁中文压缩为一段连续摘要，保留：关键事实、专有名词、用户约束与已达成共识的决策。不要编造。不要使用 markdown 标题。

【长度】输出正文总长度必须不超过 {maxChars} 个字符（与常见语言中字符串的字符长度计数一致，含标点与空格）。若难以在限制内覆盖全部细节，请优先保留最关键信息，并自然收尾，避免像在句子中途被截断。不要输出字数统计或任何与摘要正文无关的说明。

【待摘要的多轮对话】
{messages}`,
    },
    summarySystemPrefix: {
        name: "摘要注入前缀",
        desc: `会话内容超出「最近N条/tokens」窗口后，服务端会在传给模型的消息最前插入一条 system 摘要消息，帮助模型补充对更早上下文的理解，从而减少因上下文裁剪导致的信息缺失。此摘要只作为上下文提示使用，用户界面的消息列表仍可查看所有原文。`,
        value: `以下是本对话更早内容的摘要，供你理解上下文（用户界面上的消息列表中仍有完整原文可供其查阅）：`
    }
};