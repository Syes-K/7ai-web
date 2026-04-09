import { EmptyStateCard } from "@/components/placeholders/EmptyStateCard";
import { FormShellPlaceholder } from "@/components/placeholders/FormShellPlaceholder";
import { PageShell } from "@/components/placeholders/PageShell";

/**
 * 登录页：默认 RSC，服务端渲染静态占位（表单不可提交）。
 */
export default function LoginPage() {
  return (
    <PageShell title="登录">
      <FormShellPlaceholder />
      <EmptyStateCard>
        登录页占位中：认证流程与表单校验暂未启用。
      </EmptyStateCard>
    </PageShell>
  );
}
