"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * 从管理后台因非白名单跳转回控制台时展示一次性提示。
 */
export function ConsoleForbiddenNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("notice") === "admin_forbidden") {
      setVisible(true);
    }
  }, [searchParams]);

  const dismiss = useCallback(() => {
    setVisible(false);
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-500/35 bg-amber-950/40 px-4 py-3 text-sm text-amber-100/95 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p>
        当前账号不在管理后台白名单中，无法进入系统管理。如需权限请联系管理员配置{" "}
        <code className="rounded bg-amber-900/60 px-1 py-0.5 text-xs">ADMIN_USER</code>
        。
      </p>
      <div className="flex shrink-0 gap-2">
        <Link
          href={pathname}
          className="rounded-md border border-amber-500/40 px-3 py-1.5 text-amber-50 transition hover:bg-amber-500/15"
          onClick={() => setVisible(false)}
        >
          留在当前页
        </Link>
        <button
          type="button"
          onClick={() => void dismiss()}
          className="rounded-md border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-amber-50 transition hover:bg-amber-500/30"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
