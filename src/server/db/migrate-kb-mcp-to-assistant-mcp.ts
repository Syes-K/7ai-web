import { v4 as uuidv4 } from "uuid";
import type { DataSource } from "typeorm";
import { AssistantKnowledgeBase } from "@/server/db/entities/AssistantKnowledgeBase";
import { AssistantMcpBinding } from "@/server/db/entities/AssistantMcpBinding";

/**
 * 将旧版 `knowledge_base_mcp_bindings` 迁到 `assistant_mcp_bindings`（按「曾绑定该 KB 的助手」展开），并删除旧表。
 * 仅在旧表存在时执行；幂等：对已存在的 (assistantId, mcpConfigId) 跳过。
 */
export async function migrateKnowledgeBaseMcpToAssistantMcp(ds: DataSource): Promise<void> {
  const queryRunner = ds.createQueryRunner();
  const hasLegacyTable = await queryRunner.hasTable("knowledge_base_mcp_bindings");
  await queryRunner.release();
  if (!hasLegacyTable) return;

  type OldRow = { userId: string; knowledgeBaseId: string; mcpConfigId: string };
  const oldBindings = (await ds.query(
    `SELECT userId, knowledgeBaseId, mcpConfigId FROM knowledge_base_mcp_bindings`,
  )) as OldRow[];

  const akbRepo = ds.getRepository(AssistantKnowledgeBase);
  const ambRepo = ds.getRepository(AssistantMcpBinding);
  const seen = new Set<string>();

  for (const ob of oldBindings) {
    const assistants = await akbRepo.find({
      where: { userId: ob.userId, knowledgeBaseId: ob.knowledgeBaseId } as any,
    });
    for (const a of assistants) {
      const key = `${a.assistantId}\0${ob.mcpConfigId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const dup = await ambRepo.findOne({
        where: { assistantId: a.assistantId, mcpConfigId: ob.mcpConfigId } as any,
      });
      if (dup) continue;
      await ambRepo.save(
        ambRepo.create({
          id: uuidv4(),
          userId: ob.userId,
          assistantId: a.assistantId,
          mcpConfigId: ob.mcpConfigId,
        }),
      );
    }
  }

  await ds.query(`DROP TABLE IF EXISTS knowledge_base_mcp_bindings`);
}
