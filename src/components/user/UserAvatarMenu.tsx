"use client";

import { LogoutOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import type { DropdownProps } from "antd";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useCookieAppLocale } from "@/common/hooks/use-cookie-app-locale";
import { getPageShellMessages } from "@/i18n/page-shell-messages";
import { UserAvatar } from "./UserAvatar";
import { HEADER_ACTION_BUTTON_CLASS } from "@/components/layout/header-action-link";

/** 首页登出后通知侧栏同步会话（见 PunkHomeHeader） */
export const USER_SESSION_ENDED_EVENT = "7ai:session-ended";

export type UserAvatarMenuVariant = "shell" | "home";

export type UserAvatarMenuProps = {
  displayName: string;
  /** `shell`：控制台 / 管理后台顶栏；`home`：站点首页顶栏 */
  variant?: UserAvatarMenuVariant;
  placement?: DropdownProps["placement"];
  /** 首页 i18n 登出文案；shell 读 page.shell（或 cookie locale） */
  logoutLabel?: string;
  /** 触发器 aria-label */
  ariaLabel?: string;
};

/**
 * 顶栏用户区：下拉（退出登录）+ 首字母头像 + 昵称；登出与按钮样式均在组件内处理。
 */
export function UserAvatarMenu({
  displayName,
  variant = "shell",
  placement = "bottomRight",
  logoutLabel,
  ariaLabel,
}: UserAvatarMenuProps) {
  const router = useRouter();
  const cookieLocale = useCookieAppLocale();
  const shellMessages = getPageShellMessages(cookieLocale);

  const resolvedLogout =
    logoutLabel ??
    (variant === "shell" ? shellMessages.userMenu.logout : "退出登录");
  const resolvedAria =
    ariaLabel ??
    (variant === "shell"
      ? displayName
        ? shellMessages.userMenu.ariaLabelWithName.replace("{name}", displayName)
        : shellMessages.userMenu.ariaLabel
      : displayName
        ? `用户菜单：${displayName}`
        : "用户菜单");

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    if (variant === "home") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(USER_SESSION_ENDED_EVENT));
      }
      router.refresh();
      return;
    }
    router.replace(`/${cookieLocale}/login`);
  }, [router, variant, cookieLocale]);

  return (
    <Dropdown
      menu={{
        items: [
          {
            key: "logout",
            icon: <LogoutOutlined />,
            label: resolvedLogout,
            onClick: () => void handleLogout(),
          },
        ],
      }}
      placement={placement}
    >
      <button
        type="button"
        className={`${HEADER_ACTION_BUTTON_CLASS} text-white/80`}
        aria-label={resolvedAria}
      >
        <UserAvatar displayName={displayName} size="sm" />
      </button>
    </Dropdown>
  );
}
