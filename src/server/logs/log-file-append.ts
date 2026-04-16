import { appendFile, mkdir } from "fs/promises";
import path from "path";

const LOG_DIR = path.join(process.cwd(), ".logs");

/** 本地时区 YYYY-MM-DD-HH，按小时滚动日志文件 */
function hourlyLogBasename(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    return `${y}-${m}-${day}-${h}`;
}

export async function appendLogFileLine(line: string): Promise<void> {
    await mkdir(LOG_DIR, { recursive: true });
    const filePath = path.join(LOG_DIR, hourlyLogBasename()) + '.log';
    await appendFile(filePath, `${line}\n`, "utf8");
}
