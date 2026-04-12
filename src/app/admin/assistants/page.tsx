"use client";

import { PageContainer } from "@ant-design/pro-components";
import { ProModulePlaceholder } from "@/components/pro-layout/ProModulePlaceholder";

export default function AdminAssistantsPage() {
  return (
    <PageContainer ghost title="系统助手管理">
      <ProModulePlaceholder
        description="系统助手配置开发中。"
        emptyDescription="本模块开发中，后续将提供系统管理能力。"
      />
    </PageContainer>
  );
}
