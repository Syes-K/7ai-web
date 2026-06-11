/**
 * 提示词模版占位符：`{paramName}`，paramName 为 ASCII 标识符。
 * 校验：无非法 `{`、每个占位符须在声明的参数列表中。
 * 错误返回 code 枚举（Q4-B），由 route / 前端分别映射 i18n 文案。
 */
const PLACEHOLDER_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

export type PromptParamLike = { name: string };

/** 模版校验失败类型，对应 api.message `validation.promptConfig.template.*` */
export type PromptTemplateValidationCode = "invalidBrace" | "undeclaredParam";

export function validatePromptTemplate(
  value: string,
  allowedParams: readonly PromptParamLike[],
): { valid: true } | { valid: false; code: PromptTemplateValidationCode; param?: string } {
  const allowed = new Set(allowedParams.map((p) => p.name));
  const stripped = value.replace(PLACEHOLDER_RE, "");
  if (stripped.includes("{")) {
    return { valid: false, code: "invalidBrace" };
  }
  const used = new Set<string>();
  let m: RegExpExecArray | null;
  const re = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  while ((m = re.exec(value)) !== null) {
    used.add(m[1]);
  }
  for (const name of used) {
    if (!allowed.has(name)) {
      return { valid: false, code: "undeclaredParam", param: name };
    }
  }
  return { valid: true };
}
