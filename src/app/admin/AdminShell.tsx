"use client";

import {
  AppstoreOutlined,
  LogoutOutlined,
  MessageOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { ProLayout } from "@ant-design/pro-components";
import { App, Avatar, ConfigProvider, Dropdown } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { PublicUser } from "@/common/types";
import { adminMenuRoutes } from "./admin-menu";
import { adminTheme } from "./admin-theme";

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

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
  }, [router]);

  const onMenuHeaderClick = useCallback(() => {
    router.push("/admin/config");
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
    <ConfigProvider locale={zhCN} theme={adminTheme}>
      <App>
        <a
          href="#admin-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-cyan-400 focus:px-3 focus:py-2 focus:text-black"
        >
          跳到主要内容
        </a>
        <ProLayout
          title="管理后台"
          logo={
            <span className="flex flex-col items-start leading-tight">
              <span
                className="text-lg font-semibold tracking-tight text-cyan-400"
                style={{ lineHeight: 1.2 }}
              >
                7ai
              </span>
              <span className="text-[11px] text-white/45">系统管理</span>
            </span>
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
              <MessageOutlined />
              对话
            </Link>,
            <Link
              key="console"
              href="/console"
              className={`${headerActionLinkClass} text-white/80 hover:text-white`}
            >
              <AppstoreOutlined />
              控制台
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
          <main id="admin-main" tabIndex={-1}>
            {children}
          </main>
        </ProLayout>
      </App>
    </ConfigProvider>
  );
}
