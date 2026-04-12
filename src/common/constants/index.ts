/** HttpOnly 会话 Cookie 名称 */
export const SESSION_COOKIE = "7ai_session";

/** 会话有效期（秒），默认 7 天 */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/** 图形验证码 TTL（毫秒） */
export const CAPTCHA_TTL_MS = 5 * 60 * 1000;

/** middleware: 全站总量限流窗口（毫秒） */
export const MIDDLEWARE_TOTAL_RATE_WINDOW_MS = 60_000;

/** middleware: 全站总量限流次数（每窗口） */
export const MIDDLEWARE_TOTAL_RATE_LIMIT = 12_000;

/** middleware: 接口级限流窗口（毫秒） */
export const MIDDLEWARE_API_RATE_WINDOW_MS = 60_000;

/** middleware: 接口级限流次数（每窗口、按 path+ip） */
export const MIDDLEWARE_API_RATE_LIMIT = 60;

/** 登录失败达到该次数后触发邮箱+IP 维度锁定 */
export const LOGIN_FAIL_MAX_ATTEMPTS = 5;

/** 登录失败锁定时长（毫秒）：30 分钟 */
export const LOGIN_FAIL_LOCK_MS = 30 * 60 * 1000;

/** 会话列表默认条数 */
export const CHAT_CONVERSATION_LIST_DEFAULT_LIMIT = 20;
/** 会话列表单次最大条数 */
export const CHAT_CONVERSATION_LIST_MAX_LIMIT = 50;

/** 消息列表默认条数（单页） */
export const CHAT_MESSAGE_LIST_DEFAULT_LIMIT = 50;
/** 消息列表单次最大条数 */
export const CHAT_MESSAGE_LIST_MAX_LIMIT = 200;

/** 单条用户消息最大字符数（按 Unicode 码点计） */
export const CHAT_USER_MESSAGE_MAX_LENGTH = 16_000;

/** 由首条用户消息生成标题时的截断长度（码点） */
export const CHAT_TITLE_FROM_USER_MAX_CHARS = 32;

/** 新建或无用户消息时的默认会话标题 */
export const CHAT_DEFAULT_CONVERSATION_TITLE = "新对话";

/** 控制台模型列表默认页码 */
export const CONSOLE_MODEL_LIST_DEFAULT_PAGE = 1;
/** 控制台模型列表默认每页条数（与管理端用户列表对齐） */
export const CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE = 20;
/** 控制台模型列表单页最大条数 */
export const CONSOLE_MODEL_LIST_MAX_PAGE_SIZE = 100;

/** 模型名称最大长度（与实体 `modelName` 列一致） */
export const CONSOLE_MODEL_NAME_MAX_LENGTH = 255;

/** 模型配置可选标签（仅允许下列值，可多选；可不选） */
export const MODEL_CONFIG_TAG_OPTIONS = [
  "免费",
  "文本",
  "视频",
  "声音",
  "嵌入",
  "对话",
] as const;

export type ModelConfigTag = (typeof MODEL_CONFIG_TAG_OPTIONS)[number];

/** 用于校验 / 过滤标签是否属于 {@link MODEL_CONFIG_TAG_OPTIONS} */
export const MODEL_CONFIG_TAG_OPTION_SET: ReadonlySet<string> = new Set(
  MODEL_CONFIG_TAG_OPTIONS,
);
