"use client";

import { PageContainer } from "@ant-design/pro-components";
import { ProModulePlaceholder } from "@/components/pro-layout/ProModulePlaceholder";

export default function ConsoleAssistantsPage() {
  return (
    <PageContainer ghost title="助手管理">
      <ProModulePlaceholder
        description="个人助手与行为配置开发中。"
        emptyDescription="本模块开发中，后续将在此提供控制台能力。"
      />
    </PageContainer>
  );
}
