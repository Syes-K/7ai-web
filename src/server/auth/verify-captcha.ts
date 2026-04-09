import type { CaptchaVerifyResult } from "@/common/types";
import { getDataSource } from "../db/data-source";
import { CaptchaChallenge } from "../db/entities/CaptchaChallenge";
import { hashCaptchaAnswer } from "./captcha-crypto";

/**
 * 校验图形验证码：成功则标记 consumed；错误则保持原 challenge 至过期（可刷新）。
 */
export async function verifyCaptchaChallenge(
  captchaId: string | null | undefined,
  captchaInput: string | null | undefined,
): Promise<CaptchaVerifyResult> {
  if (!captchaId?.trim() || !captchaInput?.trim()) {
    return "missing";
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(CaptchaChallenge);
  const row = await repo.findOne({ where: { id: captchaId.trim() } });
  if (!row || row.consumedAt) {
    return "invalid";
  }
  if (new Date(row.expiresAt) < new Date()) {
    return "invalid";
  }

  const hash = hashCaptchaAnswer(captchaInput);
  if (hash !== row.answerHash) {
    return "invalid";
  }

  row.consumedAt = new Date();
  await repo.save(row);
  return "ok";
}
