import {
  SKILL_CONFIG_DESCRIPTION_MAX_LENGTH,
  SKILL_CONFIG_NAME_MAX_LENGTH,
} from "@/common/constants";

export type SkillMdFrontmatterResult = {
  frontmatter: Record<string, string> | null;
  body: string;
};

/**
 * 剥离 SKILL.md 首段 YAML frontmatter（`---` … `---`）。
 * 解析失败时整文件当作 body，不阻塞合并或保存。
 */
export function stripSkillMdFrontmatter(content: string): SkillMdFrontmatterResult {
  if (!content.startsWith("---\n")) {
    return { frontmatter: null, body: content };
  }
  const end = content.indexOf("\n---\n", 4);
  if (end < 0) {
    return { frontmatter: null, body: content };
  }
  const yamlBlock = content.slice(4, end);
  const body = content.slice(end + 5);
  const fm = parseSimpleYaml(yamlBlock);
  return { frontmatter: fm, body: body.trimStart() };
}

/** 简易 key: value 解析（仅支持单行字符串值，满足 name/description）。 */
function parseSimpleYaml(block: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  let any = false;
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(trimmed);
    if (!m) continue;
    any = true;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return any ? out : null;
}

/** 从 frontmatter 解析 alwaysLoad；缺省或非法值返回 undefined（不覆盖表字段）。 */
export function parseAlwaysLoadFromFrontmatter(fm: Record<string, string>): boolean | undefined {
  const raw = fm.alwaysLoad?.trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

/** 从 frontmatter 提取 name/description（trim + 长度截断至实体上限）。 */
export function extractSkillMetadataFromFrontmatter(
  fm: Record<string, string>,
): { name?: string; description?: string } {
  const out: { name?: string; description?: string } = {};
  if (typeof fm.name === "string") {
    const n = fm.name.trim();
    if (n) out.name = n.slice(0, SKILL_CONFIG_NAME_MAX_LENGTH);
  }
  if (typeof fm.description === "string") {
    const d = fm.description.trim();
    out.description = d.slice(0, SKILL_CONFIG_DESCRIPTION_MAX_LENGTH);
  }
  return out;
}

/** 0.1.18 → 0.1.19 迁移：将旧 content 包进 SKILL.md frontmatter。 */
export function wrapSkillMdMigrationContent(
  name: string,
  description: string | null,
  body: string,
): string {
  const desc = description ?? "";
  return `---\nname: ${escapeYamlScalar(name)}\ndescription: ${escapeYamlScalar(desc)}\n---\n\n${body}`;
}

/** 新建 Pack 默认 SKILL.md 模板。 */
export function buildDefaultSkillMdTemplate(name: string, description: string | null): string {
  return wrapSkillMdMigrationContent(
    name,
    description,
    "# Instructions\n\nWrite skill instructions here…",
  );
}

function escapeYamlScalar(s: string): string {
  if (/[:#\n\r]/.test(s) || s.includes('"')) {
    return JSON.stringify(s);
  }
  return s;
}
