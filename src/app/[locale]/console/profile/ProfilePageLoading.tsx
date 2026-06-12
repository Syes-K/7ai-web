"use client";

import { PageContainer } from "@ant-design/pro-components";
import { useTranslations } from "next-intl";
import { ProfilePageFallback } from "./ProfilePageFallback";

/** JS chunk 加载中的占位（与 ProfileClient 等待 API 时结构一致） */
export function ProfilePageLoading() {
  const t = useTranslations("page.console.profile");
  return (
    <PageContainer ghost title={t("title")}>
      <ProfilePageFallback />
    </PageContainer>
  );
}
