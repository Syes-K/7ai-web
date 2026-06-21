import fs from "fs";
import Database from "better-sqlite3";
import { SKILL_CONFIG_NAME_MAX_LENGTH } from "@/common/constants";

type PackRow = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  content: string | null;
  enabled: number;
  alwaysLoad: number;
  createdAt: string;
  updatedAt: string;
};

type FileRow = {
  id: string;
  packId: string;
  userId: string;
  path: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type MigrationReportEntry = {
  originalName: string;
  packId: string;
  oldUserId: string;
  newName: string;
};

function tableHasColumn(db: Database.Database, table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

function uniqueMigratedName(baseName: string, userId: string, used: Set<string>): string {
  const suffix = ` (migrated-${userId.slice(0, 8)})`;
  let candidate = `${baseName}${suffix}`.slice(0, SKILL_CONFIG_NAME_MAX_LENGTH);
  let n = 2;
  while (used.has(candidate)) {
    const extra = `-${n}`;
    candidate = `${baseName}${suffix}${extra}`.slice(0, SKILL_CONFIG_NAME_MAX_LENGTH);
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

/**
 * 0.1.21：per-user Skill Pack → 系统全局库。
 * 须在 TypeORM synchronize 之前执行，避免全局 name UNIQUE 与 userId 列删除失败。
 */
export async function migrateSystemSkillPacks(dbFile: string): Promise<void> {
  if (!fs.existsSync(dbFile)) return;

  const db = new Database(dbFile);
  try {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_skill_configs'")
      .get();
    if (!tableExists) return;
    if (!tableHasColumn(db, "user_skill_configs", "userId")) {
      return;
    }

    const rows = db
      .prepare(
        `SELECT id, userId, name, description, content, enabled, alwaysLoad, createdAt, updatedAt
         FROM user_skill_configs`,
      )
      .all() as PackRow[];

    const byName = new Map<string, PackRow[]>();
    for (const row of rows) {
      const list = byName.get(row.name) ?? [];
      list.push(row);
      byName.set(row.name, list);
    }

    const report: MigrationReportEntry[] = [];
    const nameById = new Map<string, string>();
    const usedNames = new Set<string>();

    for (const row of rows) {
      nameById.set(row.id, row.name);
      usedNames.add(row.name);
    }

    for (const [, group] of byName) {
      if (group.length <= 1) continue;
      group.sort((a, b) => {
        const ca = a.createdAt.localeCompare(b.createdAt);
        if (ca !== 0) return ca;
        return a.id.localeCompare(b.id);
      });
      for (let i = 1; i < group.length; i++) {
        const row = group[i];
        const newName = uniqueMigratedName(row.name, row.userId, usedNames);
        nameById.set(row.id, newName);
        report.push({
          originalName: row.name,
          packId: row.id,
          oldUserId: row.userId,
          newName,
        });
      }
    }

    if (report.length > 0) {
      console.info(
        JSON.stringify({
          event: "skill_pack_migration_name_conflicts",
          count: report.length,
          entries: report,
        }),
      );
    }

    db.exec("BEGIN");
    try {
      db.exec(`
        CREATE TABLE user_skill_configs_new (
          id VARCHAR(36) PRIMARY KEY NOT NULL,
          name VARCHAR(64) NOT NULL UNIQUE,
          description VARCHAR(500),
          content TEXT,
          enabled BOOLEAN NOT NULL DEFAULT 1,
          alwaysLoad BOOLEAN NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL
        )
      `);

      const insertPack = db.prepare(`
        INSERT INTO user_skill_configs_new
          (id, name, description, content, enabled, alwaysLoad, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const row of rows) {
        insertPack.run(
          row.id,
          nameById.get(row.id) ?? row.name,
          row.description,
          row.content,
          row.enabled,
          row.alwaysLoad,
          row.createdAt,
          row.updatedAt,
        );
      }

      db.exec("DROP TABLE user_skill_configs");
      db.exec("ALTER TABLE user_skill_configs_new RENAME TO user_skill_configs");
      db.exec("CREATE INDEX IF NOT EXISTS IDX_user_skill_configs_updatedAt ON user_skill_configs (updatedAt)");

      if (tableHasColumn(db, "skill_pack_files", "userId")) {
        const fileRows = db
          .prepare(
            `SELECT id, packId, userId, path, content, createdAt, updatedAt FROM skill_pack_files`,
          )
          .all() as FileRow[];

        db.exec(`
          CREATE TABLE skill_pack_files_new (
            id VARCHAR(36) PRIMARY KEY NOT NULL,
            packId VARCHAR(36) NOT NULL,
            path VARCHAR(512) NOT NULL,
            content TEXT NOT NULL,
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL,
            UNIQUE(packId, path)
          )
        `);

        const insertFile = db.prepare(`
          INSERT INTO skill_pack_files_new (id, packId, path, content, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const f of fileRows) {
          insertFile.run(f.id, f.packId, f.path, f.content, f.createdAt, f.updatedAt);
        }

        db.exec("DROP TABLE skill_pack_files");
        db.exec("ALTER TABLE skill_pack_files_new RENAME TO skill_pack_files");
        db.exec("CREATE INDEX IF NOT EXISTS IDX_skill_pack_files_packId ON skill_pack_files (packId)");
      }

      db.exec("COMMIT");
      console.info(JSON.stringify({ event: "skill_pack_migration_ok", packCount: rows.length }));
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  } finally {
    db.close();
  }
}
