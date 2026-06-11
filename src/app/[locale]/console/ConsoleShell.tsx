"use client";

import { ProLayout } from "@ant-design/pro-components";
import { App, ConfigProvider } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import type { AppLocale } from "@/common/constants/i18n";
import { getAntdLocale } from "@/common/utils/antd-locale";
import { BrandMark } from "@/components/brand/BrandMark";
import { LanguageSwitcher } from "@/components/home/LanguageSwitcher";
import { UserAvatarMenu } from "@/components/user";
import { IconEmptyState } from "@/components/ui/icons";
import { ProShellHeaderTitle } from "@/components/pro-layout/ProShellHeaderTitle";
import { shellDarkTheme } from "@/components/theme/shell-dark-theme";
import { Link, usePathname } from "@/i18n/navigation";
import { getConsoleMenuRoutes } from "./console-menu";
import { ConsoleForbiddenNotice } from "./ConsoleForbiddenNotice";

const headerActionLinkClass =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm outline-none ring-cyan-400/80 transition hover:bg-white/10 focus-visible:ring-2";

export default function ConsoleShell({
  children,
  displayName,
}: {
  children: React.ReactNode;
  displayName: string;
}) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const t = useTranslations("page.console.shell");
  const [collapsed, setCollapsed] = useState(false);

  const menuRoutes = useMemo(() => getConsoleMenuRoutes(t), [t]);

  const title = t("title");

  return (
    <ConfigProvider locale={getAntdLocale(locale)} theme={shellDarkTheme}>
      <App>
        <a
          href="#console-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-cyan-400 focus:px-3 focus:py-2 focus:text-black"
        >
          {t("skipToMain")}
        </a>
        <ProLayout
          title={title}
          logo={<BrandMark wordmarkClassName="!text-sm" />}
          headerTitleRender={(logo, _titleDom, props) =>
            props.collapsed ? (
              logo
            ) : (
              <div className="flex min-w-0 items-center gap-3">
                {logo}
                <ProShellHeaderTitle>{title}</ProShellHeaderTitle>
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
            routes: menuRoutes,
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
            <LanguageSwitcher
              key="lang"
              namespace="page.console.shell"
              variant="shell"
            />,
            <Link
              key="chat"
              href="/chat"
              className={`${headerActionLinkClass} text-cyan-400/90 hover:text-cyan-300`}
            >
              <IconEmptyState className="h-4 w-4 shrink-0 text-current" />
              {t("chatLink")}
            </Link>,
            <UserAvatarMenu key="user" variant="shell" displayName={displayName} />,
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
