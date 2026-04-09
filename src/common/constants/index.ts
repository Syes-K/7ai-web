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
