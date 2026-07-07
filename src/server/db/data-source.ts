import "reflect-metadata";
import fs from "fs";
import path from "path";
import { DataSource, type DataSourceOptions } from "typeorm";
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
import { SkillScriptRun } from "@/server/db/entities/SkillScriptRun";
import {
  isPostgresSslEnabled,
  isPostgresSslRejectUnauthorized,
  isSqliteDriver,
  resolveDbDriver,
  resolvePostgresUrl,
  resolveSqlitePath,
} from "@/server/db/db-config";
import { logger } from "@/server/logs";

const ENTITIES = [
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
  SkillScriptRun,
];

let dataSource: DataSource | null = null;
/** 并发请求共享同一次初始化，避免重复 create/initialize 导致 driver.prepare 报错。 */
let initPromise: Promise<DataSource> | null = null;

/** 日志用连接摘要（不含密码）。 */
function describeDataSourceForLog(options: DataSourceOptions): Record<string, unknown> {
  if (options.type === "postgres") {
    const url = typeof options.url === "string" ? options.url : "";
    try {
      const parsed = new URL(url);
      return {
        driver: "postgres",
        host: parsed.hostname,
        port: parsed.port || "5432",
        database: parsed.pathname.replace(/^\//, ""),
        user: parsed.username || undefined,
        ssl: options.ssl != null,
      };
    } catch {
      return { driver: "postgres", urlParse: "failed" };
    }
  }

  return {
    driver: "better-sqlite3",
    database: "database" in options ? options.database : undefined,
  };
}

function buildDataSourceOptions(): DataSourceOptions {
  const logging = process.env.TYPEORM_LOGGING === "1";
  const driver = resolveDbDriver();

  let options: DataSourceOptions;

  if (driver === "postgres") {
    const ssl = isPostgresSslEnabled()
      ? { rejectUnauthorized: isPostgresSslRejectUnauthorized() }
      : undefined;

    options = {
      type: "postgres",
      url: resolvePostgresUrl(),
      ssl,
      entities: ENTITIES,
      synchronize: true,
      logging,
    };
  } else {
    const dbFile = resolveSqlitePath();
    options = {
      type: "better-sqlite3",
      database: dbFile,
      entities: ENTITIES,
      synchronize: true,
      logging,
    };
  }

  logger.info("db.datasource.options", describeDataSourceForLog(options));
  return options;
}

async function initializeDataSource(): Promise<DataSource> {
  if (isSqliteDriver()) {
    const dbFile = resolveSqlitePath();
    const dir = path.dirname(dbFile);
    fs.mkdirSync(dir, { recursive: true });

    const { migrateSystemSkillPacks } = await import(
      "@/server/db/migrations/0.1.21-system-skill-packs"
    );
    await migrateSystemSkillPacks(dbFile);
  }

  const ds = new DataSource(buildDataSourceOptions());
  await ds.initialize();

  const { migrateKnowledgeBaseMcpToAssistantMcp } = await import(
    "@/server/db/migrate-kb-mcp-to-assistant-mcp"
  );
  await migrateKnowledgeBaseMcpToAssistantMcp(ds);
  const { migrateSkillContentToPackFiles } = await import(
    "@/server/db/migrate-skill-content-to-pack-files"
  );
  await migrateSkillContentToPackFiles(ds);
  const { purgeOldSkillScriptRuns } = await import("@/server/db/purge-skill-script-runs");
  await purgeOldSkillScriptRuns(ds);
  return ds;
}

/**
 * TypeORM 单例：本地默认 SQLite；生产设置 DATABASE_URL 后使用 PostgreSQL。
 */
export async function getDataSource(): Promise<DataSource> {
  if (dataSource?.isInitialized) {
    return dataSource;
  }
  if (!initPromise) {
    initPromise = initializeDataSource()
      .then((ds) => {
        dataSource = ds;
        return ds;
      })
      .catch((err) => {
        initPromise = null;
        dataSource = null;
        throw err;
      });
  }
  return initPromise;
}
