"use client";

import { Empty, Typography } from "antd";

type Props = {
  description: string;
  /** Empty 副文案；管理后台与控制台可分别传入。 */
  emptyDescription?: string;
};

/**
 * ProLayout 内容区模块占位（深色底），供 `/admin`、`/console` 等复用。
 * 模块标题由外层 `PageContainer` 提供。
 */
export function ProModulePlaceholder({
  description,
  emptyDescription = "本模块开发中，敬请期待。",
}: Props) {
  return (
    <div className="pro-module-placeholder rounded-lg border border-[#2a2a36] bg-[#14141c]/80 px-6 py-12">
      <Typography.Paragraph type="secondary" className="!mb-8 max-w-xl">
        {description}
      </Typography.Paragraph>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={emptyDescription}
      />
    </div>
  );
}
