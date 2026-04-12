"use client";

import { PageContainer } from "@ant-design/pro-components";
import { ProModulePlaceholder } from "@/components/pro-layout/ProModulePlaceholder";

export default function ConsoleProfilePage() {
  return (
    <PageContainer ghost title="个人信息">
      <ProModulePlaceholder
        description="个人资料与账号信息能力开发中。"
        emptyDescription="本模块开发中，后续将在此提供控制台能力。"
      />
    </PageContainer>
  );
}
