import type { ColumnOptions } from "typeorm";
import { resolveDbDriver } from "@/server/db/db-config";

type ColumnExtra = Omit<ColumnOptions, "type">;

/** SQLite 用 datetime，PostgreSQL 用 timestamp。 */
export function timestampColumn(extra?: ColumnExtra): ColumnOptions {
  const type: ColumnOptions["type"] =
    resolveDbDriver() === "postgres" ? "timestamp" : "datetime";
  return { type, ...extra };
}

/** SQLite 用 real，PostgreSQL 用 double precision。 */
export function floatColumn(extra?: ColumnExtra): ColumnOptions {
  const type: ColumnOptions["type"] =
    resolveDbDriver() === "postgres" ? "double precision" : "real";
  return { type, ...extra };
}
