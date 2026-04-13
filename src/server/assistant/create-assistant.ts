import { v4 as uuidv4 } from "uuid";
import { AssistantScope } from "@/common/enums";
import { Assistant } from "@/server/db/entities/Assistant";

export function createAssistantRow(params: {
  scope: AssistantScope;
  userId: string | null;
  name: string;
  prompt: string;
  icon: string | null;
  openingMessage: string | null;
  tags: string[];
}): Assistant {
  const row = new Assistant();
  row.id = uuidv4();
  row.scope = params.scope;
  row.userId = params.userId;
  row.name = params.name;
  row.prompt = params.prompt;
  row.icon = params.icon;
  row.openingMessage = params.openingMessage;
  row.tags = params.tags.length > 0 ? params.tags : null;
  return row;
}
