"use client";

import { LogoutOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import type { DropdownProps } from "antd";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { UserAvatar } from "./UserAvatar";

/** 与 ProLayout 顶栏 `headerActionLinkClass` 一致，仅头像时无昵称行 */
const TRIGGER_CLASS =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-white/80 outline-none ring-cyan-400/80 transition hover:bg-white/10 focus-visible:ring-2";

/** 首页登出后通知侧栏同步会话（见 PunkHomeHeader） */
export const USER_SESSION_ENDED_EVENT = "7ai:session-ended";

export type UserAvatarMenuVariant = "shell" | "home";

export type UserAvatarMenuProps = {
  displayName: string;
  /** `shell`：控制台 / 管理后台顶栏；`home`：站点首页顶栏 */
  variant?: UserAvatarMenuVariant;
  placement?: DropdownProps["placement"];
};

/**
 * 顶栏用户区：下拉（退出登录）+ 首字母头像 + 昵称；登出与按钮样式均在组件内处理。
 */
export function UserAvatarMenu({
  displayName,
  variant = "shell",
  placement = "bottomRight",
}: UserAvatarMenuProps) {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    if (variant === "home") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(USER_SESSION_ENDED_EVENT));
      }
      router.refresh();
      return;
    }
    router.replace("/login");
  }, [router, variant]);

  return (
    <Dropdown
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
      placement={placement}
    >
      <button
        type="button"
        className={TRIGGER_CLASS}
        aria-label={displayName ? `用户菜单：${displayName}` : "用户菜单"}
      >
        <UserAvatar displayName={displayName} size="sm" />
      </button>
    </Dropdown>
  );
}
