import { createHash, randomBytes } from "crypto";

/** 验证码答案规范化后做 sha256(hex)，仅存哈希 */
export function hashCaptchaAnswer(input: string): string {
  const normalized = input.trim().toLowerCase();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/** 生成验证码挑战 id */
export function randomCaptchaId(): string {
  return randomBytes(24).toString("hex");
}
