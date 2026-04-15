import type { ConversationSummaryConfig } from "@/common/types";
import { mergePromptConfigFromFile } from "@/server/prompt-config/merge";
import { readPromptConfigFile } from "@/server/prompt-config/io";
import { mergeConversationSummaryConfigFromFile } from "@/server/conversation-summary-config/merge";
import { readConversationSummaryConfigFile } from "@/server/conversation-summary-config/io";

export async function getConversationSummaryConfig(): Promise<ConversationSummaryConfig> {
  const raw = (await readConversationSummaryConfigFile()).raw;
  return mergeConversationSummaryConfigFromFile(raw).config;
}

export async function getSummaryPromptTemplates(): Promise<{
  contextSummarySystem: string;
  summarySystemPrefix: string;
}> {
  const raw = (await readPromptConfigFile()).raw;
  const { merged } = mergePromptConfigFromFile(raw);
  return {
    contextSummarySystem: merged.contextSummarySystem.value,
    summarySystemPrefix: merged.summarySystemPrefix.value,
  };
}
