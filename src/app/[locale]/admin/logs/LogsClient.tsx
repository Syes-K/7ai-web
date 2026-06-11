"use client";

import { PageContainer } from "@ant-design/pro-components";
import { useTranslations } from "next-intl";
import { ProModulePlaceholder } from "@/components/pro-layout/ProModulePlaceholder";

/** 日志查询占位页 */
export default function LogsClient() {
  const t = useTranslations("page.admin.logs");

  return (
    <PageContainer ghost title={t("title")}>
      <ProModulePlaceholder
        description={t("placeholder.description")}
        emptyDescription={t("placeholder.emptyDescription")}
      />
    </PageContainer>
  );
}
