"use client";

import { LogoutOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons";
import { ProLayout } from "@ant-design/pro-components";
import { App, Avatar, ConfigProvider, Dropdown } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import type { PublicUser } from "@/common/types";
import { BrandMark } from "@/components/brand/BrandMark";
import { IconEmptyState } from "@/components/ui/icons";
import { ProShellHeaderTitle } from "@/components/pro-layout/ProShellHeaderTitle";
import { shellDarkTheme } from "@/components/theme/shell-dark-theme";
import { consoleMenuRoutes } from "./console-menu";
import { ConsoleForbiddenNotice } from "./ConsoleForbiddenNotice";

dayjs.locale("zh-cn");

function loginRedirectTarget(): string {
  if (typeof window === "undefined") {
    return "/console/profile";
  }
  const { pathname, search } = window.location;
  return `${pathname}${search}` || "/console/profile";
}

const headerActionLinkClass =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm outline-none ring-cyan-400/80 transition hover:bg-white/10 focus-visible:ring-2";

const consoleHeaderTitleText = "控制台";

export default function ConsoleShell({
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

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
  }, [router]);

  const onMenuHeaderClick = useCallback(() => {
    router.push("/console/profile");
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
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <ConfigProvider locale={zhCN} theme={shellDarkTheme}>
      <App>
        <a
          href="#console-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-cyan-400 focus:px-3 focus:py-2 focus:text-black"
        >
          跳到主要内容
        </a>
        <ProLayout
          title={consoleHeaderTitleText}
          logo={
            <BrandMark withLink={false} wordmarkClassName="!text-sm" />
          }
          headerTitleRender={(logo, _titleDom, props) =>
            props.collapsed ? (
              logo
            ) : (
              <div className="flex min-w-0 items-center gap-3">
                {logo}
                <ProShellHeaderTitle>{consoleHeaderTitleText}</ProShellHeaderTitle>
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
            path: "/console",
            routes: consoleMenuRoutes,
          }}
          location={{ pathname }}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          onMenuHeaderClick={onMenuHeaderClick}
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
            <Dropdown
              key="user"
              menu={{
                items: [
                  {
                    key: "logout",
                    icon: <LogoutOutlined />,
                    label: "退出登录",
                    onClick: () => void handleLogout(),
                  },
                ],
              }}
              placement="bottomRight"
            >
              <button
                type="button"
                className={`${headerActionLinkClass} text-white/80`}
                aria-label="用户菜单"
              >
                <Avatar
                  size="small"
                  style={{ backgroundColor: "rgba(34, 211, 238, 0.25)" }}
                >
                  {initial}
                </Avatar>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {displayName}
                </span>
                <UserOutlined className="text-white/50 sm:hidden" />
              </button>
            </Dropdown>,
          ]}
          contentStyle={{
            background: "#0a0a0f",
            padding: "16px 24px",
            minHeight: "calc(100vh - 56px)",
          }}
        >
          <main id="console-main" tabIndex={-1}>
            <Suspense fallback={null}>
              <ConsoleForbiddenNotice />
            </Suspense>
            {children}
          </main>
        </ProLayout>
      </App>
    </ConfigProvider>
  );
}
