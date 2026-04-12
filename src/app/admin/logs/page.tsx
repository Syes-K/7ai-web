"use client";

import { PageContainer } from "@ant-design/pro-components";
import { ProModulePlaceholder } from "@/components/pro-layout/ProModulePlaceholder";

export default function AdminLogsPage() {
  return (
    <PageContainer ghost title="日志查询">
      <ProModulePlaceholder
        description="日志检索与审计开发中。"
        emptyDescription="本模块开发中，后续将提供系统管理能力。"
      />
    </PageContainer>
  );
}
