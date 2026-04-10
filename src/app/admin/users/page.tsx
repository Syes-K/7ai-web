"use client";

import { PageContainer } from "@ant-design/pro-components";
import { AdminModulePlaceholder } from "@/components/admin/AdminModulePlaceholder";

export default function AdminUsersPage() {
  return (
    <PageContainer ghost title="用户管理">
      <AdminModulePlaceholder description="用户与权限管理开发中。" />
    </PageContainer>
  );
}
