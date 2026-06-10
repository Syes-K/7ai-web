"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isAppLocale,
  type AppLocale,
} from "@/common/constants/i18n";

/** 非 [locale] 路由树内读取 NEXT_LOCALE cookie（如 /console） */
export function useCookieAppLocale(): AppLocale {
  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
    const value = match?.[1];
    setLocale(value && isAppLocale(value) ? value : DEFAULT_LOCALE);
  }, []);

  return locale;
}
