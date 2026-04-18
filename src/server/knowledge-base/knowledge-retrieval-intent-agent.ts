import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatRuntimeModel } from "@/server/chat/llm-runtime";
import type { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";

const KB_INTENT_TAG = "KB_INTENT";

const MAX_DESC_CHARS = 400;

export type KnowledgeRetrievalIntentResult = {
  needSearch: boolean;
  hitReason: string | null;
  /** llm：模型成功返回；failed：调用或解析失败（不检索）；skipped：未调用模型（空问题或无知识库） */
  intentSource: "llm" | "failed" | "skipped";
};

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function extractJsonObject(raw: string): string | null {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const body = fence ? fence[1].trim() : t;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return body.slice(start, end + 1);
}

function parseIntentJson(text: string): { needSearch: boolean; reason?: string } | null {
  const jsonStr = extractJsonObject(text);
  if (!jsonStr) return null;
  try {
    const o = JSON.parse(jsonStr) as { needSearch?: unknown; reason?: unknown };
    if (typeof o.needSearch !== "boolean") return null;
    const reason =
      typeof o.reason === "string" && o.reason.trim() ? o.reason.trim() : undefined;
    return { needSearch: o.needSearch, reason };
  } catch {
    return null;
  }
}

/**
 * 使用对话模型（低温度）判断本轮用户消息是否需要检索已绑定的知识库。
 * 调用失败或返回非合法 JSON 时不做关键词降级，视为不检索（intentSource=failed）。
 */
export async function decideKnowledgeRetrievalIntent(options: {
  userId: string;
  userMessageText: string;
  knowledgeBases: KnowledgeBase[];
}): Promise<KnowledgeRetrievalIntentResult> {
  const { userId, userMessageText, knowledgeBases } = options;
  const text = userMessageText.trim();
  if (!text || knowledgeBases.length === 0) {
    return { needSearch: false, hitReason: null, intentSource: "skipped" };
  }

  const started = Date.now();
  try {
    const model = await getChatRuntimeModel(userId, {
      temperature: 0,
      tags: [KB_INTENT_TAG],
    });

    const kbLines = knowledgeBases.map((kb) => {
      const desc = kb.description ? truncate(kb.description, MAX_DESC_CHARS) : "";
      return `- id=${kb.id}; name=${kb.name}${desc ? `; description=${desc}` : ""}`;
    });

    const system = new SystemMessage(
      [
        "你是知识库检索意图分类器。根据用户当前问题，判断是否需要从已绑定的知识库中检索内容来辅助回答。",
        "需要检索的典型情况：用户问题涉及事实、政策、产品说明、内部文档、操作步骤等，且可能由知识库覆盖。",
        "不需要检索的典型情况：纯寒暄、与知识库无关的闲聊、元问题（如“你是谁”）、或明显与知识库主题无关。",
        "只输出一个 JSON 对象，不要输出任何其他文字或 Markdown。格式：",
        '{"needSearch":true或false,"reason":"简短中文理由"}',
      ].join("\n"),
    );

    const human = new HumanMessage(
      [
        "已绑定的知识库列表：",
        ...kbLines,
        "",
        "用户当前问题：",
        text,
      ].join("\n"),
    );

    const res = await model.invoke([system, human]);
    const content =
      typeof res.content === "string"
        ? res.content
        : Array.isArray(res.content)
          ? res.content.map((c) => (typeof c === "string" ? c : JSON.stringify(c))).join("")
          : String(res.content ?? "");

    const parsed = parseIntentJson(content);
    if (!parsed) {
      throw new Error("intent_json_parse_failed");
    }

    const hitReason = parsed.needSearch
      ? parsed.reason ?? "llm:need_search"
      : parsed.reason ?? null;

    console.info(
      JSON.stringify({
        module: "kb.intent",
        intentSource: "llm",
        userId,
        ms: Date.now() - started,
        needSearch: parsed.needSearch,
        hitReason,
      }),
    );

    return {
      needSearch: parsed.needSearch,
      hitReason,
      intentSource: "llm",
    };
  } catch (e) {
    console.warn(
      JSON.stringify({
        module: "kb.intent",
        intentSource: "failed",
        userId,
        ms: Date.now() - started,
        error: e instanceof Error ? e.message : String(e),
        needSearch: false,
      }),
    );
    return {
      needSearch: false,
      hitReason: null,
      intentSource: "failed",
    };
  }
}
