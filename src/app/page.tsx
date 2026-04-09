import { EmptyStateCard } from "@/components/placeholders/EmptyStateCard";
import { ModuleBlockPlaceholder } from "@/components/placeholders/ModuleBlockPlaceholder";
import { PageShell } from "@/components/placeholders/PageShell";

/**
 * 首页：默认 RSC，服务端渲染静态占位。
 */
export default function HomePage() {
  return (
    <PageShell title="首页">
      <EmptyStateCard>
        首页占位中：功能模块将在后续迭代中逐步接入。
      </EmptyStateCard>
      <div className="grid gap-3 sm:grid-cols-3">
        <ModuleBlockPlaceholder label="模块占位 1" />
        <ModuleBlockPlaceholder label="模块占位 2" />
        <ModuleBlockPlaceholder label="模块占位 3" />
      </div>
    </PageShell>
  );
}
