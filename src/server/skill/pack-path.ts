import {
  SKILL_PACK_ALLOWED_EXTENSIONS,
  SKILL_PACK_DENIED_EXTENSIONS,
  SKILL_PACK_SKILL_MD_PATH,
} from "@/common/constants";

/**
 * 归一化 Pack 内相对路径。
 * 拒绝 `..`、反斜杠、绝对路径、NUL、前导 `/` 与 Windows 盘符；非法返回 null。
 */
export function normalizePackFilePath(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("\0")) return null;

  // 统一为正斜杠并去掉首尾斜杠（根文件如 SKILL.md 保留）
  let p = trimmed.replace(/\\/g, "/");
  while (p.startsWith("./")) p = p.slice(2);
  if (p.startsWith("/")) return null;
  if (/^[a-zA-Z]:/.test(p)) return null;

  const segments = p.split("/").filter((s) => s.length > 0);
  for (const seg of segments) {
    if (seg === "..") return null;
    if (seg === ".") return null;
  }
  if (segments.length === 0) return null;
  return segments.join("/");
}

/** 校验扩展名：无扩展名允许；否则须在白名单且不在拒绝列表。 */
export function isPackFileExtensionAllowed(normalizedPath: string): boolean {
  const base = normalizedPath.split("/").pop() ?? normalizedPath;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) {
    // 无扩展名或隐藏文件（.foo）— 隐藏文件在 import 层另判
    return dot < 0;
  }
  const ext = base.slice(dot).toLowerCase();
  if (SKILL_PACK_DENIED_EXTENSIONS.has(ext)) return false;
  return SKILL_PACK_ALLOWED_EXTENSIONS.has(ext);
}

export function isSkillMdPath(path: string): boolean {
  return path === SKILL_PACK_SKILL_MD_PATH;
}

export function hasScriptsPrefix(path: string): boolean {
  return path === "scripts" || path.startsWith("scripts/");
}

/** import 跳过：隐藏/缓存目录或文件名 */
export function isHiddenOrCachePath(normalizedPath: string): boolean {
  const segments = normalizedPath.split("/");
  for (const seg of segments) {
    if (seg.startsWith(".") && seg !== ".") return true;
    if (seg === "__pycache__") return true;
  }
  const base = segments[segments.length - 1] ?? "";
  if (base === ".DS_Store") return true;
  return false;
}
