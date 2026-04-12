"use client";

import { PageContainer } from "@ant-design/pro-components";
import { ProModulePlaceholder } from "@/components/pro-layout/ProModulePlaceholder";

export default function ConsoleModelsPage() {
  return (
    <PageContainer ghost title="模型管理">
      <ProModulePlaceholder
        description="模型选择与能力配置开发中。"
        emptyDescription="本模块开发中，后续将在此提供控制台能力。"
      />
    </PageContainer>
  );
}
