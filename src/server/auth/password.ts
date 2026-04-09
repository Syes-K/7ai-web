import bcrypt from "bcryptjs";

const ROUNDS = 10;

/** 密码哈希入库 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

/** 校验密码 */
export async function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}
