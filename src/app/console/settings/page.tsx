"use client";

import { PageContainer } from "@ant-design/pro-components";
import { ProModulePlaceholder } from "@/components/pro-layout/ProModulePlaceholder";

export default function ConsoleSettingsPage() {
  return (
    <PageContainer ghost title="用户配置">
      <ProModulePlaceholder
        description="偏好与个性化设置开发中。"
        emptyDescription="本模块开发中，后续将在此提供控制台能力。"
      />
    </PageContainer>
  );
}
