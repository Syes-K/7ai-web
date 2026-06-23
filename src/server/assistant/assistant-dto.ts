import type { AssistantListItem } from "@/common/types";
import type { Assistant } from "@/server/db/entities/Assistant";
import { normalizeStoredAssistantTags } from "@/server/assistant/parse-assistant-tags";

export function assistantToListItem(row: Assistant): AssistantListItem {
  return {
    id: row.id,
    scope: row.scope,
    name: row.name,
    prompt: row.prompt ?? "",
    icon: row.icon,
    openingMessage: row.openingMessage,
    tags: normalizeStoredAssistantTags(row.tags),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
