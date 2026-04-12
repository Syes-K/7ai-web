import "reflect-metadata";
import fs from "fs";
import path from "path";
import { DataSource } from "typeorm";
import { CaptchaChallenge } from "./entities/CaptchaChallenge";
import { Conversation } from "./entities/Conversation";
import { Message } from "./entities/Message";
import { Session } from "./entities/Session";
import { User } from "./entities/User";
import { UserModelConfig } from "./entities/UserModelConfig";

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
    ],
    synchronize: true,
    logging: process.env.TYPEORM_LOGGING === "1",
  });

  await dataSource.initialize();
  return dataSource;
}
