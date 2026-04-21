import type { DataSource } from "typeorm";
import { In } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { AssistantMcpBinding } from "@/server/db/entities/AssistantMcpBinding";
import { UserMcpConfig } from "@/server/db/entities/UserMcpConfig";

export async function listMcpConfigIdsByAssistantIds(
  ds: DataSource,
  userId: string,
  assistantIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (assistantIds.length === 0) return map;
  const repo = ds.getRepository(AssistantMcpBinding);
  const rows = await repo.find({
    where: { userId, assistantId: In(assistantIds) } as any,
    order: { mcpConfigId: "ASC" },
  });
  for (const aid of assistantIds) {
    map.set(aid, []);
  }
  for (const r of rows) {
    const cur = map.get(r.assistantId);
    if (cur) cur.push(r.mcpConfigId);
  }
  return map;
}

export async function countAssistantsReferencingMcp(ds: DataSource, userId: string, mcpConfigId: string): Promise<number> {
  return ds.getRepository(AssistantMcpBinding).count({ where: { userId, mcpConfigId } as any });
}

export type ReplaceAssistantMcpBindingsResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_MCP_CONFIG_IDS" };

export async function replaceAssistantMcpBindings(
  ds: DataSource,
  userId: string,
  assistantId: string,
  mcpConfigIds: string[],
): Promise<ReplaceAssistantMcpBindingsResult> {
  const unique = [...new Set(mcpConfigIds)];
  if (unique.length > 0) {
    const n = await ds.getRepository(UserMcpConfig).count({
      where: { userId, id: In(unique) } as any,
    });
    if (n !== unique.length) {
      return { ok: false, reason: "INVALID_MCP_CONFIG_IDS" };
    }
  }

  await ds.transaction(async (em) => {
    await em.delete(AssistantMcpBinding, { assistantId, userId } as any);
    for (const mcpConfigId of unique) {
      await em.insert(AssistantMcpBinding, {
        id: uuidv4(),
        userId,
        assistantId,
        mcpConfigId,
      });
    }
  });
  return { ok: true };
}
