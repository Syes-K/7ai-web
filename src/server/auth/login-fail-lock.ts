import { LOGIN_FAIL_LOCK_MS, LOGIN_FAIL_MAX_ATTEMPTS } from "@/common/constants";

type FailBucket = {
  count: number;
  lockUntil: number;
};

/**
 * 邮箱+IP 维度的登录失败计数与锁定（进程内单实例）。
 */
const failBuckets = new Map<string, FailBucket>();

function now() {
  return Date.now();
}

function lockKey(email: string, ip: string): string {
  return `${email.trim().toLowerCase()}|${ip}`;
}

export function getLoginLockRemainingMs(email: string, ip: string): number {
  const key = lockKey(email, ip);
  const bucket = failBuckets.get(key);
  if (!bucket) {
    return 0;
  }
  // 未进入锁定期时，仅累计失败次数，不应在查询锁剩余时间时删除 bucket。
  if (bucket.lockUntil <= 0) {
    return 0;
  }
  const remain = bucket.lockUntil - now();
  if (remain <= 0) {
    failBuckets.delete(key);
    return 0;
  }
  return remain;
}

export function recordLoginFailure(email: string, ip: string): number {
  const key = lockKey(email, ip);
  const bucket = failBuckets.get(key);
  const ts = now();

  if (!bucket) {
    const next: FailBucket = { count: 1, lockUntil: 0 };
    failBuckets.set(key, next);
    return 0;
  }

  if (bucket.lockUntil > ts) {
    return bucket.lockUntil - ts;
  }

  if (bucket.lockUntil > 0 && bucket.lockUntil <= ts) {
    bucket.count = 1;
    bucket.lockUntil = 0;
    return 0;
  }

  bucket.count += 1;
  if (bucket.count >= LOGIN_FAIL_MAX_ATTEMPTS) {
    bucket.lockUntil = ts + LOGIN_FAIL_LOCK_MS;
    return LOGIN_FAIL_LOCK_MS;
  }
  return 0;
}

export function clearLoginFailures(email: string, ip: string) {
  failBuckets.delete(lockKey(email, ip));
}

const EMAIL_PREFIX = (email: string) => `${email.trim().toLowerCase()}|`;

/**
 * 按邮箱聚合登录失败锁状态（跨 IP），供管理端列表只读展示。
 * 注意：锁存在进程内 Map，多实例部署下仅反映本进程视角。
 */
export function getLoginFailureAggregateForEmail(email: string): {
  locked: boolean;
  remainingMsMax: number;
} {
  const prefix = EMAIL_PREFIX(email);
  const ts = now();
  let remainingMsMax = 0;
  let locked = false;

  for (const [key, bucket] of failBuckets) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    if (bucket.lockUntil <= 0) {
      continue;
    }
    const remain = bucket.lockUntil - ts;
    if (remain > 0) {
      locked = true;
      if (remain > remainingMsMax) {
        remainingMsMax = remain;
      }
    }
  }

  return { locked, remainingMsMax };
}

