/**
 * LangChain 回调：摘要落库、模型调用日志等。
 */
import { createHash } from "node:crypto";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { BaseMessage } from "@langchain/core/messages";
import type { Serialized } from "@langchain/core/load/serializable";
import type { LLMResult } from "@langchain/core/outputs";
import { LLM_SUMMARIZATION_TAG } from "@/common/constants";
import { logger } from "@/server/logs";

function hasSummaryTag(tags?: string[]): boolean {
  return Array.isArray(tags) && tags.includes(LLM_SUMMARIZATION_TAG);
}

/** 将单条 BaseMessage 内容转为可 hash 的纯文本（与 LangChain getBufferString 语义接近，仅用于摘要调试元信息） */
function baseMessageContentPlain(msg: BaseMessage): string {
  const c = msg.content;
  if (typeof c === "string") {
    return c;
  }
  if (Array.isArray(c)) {
    return c
      .map((block) => {
        if (typeof block === "object" && block && "text" in block) {
          return String((block as { text: string }).text);
        }
        return "";
      })
      .join("");
  }
  return String(c ?? "");
}

/** 取 handleChatModelStart 第一组 messages 的拼接文本（摘要子调用多为单条 Human 含整段 prompt） */
function firstChatBatchPlainText(messagesParam: unknown): string {
  if (!Array.isArray(messagesParam) || messagesParam.length === 0) {
    return "";
  }
  const batch = messagesParam[0];
  if (!Array.isArray(batch)) {
    return "";
  }
  const parts: string[] = [];
  for (const raw of batch) {
    if (!BaseMessage.isInstance(raw)) {
      continue;
    }
    parts.push(baseMessageContentPlain(raw));
  }
  return parts.join("\n---\n");
}

/** 在摘要模型子调用开始时收到通知（依赖 metadata.lc_source === "summarization"） */
export class SummarizationLlmCallbackHandler extends BaseCallbackHandler {
  readonly name = "summarization_llm_listener";
  /** 已处理过的子调用 ID 集合，避免重复处理 */
  private readonly seenRunIds = new Set<string>();

  constructor(
    private readonly options?: {
      onSummary?: (summary: string) => Promise<void> | void;
    },
  ) {
    super();
  }

  /** 提取摘要文本 */
  private extractText(output: unknown): string {
    const o = output as {
      generations?: Array<Array<{ text?: string; message?: { content?: unknown } }>>;
    };
    const first = o?.generations?.[0]?.[0];
    if (!first) return "";
    if (typeof first.text === "string" && first.text.trim()) {
      return first.text.trim();
    }
    const content = first.message?.content;
    if (typeof content === "string") return content.trim();
    if (Array.isArray(content)) {
      return content
        .map((p) =>
          typeof p === "object" && p && "text" in p ? String((p as { text: string }).text) : "",
        )
        .join("")
        .trim();
    }
    return "";
  }

  /** 处理摘要模型子调用输出 */
  private async handleSummaryOutput(
    output: unknown,
    runId: string,
    tags?: string[],
  ): Promise<void> {
    if (!hasSummaryTag(tags)) {
      return;
    }
    if (this.seenRunIds.has(runId)) {
      return;
    }
    this.seenRunIds.add(runId);
    const summary = this.extractText(output);
    if (!summary) {
      return;
    }
    logger.info("llm.summary", {
      runId,
      summary,
    });
    await this.options?.onSummary?.(summary);
  }

  /**
   * 摘要子调用开始时记录 prompt 长度与 SHA256 前缀，便于确认每次传入摘要模型的内容是否变化（不打全文）。
   */
  handleChatModelStart(
    _llm: Serialized,
    messages: unknown,
    runId: string,
    parentRunId?: string,
    _extraParams?: Record<string, unknown>,
    tags?: string[],
    _metadata?: Record<string, unknown>,
    _runName?: string,
  ): void {
    if (!hasSummaryTag(tags)) {
      return;
    }
    const plain = firstChatBatchPlainText(messages);
    const promptCharLength = plain.length;
    const promptSha256Prefix = createHash("sha256").update(plain, "utf8").digest("hex").slice(0, 16);
    logger.info("llm.summarization.prompt_meta", {
      runId,
      parentRunId: parentRunId ?? null,
      promptCharLength,
      promptSha256Prefix,
    });
  }

  async handleLLMStart(llm: Serialized, prompts: string[], runId: string, parentRunId?: string, _extraParams?: Record<string, unknown>, tags?: string[], _metadata?: Record<string, unknown>, _runName?: string) {
    logger.info("llm.start", {
      runId,
      parentRunId: parentRunId ?? null,
      tags: tags ?? [],
      prompts: prompts ?? [],
      modelId: pickSerializedId(llm),
      isSummarization: hasSummaryTag(tags),
    });
  }

  async handleLLMEnd(
    output: LLMResult,
    runId: string,
    _parentRunId?: string,
    tags?: string[],
    _extraParams?: Record<string, unknown>,
  ): Promise<void> {
    await this.handleSummaryOutput(output, runId, tags);
  }
}

/** 在 Chat/LLM 调用开始、结束（及错误）时写模型日志（不记录摘要中间件的子调用）。 */
export class LoggerCallbackHandler extends BaseCallbackHandler {
  readonly name = "logger_llm_handler";
  private readonly endedRunIds = new Set<string>();

  handleChatModelStart(
    llm: Serialized,
    _messages: unknown,
    runId: string,
    parentRunId?: string,
    _extraParams?: Record<string, unknown>,
    tags?: string[],
    _metadata?: Record<string, unknown>,
    runName?: string,
  ): void {
    // 不记录摘要中间件的子调用
    if (hasSummaryTag(tags)) {
      return;
    }
    logger.info("llm.chat.start", {
      runId,
      parentRunId: parentRunId ?? null,
      runName: runName ?? null,
      tags: tags ?? [],
      messages: _messages,
      modelId: pickSerializedId(llm),
    });
  }

  handleLLMEnd(
    output: LLMResult,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    _extraParams?: Record<string, unknown>,
  ): void {
    // 不记录摘要中间件的子调用
    if (hasSummaryTag(tags)) {
      return;
    }
    if (this.endedRunIds.has(runId)) {
      return;
    }
    this.endedRunIds.add(runId);
    const gens = output?.generations?.[0]?.[0];
    const tokenUsage =
      output?.llmOutput && typeof output.llmOutput === "object" && output.llmOutput !== null
        ? (output.llmOutput as { tokenUsage?: unknown }).tokenUsage
        : undefined;
    logger.info("llm.end", {
      runId,
      parentRunId: parentRunId ?? null,
      tags: tags ?? [],
      generationCount: output?.generations?.length ?? 0,
      hasText: typeof gens?.text === "string" && gens.text.length > 0,
      tokenUsage: tokenUsage ?? null,
    });
  }

  handleLLMError(
    err: Error,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    _extraParams?: Record<string, unknown>,
  ): void {
    /** 不记录摘要中间件的子调用 */
    if (hasSummaryTag(tags)) {
      return;
    }
    logger.error("llm.error", {
      runId,
      parentRunId: parentRunId ?? null,
      tags: tags ?? [],
      error: err?.message ?? String(err),
      stack: err?.stack ?? null,
    });
  }
}

/** 提取模型 ID */
function pickSerializedId(llm: Serialized): string | null {
  if (llm && typeof llm === "object" && "id" in llm && Array.isArray((llm as { id?: unknown }).id)) {
    return (llm as { id: string[] }).id.join(".");
  }
  return null;
}
