import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KDF_SALT = "7ai-user-model-config-v1";

let warnedInsecureKey = false;

/**
 * 派生 32 字节密钥：优先 `MODEL_CONFIG_SECRET`（≥16 字符）；
 * 未配置或过短时使用固定派生值（仅适合本地；**生产环境务必配置 MODEL_CONFIG_SECRET**）。
 */
function deriveKey(): Buffer {
  const env = process.env.MODEL_CONFIG_SECRET?.trim();
  if (env && env.length >= 16) {
    return crypto.scryptSync(env, KDF_SALT, 32);
  }
  if (!warnedInsecureKey) {
    warnedInsecureKey = true;
    console.warn(
      "[model-config] 未设置 MODEL_CONFIG_SECRET（或长度不足 16），已使用内置派生密钥。生产环境请设置 MODEL_CONFIG_SECRET。",
    );
  }
  return crypto.createHash("sha256").update(`${KDF_SALT}-dev-only`).digest();
}

/** 明文 API Key → 密文（Base64URL 单字段落库） */
export function encryptApiKey(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

/** 与 {@link encryptApiKey} 互逆；失败时抛出（调用方勿将错误内容返回给客户端）。 */
export function decryptApiKey(stored: string): string {
  const key = deriveKey();
  const buf = Buffer.from(stored, "base64url");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
