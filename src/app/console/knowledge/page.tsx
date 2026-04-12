"use client";

import { PageContainer } from "@ant-design/pro-components";
import { ProModulePlaceholder } from "@/components/pro-layout/ProModulePlaceholder";

export default function ConsoleKnowledgePage() {
  return (
    <PageContainer ghost title="知识库管理">
      <ProModulePlaceholder
        description="知识库与文档管理开发中。"
        emptyDescription="本模块开发中，后续将在此提供控制台能力。"
      />
    </PageContainer>
  );
}
