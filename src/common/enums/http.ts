/** 统一 HTTP 状态码，避免魔法数字散落。 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

/** 统一业务错误码，避免魔法字符串散落。 */
export enum ErrorCode {
  /** 请求参数不合法 */
  VALIDATION_ERROR = "VALIDATION_ERROR",
  /** 未完成图形验证码 */
  CAPTCHA_REQUIRED = "CAPTCHA_REQUIRED",
  /** 图形验证码错误或过期 */
  CAPTCHA_INVALID = "CAPTCHA_INVALID",
  /** 登录邮箱或密码不匹配（含邮箱未注册） */
  AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  /** 注册时邮箱已存在 */
  AUTH_EMAIL_TAKEN = "AUTH_EMAIL_TAKEN",
  /** 注册时手机号已被占用 */
  AUTH_TEL_TAKEN = "AUTH_TEL_TAKEN",
  /** 账号被禁用/冻结 */
  AUTH_ACCOUNT_DISABLED = "AUTH_ACCOUNT_DISABLED",
  /** 触发频控 */
  RATE_LIMITED = "RATE_LIMITED",
  UNAUTHORIZED = "UNAUTHORIZED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
