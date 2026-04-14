"use client";

import { ProLayout } from "@ant-design/pro-components";
import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PublicUser } from "@/common/types";
import { BrandMark } from "@/components/brand/BrandMark";
import { UserAvatarMenu } from "@/components/user";
import { IconConfig, IconEmptyState } from "@/components/ui/icons";
import { ProShellHeaderTitle } from "@/components/pro-layout/ProShellHeaderTitle";
import { adminMenuRoutes } from "./admin-menu";
import { shellDarkTheme } from "@/components/theme/shell-dark-theme";

dayjs.locale("zh-cn");

function loginRedirectTarget(): string {
  if (typeof window === "undefined") {
    return "/admin";
  }
  const { pathname, search } = window.location;
  return `${pathname}${search}` || "/admin";
}

const headerActionLinkClass =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm outline-none ring-cyan-400/80 transition hover:bg-white/10 focus-visible:ring-2";

const adminHeaderTitleText = "管理后台";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (cancelled) {
        return;
      }
      if (res.status === 401) {
        const q = encodeURIComponent(loginRedirectTarget());
        router.replace(`/login?redirect=${q}`);
        return;
      }
      const data = (await res.json()) as { user?: PublicUser };
      if (cancelled) {
        return;
      }
      if (data.user) {
        setUser(data.user);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready || !user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-white/65"
        style={{ background: "#0a0a0f" }}
      >
        验证会话…
      </div>
    );
  }

  const displayName = user.nickName?.trim() || user.email;

  return (
    <ConfigProvider locale={zhCN} theme={shellDarkTheme}>
      <App>
        <a
          href="#admin-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-cyan-400 focus:px-3 focus:py-2 focus:text-black"
        >
          跳到主要内容
        </a>
        <ProLayout
          title={adminHeaderTitleText}
          logo={
            <BrandMark wordmarkClassName="!text-sm" />
          }
          headerTitleRender={(logo, _titleDom, props) =>
            props.collapsed ? (
              logo
            ) : (
              <div className="flex min-w-0 items-center gap-3">
                {logo}
                <ProShellHeaderTitle>{adminHeaderTitleText}</ProShellHeaderTitle>
              </div>
            )
          }
          layout="mix"
          fixedHeader
          fixSiderbar
          siderWidth={256}
          breakpoint="lg"
          splitMenus={false}
          route={{
            path: "/admin",
            routes: adminMenuRoutes,
          }}
          location={{ pathname }}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          menuFooterRender={() => null}
          footerRender={false}
          menuItemRender={(item, dom) =>
            item.path ? <Link href={item.path}>{dom}</Link> : dom
          }
          actionsRender={() => [
            <Link
              key="chat"
              href="/chat"
              className={`${headerActionLinkClass} text-cyan-400/90 hover:text-cyan-300`}
            >
              <IconEmptyState className="h-4 w-4 shrink-0 text-current" />
              对话
            </Link>,
            <Link
              key="console"
              href="/console"
              className={`${headerActionLinkClass} text-white/80 hover:text-white`}
            >
              <IconConfig className="h-4 w-4 shrink-0 text-current" />
              控制台
            </Link>,
            <UserAvatarMenu key="user" displayName={displayName} />,
          ]}
          contentStyle={{
            background: "#0a0a0f",
            padding: "16px 24px",
            minHeight: "calc(100vh - 56px)",
          }}
        >
          <main id="admin-main" tabIndex={-1}>
            {children}
          </main>
        </ProLayout>
      </App>
    </ConfigProvider>
  );
}
