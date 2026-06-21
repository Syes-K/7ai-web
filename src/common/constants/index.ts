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

/** 模型配置可选标签（英文 key，存库与 API 校验；展示走 i18n `tag.model.*`） */
export const MODEL_CONFIG_TAG_OPTIONS = [
  "free",
  "text",
  "video",
  "audio",
  "embedding",
  "rerank",
  "chat",
] as const;

export type ModelConfigTag = (typeof MODEL_CONFIG_TAG_OPTIONS)[number];

/** 用于校验 / 过滤标签是否属于 {@link MODEL_CONFIG_TAG_OPTIONS} */
export const MODEL_CONFIG_TAG_OPTION_SET: ReadonlySet<string> = new Set(
  MODEL_CONFIG_TAG_OPTIONS,
);

/** 默认系统提示词（语言中立；具体回复语言由 {@link CHAT_LANGUAGE_REPLY_SUFFIX} 约束） */
export const CHAT_SYSTEM_PROMPT = "You are a helpful assistant. Be concise and accurate.";

/** 追加到系统提示，使模型随用户最新一条消息的语言回复 */
export const CHAT_LANGUAGE_REPLY_SUFFIX =
  " Reply in the same language as the user's latest message.";

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

/** MCP 配置名称最大长度（与实体列一致） */
export const MCP_CONFIG_NAME_MAX_LENGTH = 64;
/** MCP 配置描述最大长度 */
export const MCP_CONFIG_DESCRIPTION_MAX_LENGTH = 500;
/** MCP transport 字段最大长度 */
export const MCP_CONFIG_TRANSPORT_MAX_LENGTH = 32;
/** 单用户最多 MCP 配置条数（技术上限） */
export const MCP_CONFIG_MAX_PER_USER = 50;
/** 单助手最多挂载 MCP 数 */
export const MCP_CONFIG_MAX_PER_ASSISTANT = 20;
/** 单轮对话最多加载的不同 MCP 配置数 */
export const MCP_CONFIG_MAX_BINDINGS_PER_CHAT_TURN = 10;

/** Skill 配置名称最大长度（与实体列一致） */
export const SKILL_CONFIG_NAME_MAX_LENGTH = 64;
/** Skill Pack 名称上限（与 SKILL_CONFIG_NAME_MAX_LENGTH 同义） */
export const SKILL_PACK_NAME_MAX_LENGTH = SKILL_CONFIG_NAME_MAX_LENGTH;
/** Skill 配置描述最大长度 */
export const SKILL_CONFIG_DESCRIPTION_MAX_LENGTH = 500;
/** @deprecated 0.1.19 起正文存 skill_pack_files；仅迁移期可读 user_skill_configs.content */
export const SKILL_CONFIG_CONTENT_MAX_LENGTH = 16_000;
/** 单用户最多 Skill 配置条数 */
export const SKILL_CONFIG_MAX_PER_USER = 50;
/** 单用户最多 Skill Pack 数（与 SKILL_CONFIG_MAX_PER_USER 同义） */
export const SKILL_PACK_MAX_PER_USER = SKILL_CONFIG_MAX_PER_USER;
/** 0.1.21：系统全局 Skill Pack 总数上限 */
export const SKILL_PACK_MAX_SYSTEM = 200;
/** 单助手最多挂载 Skill 数 */
export const SKILL_CONFIG_MAX_PER_ASSISTANT = 10;
/** 单轮对话最多加载的不同 Skill 配置数 */
export const SKILL_CONFIG_MAX_BINDINGS_PER_CHAT_TURN = 10;
/** Skill Pack 入口文件名（根相对路径） */
export const SKILL_PACK_SKILL_MD_PATH = "SKILL.md";
/** 每 Pack 最多文件数 */
export const SKILL_PACK_MAX_FILES = 100;
/** Pack 总字节上限（UTF-8） */
export const SKILL_PACK_MAX_TOTAL_BYTES = 2_000_000;
/** 单文件字节上限 */
export const SKILL_PACK_FILE_MAX_BYTES = 512_000;
/** SKILL.md 正文（去 frontmatter 后）最大长度 */
export const SKILL_MD_MAX_BODY_LENGTH = 32_000;
/** import zip 压缩包读取上限（略高于 Pack 总上限，防 zip 炸弹） */
export const SKILL_PACK_IMPORT_ZIP_MAX_BYTES = 2_500_000;
/** Pack 内允许的文件扩展名（含点；无扩展名另判） */
export const SKILL_PACK_ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".csv",
  ".py",
  ".sh",
  ".js",
  ".ts",
]);
/** 明确拒绝的扩展名 */
export const SKILL_PACK_DENIED_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".zip",
  ".pyc",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".pdf",
  ".wasm",
  ".bin",
]);
/** list_tools / 测试连接超时（毫秒） */
export const MCP_LIST_TOOLS_TIMEOUT_MS = 30_000;
/** 测试连接：同一用户同一配置最短间隔（毫秒），用于简单频控 */
export const MCP_TEST_CONNECTION_MIN_INTERVAL_MS = 3_000;

/** Skill Pack 意图路由 LLM 调用超时（毫秒）；可被 SKILL_PACK_INTENT_TIMEOUT_MS 覆盖 */
export const SKILL_PACK_INTENT_TIMEOUT_MS = 15_000;
/** Skill 脚本默认执行超时（毫秒） */
export const SKILL_SCRIPT_DEFAULT_TIMEOUT_MS = 30_000;
/** Skill 脚本 tool 参数允许的最大超时（毫秒） */
export const SKILL_SCRIPT_MAX_TIMEOUT_MS = 120_000;
/** 单 Turn 最多 spawn 脚本次数 */
export const SKILL_SCRIPT_MAX_RUNS_PER_TURN = 5;
/** 单用户自然日（UTC）最多 spawn 脚本次数 */
export const SKILL_SCRIPT_MAX_RUNS_PER_USER_DAY = 100;
/** stdout/stderr 各段最大字符数 */
export const SKILL_SCRIPT_OUTPUT_MAX_CHARS = 32_000;
/** LangChain tool 名：沙箱执行 Skill Pack 脚本 */
export const RUN_SKILL_SCRIPT_TOOL_NAME = "run_skill_script";
/** LangChain 意图路由模型调用 tag */
export const SKILL_PACK_INTENT_TAG = "SKILL_PACK_INTENT";