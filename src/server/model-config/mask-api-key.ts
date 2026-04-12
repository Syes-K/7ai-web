/** 列表/详情展示用掩码（不暴露真实长度时可统一短占位）。 */
export function maskApiKey(plain: string): string {
  const t = plain.trim();
  if (t.length <= 8) {
    return "********";
  }
  return `${t.slice(0, 4)}••••••${t.slice(-4)}`;
}
