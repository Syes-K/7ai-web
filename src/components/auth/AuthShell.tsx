"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { LanguageSwitcher } from "@/components/home/LanguageSwitcher";

type AuthNamespace = "page.login" | "page.register";

type AuthShellProps = {
  namespace: AuthNamespace;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

/**
 * 赛博 & 科技黑认证页壳层（与设计令牌对齐的 Tailwind 近似实现）。
 */
export function AuthShell({ namespace, title, subtitle, children }: AuthShellProps) {
  const t = useTranslations(namespace);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#050608_0%,#0B0F14_100%)] text-[#E8EAEF]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,229,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.06)_1px,transparent_1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-[#00E5FF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#7C4DFF]/10 blur-3xl" />

      <header className="relative z-10 border-b border-white/[0.08] px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <BrandMark className="shrink-0 text-sm" />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher namespace={namespace} variant="auth" />
            <Link
              href="/"
              className="text-sm text-[#9AA3B2] hover:text-[#00E5FF]"
            >
              {t("shell.backToHome")}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-73px)] max-w-lg flex-col justify-center px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-white/[0.08] bg-[#12161F]/95 p-6 shadow-[0_24px_48px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[#E8EAEF] sm:text-[26px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-[#9AA3B2]">
              {subtitle}
            </p>
          ) : null}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
