import path from "path";

export type DbDriver = "sqlite" | "postgres";

/** 根据环境变量解析数据库驱动：有 DATABASE_URL 则用 PostgreSQL，否则本地 SQLite。 */
export function resolveDbDriver(): DbDriver {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return "sqlite";
  }
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgres";
  }
  throw new Error(
    `Unsupported DATABASE_URL scheme (expected postgres:// or postgresql://): ${url.split(":")[0]}:`,
  );
}

export function isSqliteDriver(): boolean {
  return resolveDbDriver() === "sqlite";
}

export function resolveSqlitePath(): string {
  return process.env.SQLITE_PATH ?? path.join(process.cwd(), "data", "app.db");
}

export function resolvePostgresUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required for PostgreSQL");
  }
  return url;
}
