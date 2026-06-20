import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import type { DataSource } from "typeorm";
import { SkillPackFile } from "@/server/db/entities/SkillPackFile";
import { getSkillScriptOutputMaxChars, getPythonPath } from "@/server/skill/skill-script-env";

export type SkillScriptSandboxResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  errorSummary?: string;
};

function truncateOutput(s: string, max = getSkillScriptOutputMaxChars()): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…[truncated]`;
}

function collectStream(stream: NodeJS.ReadableStream | null): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!stream) {
      resolve("");
      return;
    }
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer | string) => {
      chunks.push(typeof c === "string" ? Buffer.from(c) : c);
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

/** 子进程最小环境（best-effort 无出站：不注入代理变量）。 */
function minimalChildEnv(sandboxRoot: string): Record<string, string | undefined> {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: sandboxRoot,
    LANG: process.env.LANG ?? "C.UTF-8",
    TMPDIR: path.join(sandboxRoot, "workspace"),
  };
}

/** 将 Pack 内相对路径文件写入沙箱根，保留目录结构。 */
async function copyPackFilesToSandbox(
  sandboxRoot: string,
  rows: SkillPackFile[],
  pathPrefix: string,
): Promise<void> {
  for (const row of rows) {
    if (!row.path.startsWith(pathPrefix)) continue;
    const dest = path.join(sandboxRoot, ...row.path.split("/"));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, row.content, "utf8");
  }
}

/**
 * 在临时目录沙箱中执行 Pack 内 scripts/ 脚本。
 * cwd 为 workspace/；同 Pack 的 scripts/** 与 data/** 从 DB 复制（支持多文件 import）。
 */
export async function runSkillScriptInSandbox(options: {
  ds: DataSource;
  userId: string;
  packId: string;
  scriptPath: string;
  args: string[];
  timeoutMs: number;
}): Promise<SkillScriptSandboxResult> {
  const { ds, userId, packId, scriptPath, args, timeoutMs } = options;
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), "7ai-skill-run-"));
  const workspaceDir = path.join(sandboxRoot, "workspace");

  try {
    await fs.mkdir(workspaceDir, { recursive: true });

    const packFiles = await ds.getRepository(SkillPackFile).find({
      where: { userId, packId } as any,
    });
    const scriptRow = packFiles.find((row) => row.path === scriptPath);
    if (!scriptRow) {
      return {
        exitCode: null,
        stdout: "",
        stderr: "",
        errorSummary: "script_not_found",
      };
    }

    await copyPackFilesToSandbox(sandboxRoot, packFiles, "scripts/");
    await copyPackFilesToSandbox(sandboxRoot, packFiles, "data/");

    const scriptAbs = path.join(sandboxRoot, ...scriptPath.split("/"));

    const ext = path.posix.extname(scriptPath).toLowerCase();
    let cmd: string;
    let cmdArgs: string[];
    if (ext === ".py") {
      cmd = getPythonPath();
      cmdArgs = [scriptAbs, ...args];
    } else if (ext === ".sh") {
      cmd = "bash";
      for (const row of packFiles) {
        if (row.path.startsWith("scripts/") && row.path.endsWith(".sh")) {
          await fs.chmod(path.join(sandboxRoot, ...row.path.split("/")), 0o755);
        }
      }
      cmdArgs = [scriptAbs, ...args];
    } else {
      return {
        exitCode: null,
        stdout: "",
        stderr: "",
        errorSummary: "unsupported_extension",
      };
    }

    const child = spawn(cmd, cmdArgs, {
      cwd: workspaceDir,
      env: { ...minimalChildEnv(sandboxRoot) } as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    const exitCodePromise = new Promise<number | null>((resolve, reject) => {
      child.on("close", (code) => resolve(code));
      child.on("error", (err) => reject(err));
    });

    const [stdoutRaw, stderrRaw, exitCode] = await Promise.all([
      collectStream(child.stdout),
      collectStream(child.stderr),
      exitCodePromise,
    ]);

    clearTimeout(timer);

    if (timedOut) {
      return {
        exitCode: null,
        stdout: truncateOutput(stdoutRaw),
        stderr: truncateOutput(stderrRaw),
        errorSummary: "timeout",
      };
    }

    return {
      exitCode,
      stdout: truncateOutput(stdoutRaw),
      stderr: truncateOutput(stderrRaw),
    };
  } catch (e) {
    return {
      exitCode: null,
      stdout: "",
      stderr: "",
      errorSummary: e instanceof Error ? e.message : String(e),
    };
  } finally {
    await fs.rm(sandboxRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}
