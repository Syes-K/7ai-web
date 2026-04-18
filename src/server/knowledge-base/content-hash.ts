import crypto from "crypto";

export function computeKnowledgeBaseContentHash(contentFormat: string, content: string): string {
  const h = crypto.createHash("sha256");
  h.update(String(contentFormat));
  h.update("\n");
  h.update(content);
  return h.digest("hex");
}

