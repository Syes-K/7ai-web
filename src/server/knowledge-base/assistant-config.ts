import type { DataSource } from "typeorm";
import { AssistantScope } from "@/common/enums";
import { Assistant } from "@/server/db/entities/Assistant";
import { AssistantKnowledgeBase } from "@/server/db/entities/AssistantKnowledgeBase";

export async function getAssistantConfiguredKnowledgeBaseIds(
  ds: DataSource,
  assistantId: string,
  userId: string,
): Promise<string[]> {
  const assistant = await ds.getRepository(Assistant).findOne({ where: { id: assistantId } });
  if (!assistant) return [];
  if (assistant.scope !== AssistantScope.Personal) return [];
  if (assistant.userId !== userId) return [];

  const rels = await ds.getRepository(AssistantKnowledgeBase).find({
    where: { assistantId, userId } as any,
  });
  return rels.map((r) => r.knowledgeBaseId);
}

