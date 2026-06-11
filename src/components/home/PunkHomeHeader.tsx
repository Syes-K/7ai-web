"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PublicUser } from "@/common/types";
import { BrandMark } from "@/components/brand/BrandMark";
import { USER_SESSION_ENDED_EVENT, UserAvatarMenu } from "@/components/user";
import { IconConfig, IconEmptyState, IconLogin } from "@/components/ui/icons";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** 与 ConsoleShell / AdminShell 顶栏操作链一致（无边框） */
const headerActionLinkClass =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm outline-none ring-cyan-400/80 transition hover:bg-white/10 focus-visible:ring-2";

export function PunkHomeHeader() {
  const t = useTranslations("page.home");
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (cancelled) {
        return;
      }
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { user?: PublicUser };
      setUser(data.user ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onSessionEnded = () => setUser(null);
    window.addEventListener(USER_SESSION_ENDED_EVENT, onSessionEnded);
    return () => window.removeEventListener(USER_SESSION_ENDED_EVENT, onSessionEnded);
  }, []);

  const displayName = user ? user.nickName?.trim() || user.email : "";
  const loginRedirect = encodeURIComponent("/");

  return (
    <header className="relative z-20 box-border flex h-14 min-h-[56px] shrink-0 items-center justify-between gap-3 border-b border-cyan-500/15 bg-black/30 px-4 backdrop-blur-md">
      <BrandMark className="text-xs sm:text-sm" wordmarkClassName="!tracking-[0.35em]" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <nav
          className="flex flex-wrap items-center justify-end gap-2 sm:gap-3"
          aria-label={t("nav.ariaLabel")}
        >
          <Link
            href="/chat"
            className={`${headerActionLinkClass} text-cyan-400/90 hover:text-cyan-300`}
          >
            <IconEmptyState className="h-4 w-4 shrink-0 text-current" />
            {t("nav.chat")}
          </Link>
          <Link
            href="/console/profile"
            className={`${headerActionLinkClass} text-white/80 hover:text-white`}
          >
            <IconConfig className="h-4 w-4 shrink-0 text-current" />
            {t("nav.console")}
          </Link>
        </nav>

        <LanguageSwitcher />

        {user === undefined ? (
          <span className="inline-block h-8 w-8 shrink-0 animate-pulse rounded-full bg-zinc-800/80" aria-hidden />
        ) : user ? (
          <UserAvatarMenu
            displayName={displayName}
            variant="home"
            logoutLabel={t("userMenu.logout")}
            ariaLabel={
              displayName
                ? t("userMenu.ariaLabelWithName", { name: displayName })
                : t("userMenu.ariaLabel")
            }
          />
        ) : (
          <Link
            href={`/login?redirect=${loginRedirect}`}
            className={`${headerActionLinkClass} text-white/80 hover:text-white`}
          >
            <IconLogin className="h-4 w-4 shrink-0 text-current" />
            {t("nav.signIn")}
          </Link>
        )}
      </div>
    </header>
  );
}
