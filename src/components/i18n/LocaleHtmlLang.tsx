"use client";

import { useEffect } from "react";

/** 首页 locale 路由下同步根节点 `html lang`（非 locale 页面仍用根 layout 默认值） */
export function LocaleHtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
