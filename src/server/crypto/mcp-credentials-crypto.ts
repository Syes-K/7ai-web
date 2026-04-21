import crypto from "crypto";

const PREFIX = "v1";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

function deriveKey32(): Buffer {
  const raw = process.env.MCP_CREDENTIALS_MASTER_KEY?.trim();
  if (!raw) {
    throw new Error("MCP_CREDENTIALS_MASTER_KEY_MISSING");
  }
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {
    // fall through
  }
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

export function isMcpCredentialsMasterKeyConfigured(): boolean {
  return Boolean(process.env.MCP_CREDENTIALS_MASTER_KEY?.trim());
}

export function encryptMcpCredentials(plaintext: string): string {
  const key = deriveKey32();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: AUTH_TAG_LEN });
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, enc]);
  return `${PREFIX}:${packed.toString("base64url")}`;
}

export function decryptMcpCredentials(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  if (!ciphertext.startsWith(`${PREFIX}:`)) {
    return null;
  }
  const b64 = ciphertext.slice(PREFIX.length + 1);
  let packed: Buffer;
  try {
    packed = Buffer.from(b64, "base64url");
  } catch {
    return null;
  }
  if (packed.length < IV_LEN + AUTH_TAG_LEN + 1) return null;
  const iv = packed.subarray(0, IV_LEN);
  const tag = packed.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const enc = packed.subarray(IV_LEN + AUTH_TAG_LEN);
  try {
    const key = deriveKey32();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: AUTH_TAG_LEN });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
