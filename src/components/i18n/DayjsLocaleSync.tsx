"use client";

import dayjs from "dayjs";
import { useEffect } from "react";
import type { AppLocale } from "@/common/constants/i18n";
import { getDayjsLocaleName } from "@/common/utils/antd-locale";

export function DayjsLocaleSync({ locale }: { locale: AppLocale }) {
  useEffect(() => {
    const name = getDayjsLocaleName(locale);
    if (name === "zh-cn") {
      void import("dayjs/locale/zh-cn").then(() => {
        dayjs.locale("zh-cn");
      });
    } else {
      dayjs.locale("en");
    }
  }, [locale]);

  return null;
}
