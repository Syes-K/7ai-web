"use client";

import { PageContainer } from "@ant-design/pro-components";
import { AdminModulePlaceholder } from "@/components/admin/AdminModulePlaceholder";

export default function AdminLogsPage() {
  return (
    <PageContainer ghost title="日志查询">
      <AdminModulePlaceholder description="日志检索与审计开发中。" />
    </PageContainer>
  );
}
