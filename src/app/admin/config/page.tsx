"use client";

import { PageContainer } from "@ant-design/pro-components";
import { ProModulePlaceholder } from "@/components/pro-layout/ProModulePlaceholder";

export default function AdminConfigPage() {
  return (
    <PageContainer ghost title="配置管理">
      <ProModulePlaceholder
        description="系统级配置能力开发中。"
        emptyDescription="本模块开发中，后续将提供系统管理能力。"
      />
    </PageContainer>
  );
}
