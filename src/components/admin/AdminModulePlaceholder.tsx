"use client";

import { Empty, Typography } from "antd";

type Props = {
  description: string;
};

/**
 * 管理后台模块占位：深色内容区，不复用站点浅底 EmptyStateCard。
 * 模块标题由 PageContainer 提供。
 */
export function AdminModulePlaceholder({ description }: Props) {
  return (
    <div className="admin-module-placeholder rounded-lg border border-[#2a2a36] bg-[#14141c]/80 px-6 py-12">
      <Typography.Paragraph type="secondary" className="!mb-8 max-w-xl">
        {description}
      </Typography.Paragraph>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="本模块开发中，后续将提供系统管理能力。"
      />
    </div>
  );
}
