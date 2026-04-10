"use client";

import { PageContainer } from "@ant-design/pro-components";
import { AdminModulePlaceholder } from "@/components/admin/AdminModulePlaceholder";

export default function AdminConfigPage() {
  return (
    <PageContainer ghost title="配置管理">
      <AdminModulePlaceholder description="系统级配置能力开发中。" />
    </PageContainer>
  );
}
