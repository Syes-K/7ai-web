import path from "path";

export type DbDriver = "sqlite" | "postgres";

/**
 * 运行时读取环境变量（动态 key，避免 Next.js 在 build 阶段把 undefined 写死进产物）。
 * PM2 的 `pm2 env` 也看不到 .env 里的值，但 next start 启动后此处能读到。
 */
function readRuntimeEnv(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** 根据环境变量解析数据库驱动：有 DATABASE_URL 则用 PostgreSQL，否则本地 SQLite。 */
export function resolveDbDriver(): DbDriver {
  const url = readRuntimeEnv("DATABASE_URL");
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
  return readRuntimeEnv("SQLITE_PATH") ?? path.join(process.cwd(), "data", "app.db");
}

export function resolvePostgresUrl(): string {
  const url = readRuntimeEnv("DATABASE_URL");
  if (!url) {
    throw new Error("DATABASE_URL is required for PostgreSQL");
  }
  return url;
}

function isLocalPostgresHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/**
 * 是否启用 PG SSL。DATABASE_SSL=1 时生效，但本机 127.0.0.1/localhost 默认不启 SSL
 *（ECS 同机 PostgreSQL 通常未配置 TLS，强开会连不上）。
 */
export function isPostgresSslEnabled(): boolean {
  if (readRuntimeEnv("DATABASE_SSL") !== "1") {
    return false;
  }
  const url = readRuntimeEnv("DATABASE_URL");
  if (!url) {
    return false;
  }
  try {
    if (isLocalPostgresHost(new URL(url).hostname)) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

export function isPostgresSslRejectUnauthorized(): boolean {
  return readRuntimeEnv("DATABASE_SSL_REJECT_UNAUTHORIZED") !== "0";
}
