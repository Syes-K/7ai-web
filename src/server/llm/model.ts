import { ChatOpenAI } from "@langchain/openai";

export const MODEL_PROVIDER_BASE_URL: Record<string, string> = {
    // 阿里云 百炼
    ALYUN: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    // 智谱 AI
    GLM: 'https://open.bigmodel.cn/api/paas/v4',
    // 深度求索
    DEEPSEEK: 'https://api.deepseek.com/v1',
}

/**
 * 获取模型实例
 * @param model 模型名称
 * @param provider 模型提供商
 * @param temperature 
 * @returns 模型实例 ChatOpenAI
 */
export function getModel(model: string, provider: string, temperature: number = 0) {
    const baseUrl = MODEL_PROVIDER_BASE_URL[provider];
    if (!baseUrl) {
        throw new Error(`Model provider ${provider} not found`);
    }
    return new ChatOpenAI({
        model,
        temperature,
        apiKey: process.env.OPENAI_API_KEY,
        configuration: {
            baseURL: baseUrl,
        },
    });
}