/**
 * 界面展示用：优先昵称，否则取邮箱 @ 前前缀。
 */
export function userDisplayLabel(user: {
  nickName: string;
  email: string;
}): string {
  const nick = user.nickName?.trim();
  if (nick) {
    return nick;
  }
  const email = user.email?.trim() ?? "";
  const at = email.indexOf("@");
  if (at > 0) {
    return email.slice(0, at);
  }
  return email || "用户";
}
