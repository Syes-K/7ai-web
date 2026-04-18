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

/** 绑定助手但开场白为空时，首条助手消息固定文案（与 design 0.1.2 §6.1 一致） */
export const CHAT_ASSISTANT_DEFAULT_OPENING_MESSAGE = "你好，我是你的助手。需要什么帮助？";

/** 控制台助手列表默认页码 */
export const CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE = 1;
/** 控制台助手列表默认每页条数（与模型列表一致） */
export const CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE_SIZE = 20;
/** 控制台助手列表单页最大条数 */
export const CONSOLE_ASSISTANT_LIST_MAX_PAGE_SIZE = 100;

/** 助手名称最大长度 */
export const ASSISTANT_NAME_MAX_LENGTH = 64;
/** 助手提示词最大长度 */
export const ASSISTANT_PROMPT_MAX_LENGTH = 8000;
/** 助手图标（emoji 文案）最大长度 */
export const ASSISTANT_ICON_MAX_LENGTH = 16;
/** 助手开场白最大长度 */
export const ASSISTANT_OPENING_MESSAGE_MAX_LENGTH = 2000;
/** 单个 tag 最大长度 */
export const ASSISTANT_TAG_MAX_LENGTH = 32;
/** 单条助手最多 tag 数 */
export const ASSISTANT_TAGS_MAX_COUNT = 20;

/** 知识库名称最大长度 */
export const KNOWLEDGE_BASE_NAME_MAX_LENGTH = 64;
/** 知识库描述最大长度 */
export const KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH = 500;
/** 单个知识库 tag 最大长度 */
export const KNOWLEDGE_BASE_TAG_MAX_LENGTH = 20;
/** 单条知识库最多 tag 数 */
export const KNOWLEDGE_BASE_TAGS_MAX_COUNT = 20;
/** 单条知识库正文最大长度（按 Unicode 码点计） */
export const KNOWLEDGE_BASE_CONTENT_MAX_LENGTH = 50_000;

/** 检索默认 topK */
export const KNOWLEDGE_BASE_SEARCH_TOPK_DEFAULT = 3;
/** 检索默认阈值 */
export const KNOWLEDGE_BASE_SEARCH_THRESHOLD_DEFAULT = 0.75;
/** 分片默认 chunkSize */
export const KNOWLEDGE_BASE_CHUNK_SIZE_DEFAULT = 1000;
/** 分片默认 chunkOverlap */
export const KNOWLEDGE_BASE_CHUNK_OVERLAP_DEFAULT = 200;

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
  "重排",
  "对话",
] as const;

export type ModelConfigTag = (typeof MODEL_CONFIG_TAG_OPTIONS)[number];

/** 用于校验 / 过滤标签是否属于 {@link MODEL_CONFIG_TAG_OPTIONS} */
export const MODEL_CONFIG_TAG_OPTION_SET: ReadonlySet<string> = new Set(
  MODEL_CONFIG_TAG_OPTIONS,
);

/** 默认系统提示词 */
export const CHAT_SYSTEM_PROMPT = "你是一个有帮助的中文助手，回答简洁、准确。";

/** LangChain 摘要中间件调用标识（用于回调阶段识别摘要子调用）。 */
export const LLM_SUMMARIZATION_TAG = "summarization";

/** 对话摘要功能默认开关：开启。 */
export const CONVERSATION_SUMMARY_ENABLED_DEFAULT = true;
/** 对话摘要默认最大字符数。 */
export const CONVERSATION_SUMMARY_MAX_CHARS_DEFAULT = 2000;
/** 摘要触发默认模式。 */
export const CONVERSATION_SUMMARY_MODE_DEFAULT: "tokens" | "messages" = "messages";
/** token 模式：默认触发阈值。 */
export const CONVERSATION_SUMMARY_TRIGGER_TOKENS_DEFAULT = 6000;
/** token 模式：默认保留 token 预算。 */
export const CONVERSATION_SUMMARY_KEEP_TOKENS_DEFAULT = 2000;
/** messages 模式：默认触发条数。 */
export const CONVERSATION_SUMMARY_TRIGGER_MESSAGES_DEFAULT = 30;
/** messages 模式：默认保留条数。 */
export const CONVERSATION_SUMMARY_KEEP_MESSAGES_DEFAULT = 12;
/** 摘要后最少保留最近原文消息条数（确保近几轮细节不被立即折叠）。 */
export const CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_DEFAULT = 6;
/** 对话摘要最大字符数上限（管理端校验）。 */
export const CONVERSATION_SUMMARY_MAX_CHARS_MAX = 32000;
/** token 模式触发阈值上限（管理端校验）。 */
export const CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX = 200000;
/** token 模式保留 token 上限（管理端校验）。 */
export const CONVERSATION_SUMMARY_KEEP_TOKENS_MAX = 100000;
/** messages 模式触发条数上限（管理端校验）。 */
export const CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX = 1000;
/** messages 模式保留条数上限（管理端校验）。 */
export const CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX = 500;
/** 摘要后最少保留最近原文消息条数上限（管理端校验）。 */
export const CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX = 200;