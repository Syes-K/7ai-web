/**
 * 将后端 error.code + message 映射到表单字段，便于就近展示。
 */

/** 控制台等接口返回的标准错误体（用于按 code 分支处理）。 */
export type ApiErrorPayload = {
  code?: string;
  message: string;
  details?: ReadonlyArray<{ field?: string; message?: string }>;
};

/**
 * 解析 JSON 错误体（`{ error: { code, message, details } }`）。
 * **会消费 `res` 的 body**，同一 Response 不可再调用 `json()`/`text()`。
 */
export async function readApiErrorPayload(res: Response): Promise<ApiErrorPayload> {
  const j = (await res.json().catch(() => null)) as {
    error?: { code?: string; message?: string; details?: Array<{ field?: string; message?: string }> };
  } | null;
  const msg = typeof j?.error?.message === "string" ? j.error.message.trim() : "";
  return {
    code: typeof j?.error?.code === "string" ? j.error.code : undefined,
    message: msg.length > 0 ? msg : `请求失败（${res.status}）`,
    details: Array.isArray(j?.error?.details) ? j.error.details : undefined,
  };
}

export type LoginFieldErrors = {
  email?: string;
  password?: string;
  captcha?: string;
  /** 无法对应单字段时（频控、网络、账号禁用等） */
  general?: string;
};

export function mapLoginApiError(
  code: string | undefined,
  message: string,
): LoginFieldErrors {
  const m = message.trim();
  switch (code) {
    case "CAPTCHA_INVALID":
    case "CAPTCHA_REQUIRED":
      return { captcha: m };
    case "AUTH_INVALID_CREDENTIALS":
      return { password: m };
    case "AUTH_ACCOUNT_DISABLED":
      return { general: m };
    case "RATE_LIMITED":
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return { general: m };
    case "VALIDATION_ERROR":
      return mapLoginValidationMessage(m);
    default:
      return { general: m };
  }
}

function mapLoginValidationMessage(m: string): LoginFieldErrors {
  const lower = m.toLowerCase();
  if (m.includes("邮箱") || lower.includes("email")) {
    return { email: m };
  }
  if (m.includes("密码") || lower.includes("password")) {
    return { password: m };
  }
  return { general: m };
}

export type RegisterFieldErrors = {
  email?: string;
  telNo?: string;
  nickName?: string;
  password?: string;
  passwordConfirm?: string;
  captcha?: string;
  general?: string;
};

export function mapRegisterApiError(
  code: string | undefined,
  message: string,
): RegisterFieldErrors {
  const msg = message.trim();
  switch (code) {
    case "CAPTCHA_INVALID":
    case "CAPTCHA_REQUIRED":
      return { captcha: msg };
    case "AUTH_EMAIL_TAKEN":
      return { email: msg };
    case "AUTH_TEL_TAKEN":
      return { telNo: msg };
    case "RATE_LIMITED":
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return { general: msg };
    case "VALIDATION_ERROR":
      return mapRegisterValidationMessage(msg);
    default:
      return { general: msg };
  }
}

/** 解析 VALIDATION_ERROR 文案到字段（中英 keyword 渐进补强，Q4-B） */
function mapRegisterValidationMessage(m: string): RegisterFieldErrors {
  const lower = m.toLowerCase();

  if (
    m.includes("两次密码") ||
    lower.includes("mismatch") ||
    lower.includes("confirm")
  ) {
    return { passwordConfirm: m };
  }
  if (m.includes("手机号") || lower.includes("phone") || lower.includes("tel")) {
    return { telNo: m };
  }
  if (
    m.includes("昵称") ||
    lower.includes("display name") ||
    lower.includes("nick")
  ) {
    return { nickName: m };
  }
  if (
    m.includes("不能与邮箱") ||
    (m.includes("密码") &&
      (m.includes("至少") ||
        m.includes("字母") ||
        m.includes("数字"))) ||
    (lower.includes("password") &&
      (lower.includes("at least") ||
        lower.includes("letter") ||
        lower.includes("number") ||
        lower.includes("same as") ||
        lower.includes("cannot be")))
  ) {
    return { password: m };
  }
  if (
    m.includes("有效邮箱") ||
    (m.includes("邮箱") && !m.includes("密码")) ||
    (lower.includes("email") && !lower.includes("password"))
  ) {
    return { email: m };
  }
  if (m.includes("密码") || lower.includes("password")) {
    return { password: m };
  }
  return { general: m };
}
