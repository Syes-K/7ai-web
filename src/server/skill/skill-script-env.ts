/**
 * Skill 脚本执行与意图路由相关环境变量读取（非法值回退默认）。
 */
function parseEnvInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return defaultValue;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

export function getSkillPackIntentTimeoutMs(): number {
  return parseEnvInt("SKILL_PACK_INTENT_TIMEOUT_MS", 15_000);
}

export function getSkillScriptDefaultTimeoutMs(): number {
  return parseEnvInt("SKILL_SCRIPT_DEFAULT_TIMEOUT_MS", 30_000);
}

export function getSkillScriptMaxTimeoutMs(): number {
  return parseEnvInt("SKILL_SCRIPT_MAX_TIMEOUT_MS", 120_000);
}

export function getSkillScriptMaxRunsPerTurn(): number {
  return parseEnvInt("SKILL_SCRIPT_MAX_RUNS_PER_TURN", 5);
}

export function getSkillScriptMaxRunsPerUserDay(): number {
  return parseEnvInt("SKILL_SCRIPT_MAX_RUNS_PER_USER_DAY", 100);
}

export function getSkillScriptOutputMaxChars(): number {
  return parseEnvInt("SKILL_SCRIPT_OUTPUT_MAX_CHARS", 32_000);
}

export function getPythonPath(): string {
  return process.env.PYTHON_PATH?.trim() || "python3";
}
