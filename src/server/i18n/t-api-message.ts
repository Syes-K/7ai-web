/**
 * 服务端 API 错误文案翻译：静态加载 messages/{locale}/api/message.json，
 * 经 use-intl createTranslator 支持 ICU（如 authLoginLocked plural）。
 * Edge 兼容（无 Node fs），middleware 与 Route Handler 共用。
 */
import { createTranslator } from "use-intl/core";
import type { AppLocale } from "@/common/constants/i18n";
import enApiMessage from "../../../messages/en/api/message.json";
import zhApiMessage from "../../../messages/zh/api/message.json";

type ApiMessageParams = Record<string, string | number | Date>;

type ApiTranslator = (key: string, params?: ApiMessageParams) => string;

const translators: Record<AppLocale, ApiTranslator> = {
  en: createTranslator({ locale: "en", messages: enApiMessage }) as ApiTranslator,
  zh: createTranslator({ locale: "zh", messages: zhApiMessage }) as ApiTranslator,
};

/**
 * 读取 api.message 命名空间下 key 的译文。
 * @param key - 点分 key，如 "validation.invalidEmail"
 * @param params - ICU 参数，如 { minutes: 5 }
 */
export function tApiMessage(
  locale: AppLocale,
  key: string,
  params?: ApiMessageParams,
): string {
  const t = translators[locale];
  if (params) {
    return t(key, params);
  }
  return t(key);
}
