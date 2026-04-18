export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** 将 cosine [-1,1] 映射到 [0,1]，便于阈值 0~1 配置。 */
export function cosineToUnitScore(cos: number): number {
  const v = (cos + 1) / 2;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

