import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";

/** 项目根下 `data/conversationSummaryConfig.json`。 */
export function getConversationSummaryConfigPath(): string {
  return path.join(process.cwd(), "data", "conversationSummaryConfig.json");
}

export async function readConversationSummaryConfigFile(): Promise<{ raw: string | null }> {
  const p = getConversationSummaryConfigPath();
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

export async function writeConversationSummaryConfigAtomic(jsonString: string): Promise<void> {
  const finalPath = getConversationSummaryConfigPath();
  const dir = path.dirname(finalPath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `conversationSummaryConfig.${randomBytes(8).toString("hex")}.tmp`,
  );
  await fs.writeFile(tmp, jsonString, "utf8");
  await fs.rename(tmp, finalPath);
}
