const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  const s = email.trim();
  return s.length <= 255 && EMAIL_RE.test(s);
}

export function isValidTelNo(tel: string): boolean {
  return /^[0-9]{11}$/.test(tel);
}

export function validatePasswordPolicy(
  password: string,
  email: string,
): string | null {
  if (password.length < 8) {
    return "密码至少 8 位";
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "密码须同时包含字母与数字";
  }
  if (password.toLowerCase() === email.trim().toLowerCase()) {
    return "密码不能与邮箱相同";
  }
  return null;
}

export function validateNickName(nick: string): string | null {
  const t = nick.trim();
  if (t.length < 1 || t.length > 32) {
    return "昵称为 1～32 个字符";
  }
  return null;
}
