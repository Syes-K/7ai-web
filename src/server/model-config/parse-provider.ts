import { ModelProvider } from "@/common/enums";

const ALLOWED = new Set<string>(Object.values(ModelProvider));

export function parseModelProvider(raw: unknown): ModelProvider | null {
  if (typeof raw !== "string") {
    return null;
  }
  return ALLOWED.has(raw) ? (raw as ModelProvider) : null;
}
