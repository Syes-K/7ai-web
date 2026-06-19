import "reflect-metadata";
import fs from "fs";
import path from "path";
import { DataSource } from "typeorm";
import { CaptchaChallenge } from "./entities/CaptchaChallenge";
import { Conversation } from "./entities/Conversation";
import { Message } from "./entities/Message";
import { Session } from "./entities/Session";
import { User } from "./entities/User";
import { Assistant } from "./entities/Assistant";
import { UserModelConfig } from "./entities/UserModelConfig";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { KnowledgeBaseVectorChunk } from "@/server/db/entities/KnowledgeBaseVectorChunk";
import { AssistantKnowledgeBase } from "@/server/db/entities/AssistantKnowledgeBase";
import { ChatTurn } from "@/server/db/entities/ChatTurn";
import { UserMcpConfig } from "@/server/db/entities/UserMcpConfig";
import { AssistantMcpBinding } from "@/server/db/entities/AssistantMcpBinding";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { AssistantSkillBinding } from "@/server/db/entities/AssistantSkillBinding";
import { SkillPackFile } from "@/server/db/entities/SkillPackFile";

let dataSource: DataSource | null = null;

/**
 * SQLite + TypeORM 单例；供 Route Handler 与 Server Components 复用。
 */
export async function getDataSource(): Promise<DataSource> {
  if (dataSource?.isInitialized) {
    return dataSource;
  }

  const dbFile =
    process.env.SQLITE_PATH ?? path.join(process.cwd(), "data", "app.db");
  const dir = path.dirname(dbFile);
  fs.mkdirSync(dir, { recursive: true });

  dataSource = new DataSource({
    type: "better-sqlite3",
    database: dbFile,
    entities: [
      User,
      Session,
      CaptchaChallenge,
      Conversation,
      Message,
      UserModelConfig,
      Assistant,
      KnowledgeBase,
      KnowledgeBaseVectorChunk,
      AssistantKnowledgeBase,
      ChatTurn,
      UserMcpConfig,
      AssistantMcpBinding,
      UserSkillConfig,
      AssistantSkillBinding,
      SkillPackFile,
    ],
    synchronize: true,
    logging: process.env.TYPEORM_LOGGING === "1",
  });

  await dataSource.initialize();
  const { migrateKnowledgeBaseMcpToAssistantMcp } = await import(
    "@/server/db/migrate-kb-mcp-to-assistant-mcp"
  );
  await migrateKnowledgeBaseMcpToAssistantMcp(dataSource);
  const { migrateSkillContentToPackFiles } = await import(
    "@/server/db/migrate-skill-content-to-pack-files"
  );
  await migrateSkillContentToPackFiles(dataSource);
  return dataSource;
}
