"use client";

import { PageContainer } from "@ant-design/pro-components";
import { AdminModulePlaceholder } from "@/components/admin/AdminModulePlaceholder";

export default function AdminPromptsPage() {
  return (
    <PageContainer ghost title="提示词管理">
      <AdminModulePlaceholder description="提示词与模板管理开发中。" />
    </PageContainer>
  );
}
