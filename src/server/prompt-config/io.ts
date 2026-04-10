import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";

/** 项目根下 `data/promptConfig.json`，与迭代文档约定一致。 */
export function getPromptConfigPath(): string {
  return path.join(process.cwd(), "data", "promptConfig.json");
}

/**
 * 读取配置文件。
 * - 不存在：返回 `raw: null`（非错误）。
 * - 其他 IO 错误：抛出，由 Route Handler 映射 500。
 */
export async function readPromptConfigFile(): Promise<{ raw: string | null }> {
  const p = getPromptConfigPath();
  try {
    const raw = await fs.readFile(p, "utf8");
    return { raw };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return { raw: null };
    }
    throw e;
  }
}

/** 先写临时文件再 rename，降低写入半截 JSON 的概率。 */
export async function writePromptConfigAtomic(jsonString: string): Promise<void> {
  const finalPath = getPromptConfigPath();
  const dir = path.dirname(finalPath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `promptConfig.${randomBytes(8).toString("hex")}.tmp`);
  await fs.writeFile(tmp, jsonString, "utf8");
  await fs.rename(tmp, finalPath);
}
