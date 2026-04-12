import { ChatOpenAI } from "@langchain/openai";

export const MODEL_PROVIDER_BASE_URL: Record<string, string> = {
    // 阿里云 百炼
    ALYUN: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    // 智谱 AI
    GLM: 'https://open.bigmodel.cn/api/paas/v4',
    // 深度求索
    DEEPSEEK: 'https://api.deepseek.com/v1',
    // 月之暗面
    KIMI: 'https://api.moonshot.cn/v1',
    // 硅基流动 SiliconFlow
    SILICONFLOW: 'https://api.siliconflow.cn/v1',
}

export type GetModelOptions = {
    /** 未传时使用 `CHAT_LLM_MODEL`，再回退到内置默认模型名 */
    model?: string;
    /** 未传时使用 `CHAT_LLM_PROVIDER`，再回退到内置默认提供商键 */
    provider?: string;
    /** 未传时默认为 `0` */
    temperature?: number;
    /** 未传时使用 `CHAT_LLM_API_KEY`（如用户登记的模型密钥可显式传入） */
    apiKey?: string;
};

/**
 * 获取模型实例。
 * `model` / `provider` / `apiKey` 仅在调用方未传入时，依次采用环境变量与内置默认值。
 */
export function getModel(options: GetModelOptions = {}) {
    const model =
        options.model ??
        process.env.CHAT_LLM_MODEL as string;
    const provider =
        options.provider ??
        process.env.CHAT_LLM_PROVIDER as string;
    const temperature = options.temperature ?? 0;
    const apiKey = options.apiKey ?? process.env.CHAT_LLM_API_KEY;

    const baseUrl = MODEL_PROVIDER_BASE_URL[provider];
    if (!baseUrl) {
        throw new Error(`Model provider ${provider} not found`);
    }
    if (!apiKey) {
        throw new Error("未配置 API Key：请在环境变量 CHAT_LLM_API_KEY 或控制台模型管理中设置");
    }
    return new ChatOpenAI({
        model,
        temperature,
        apiKey,
        configuration: {
            baseURL: baseUrl,
        },
    });
}