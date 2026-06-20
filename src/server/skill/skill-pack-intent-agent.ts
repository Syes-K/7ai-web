import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { SKILL_PACK_INTENT_TAG } from "@/common/constants";
import { getChatRuntimeModel } from "@/server/chat/llm-runtime";
import { getSkillPackIntentTimeoutMs } from "@/server/skill/skill-script-env";

const MAX_DESC_CHARS = 400;

export type SkillPackIntentResult = {
  selectedIds: string[];
  reasons: Record<string, string>;
  intentSource: "intent_agent" | "failed_safe" | "skipped";
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

function parseIntentJson(
  text: string,
  allowedIds: Set<string>,
): { selectedIds: string[]; reasons: Record<string, string> } | null {
  const jsonStr = extractJsonObject(text);
  if (!jsonStr) return null;
  try {
    const o = JSON.parse(jsonStr) as { selectedIds?: unknown; reasons?: unknown };
    if (!Array.isArray(o.selectedIds)) return null;
    const selectedIds = o.selectedIds
      .filter((id): id is string => typeof id === "string" && allowedIds.has(id))
      .map((id) => id.trim())
      .filter(Boolean);
    const reasons: Record<string, string> = {};
    if (o.reasons && typeof o.reasons === "object" && o.reasons !== null) {
      for (const [k, v] of Object.entries(o.reasons as Record<string, unknown>)) {
        if (typeof v === "string" && v.trim() && allowedIds.has(k)) {
          reasons[k] = v.trim();
        }
      }
    }
    return { selectedIds: [...new Set(selectedIds)], reasons };
  } catch {
    return null;
  }
}

/**
 * 使用对话模型（低温度）判断本轮应加载哪些非 alwaysLoad 的技能包。
 * 超时、非法 JSON 或模型异常时不做关键词降级，返回 failed_safe。
 */
export async function decideSkillPackIntent(options: {
  userId: string;
  userMessageText: string;
  packs: Array<{ id: string; name: string; description: string | null }>;
}): Promise<SkillPackIntentResult> {
  const { userId, userMessageText, packs } = options;
  const text = userMessageText.trim();
  if (!text || packs.length === 0) {
    return { selectedIds: [], reasons: {}, intentSource: "skipped" };
  }

  const allowedIds = new Set(packs.map((p) => p.id));
  const started = Date.now();
  const timeoutMs = getSkillPackIntentTimeoutMs();

  try {
    const model = await getChatRuntimeModel(userId, {
      temperature: 0,
      tags: [SKILL_PACK_INTENT_TAG],
    });

    const packLines = packs.map((p) => {
      const desc = p.description ? truncate(p.description, MAX_DESC_CHARS) : "";
      return `- id=${p.id}; name=${p.name}${desc ? `; description=${desc}` : ""}`;
    });

    const system = new SystemMessage(
      [
        "你是技能包选用分类器。根据用户当前问题，从已挂载的技能包列表中选出本轮回答需要加载的包。",
        "需要加载的典型情况：用户问题与某技能包的 name/description 主题明显相关，或用户明确要求使用该技能包。",
        "不需要加载的典型情况：纯寒暄、与所有技能包无关的闲聊、或明显不匹配任何包描述。",
        "只输出一个 JSON 对象，不要输出任何其他文字或 Markdown。格式：",
        '{"selectedIds":["uuid-1"],"reasons":{"uuid-2":"简短中文理由"}}',
        "selectedIds 须为输入列表中的 id 子集；reasons 可选，键为未选用包的 id。",
      ].join("\n"),
    );

    const human = new HumanMessage(
      ["已挂载的技能包列表（不含 alwaysLoad 包）：", ...packLines, "", "用户当前问题：", text].join(
        "\n",
      ),
    );

    const invokePromise = model.invoke([system, human]);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });
    const res = await Promise.race([invokePromise, timeoutPromise]);
    const content =
      typeof res.content === "string"
        ? res.content
        : Array.isArray(res.content)
          ? res.content.map((c) => (typeof c === "string" ? c : JSON.stringify(c))).join("")
          : String(res.content ?? "");

    const parsed = parseIntentJson(content, allowedIds);
    if (!parsed) {
      throw new Error("intent_json_parse_failed");
    }

    console.info(
      JSON.stringify({
        module: "skill.intent",
        intentSource: "intent_agent",
        userId,
        ms: Date.now() - started,
        selectedCount: parsed.selectedIds.length,
        skippedCount: packs.length - parsed.selectedIds.length,
      }),
    );

    return {
      selectedIds: parsed.selectedIds,
      reasons: parsed.reasons,
      intentSource: "intent_agent",
    };
  } catch (e) {
    console.warn(
      JSON.stringify({
        module: "skill.intent",
        intentSource: "failed_safe",
        userId,
        ms: Date.now() - started,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return { selectedIds: [], reasons: {}, intentSource: "failed_safe" };
  }
}
