/**
 * 将后端 error.code + message 映射到表单字段，便于就近展示。
 */

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
      return { general: m };
    case "VALIDATION_ERROR":
      if (m.includes("邮箱")) {
        return { email: m };
      }
      return { general: m };
    default:
      return { general: m || "登录失败" };
  }
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
      return { general: msg };
    case "VALIDATION_ERROR":
      return mapRegisterValidationMessage(msg);
    default:
      return { general: msg || "注册失败" };
  }
}

/** 解析 VALIDATION_ERROR 文案到字段（与后端中文提示保持一致） */
function mapRegisterValidationMessage(m: string): RegisterFieldErrors {
  if (m.includes("两次密码")) {
    return { passwordConfirm: m };
  }
  if (m.includes("手机号")) {
    return { telNo: m };
  }
  if (m.includes("昵称")) {
    return { nickName: m };
  }
  if (
    m.includes("不能与邮箱") ||
    (m.includes("密码") &&
      (m.includes("至少") ||
        m.includes("字母") ||
        m.includes("数字")))
  ) {
    return { password: m };
  }
  if (m.includes("有效邮箱") || (m.includes("邮箱") && !m.includes("密码"))) {
    return { email: m };
  }
  if (m.includes("密码")) {
    return { password: m };
  }
  return { general: m };
}
