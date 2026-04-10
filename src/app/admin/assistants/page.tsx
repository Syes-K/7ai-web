"use client";

import { PageContainer } from "@ant-design/pro-components";
import { AdminModulePlaceholder } from "@/components/admin/AdminModulePlaceholder";

export default function AdminAssistantsPage() {
  return (
    <PageContainer ghost title="系统助手管理">
      <AdminModulePlaceholder description="系统助手配置开发中。" />
    </PageContainer>
  );
}
