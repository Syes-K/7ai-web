/** 统一 HTTP 状态码，避免魔法数字散落。 */
export enum HttpStatus {
  OK = 200,
  NO_CONTENT = 204,
  CREATED = 201,
  ACCEPTED = 202,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  /** 资源状态冲突（如删除时被引用） */
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  BAD_GATEWAY = 502,
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
  /** 已登录但无权访问该资源（如非管理员访问管理端） */
  FORBIDDEN = "FORBIDDEN",
  /** 目标资源不存在（如管理端按 id 操作用户未找到） */
  USER_NOT_FOUND = "USER_NOT_FOUND",
  /** 会话不存在或无权访问（统一 404） */
  CONVERSATION_NOT_FOUND = "CONVERSATION_NOT_FOUND",
  /** 控制台模型配置不存在或无权访问（统一 404，避免枚举他人资源） */
  MODEL_CONFIG_NOT_FOUND = "MODEL_CONFIG_NOT_FOUND",
  /** 助手不存在或无权访问（统一 404） */
  ASSISTANT_NOT_FOUND = "ASSISTANT_NOT_FOUND",
  /** 知识库不存在或无权访问（统一 404） */
  KNOWLEDGE_BASE_NOT_FOUND = "KNOWLEDGE_BASE_NOT_FOUND",
  /** 知识库仍被助手引用，需先解除绑定 */
  KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT = "KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT",
  /** 分片测试不可用（如未向量化完成） */
  KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE = "KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE",
  /** 大模型调用失败或不可用 */
  MODEL_ERROR = "MODEL_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
