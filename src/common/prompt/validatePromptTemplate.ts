/**
 * 提示词模版占位符：`{paramName}`，paramName 为 ASCII 标识符。
 * 校验：无非法 `{`、每个占位符须在声明的参数列表中。
 */
const PLACEHOLDER_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

export type PromptParamLike = { name: string };

export function validatePromptTemplate(
  value: string,
  allowedParams: readonly PromptParamLike[],
): { valid: true } | { valid: false; message: string } {
  const allowed = new Set(allowedParams.map((p) => p.name));
  let stripped = value.replace(PLACEHOLDER_RE, "");
  if (stripped.includes("{")) {
    return {
      valid: false,
      message:
        "模版中存在非法的「{」占位符，请仅使用 {参数名} 形式（参数名为英文、数字、下划线，且须与下方已声明参数一致）",
    };
  }
  const used = new Set<string>();
  let m: RegExpExecArray | null;
  const re = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  while ((m = re.exec(value)) !== null) {
    used.add(m[1]);
  }
  for (const name of used) {
    if (!allowed.has(name)) {
      return {
        valid: false,
        message: `模版中使用了未声明的参数：{${name}}`,
      };
    }
  }
  return { valid: true };
}
