"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/common/constants/i18n";
import { usePathname, useRouter } from "@/i18n/navigation";

const headerActionLinkClass =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm outline-none ring-cyan-400/80 transition hover:bg-white/10 focus-visible:ring-2";

const OTHER_LOCALE: Record<AppLocale, AppLocale> = {
  en: "zh",
  zh: "en",
};

type AuthNamespace = "page.login" | "page.register";
type HomeNamespace = "page.home";
type SwitcherNamespace = HomeNamespace | AuthNamespace;

type LanguageSwitcherProps = {
  /** next-intl 命名空间，默认 page.home */
  namespace?: SwitcherNamespace;
  /** 首页默认样式；认证页使用 auth 次要色 */
  variant?: "home" | "auth";
};

export function LanguageSwitcher({
  namespace = "page.home",
  variant = "home",
}: LanguageSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations(namespace);
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const otherLocale = OTHER_LOCALE[locale];

  const triggerFullLabel =
    locale === "en" ? t("langSwitcher.label.en") : t("langSwitcher.label.zh");
  const triggerShortLabel =
    locale === "en" ? t("langSwitcher.label.enShort") : t("langSwitcher.label.zhShort");
  const optionLabel =
    otherLocale === "en" ? t("langSwitcher.label.en") : t("langSwitcher.label.zh");

  const triggerClass =
    variant === "auth"
      ? `${headerActionLinkClass} font-mono text-[#9AA3B2] hover:text-[#00E5FF]`
      : `${headerActionLinkClass} font-mono text-zinc-300/90 hover:text-cyan-200/90`;

  const close = useCallback(() => setOpen(false), []);

  const switchLocale = useCallback(
    (target: AppLocale) => {
      if (target === locale || busy) {
        return;
      }
      setBusy(true);
      close();
      router.replace(pathname, { locale: target });
      window.setTimeout(() => setBusy(false), 300);
    },
    [busy, close, locale, pathname, router],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [close, open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        className={triggerClass}
        aria-label={t("langSwitcher.ariaLabel")}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-busy={busy}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            close();
          }
        }}
      >
        <span className="hidden sm:inline">{triggerFullLabel}</span>
        <span className="sm:hidden">{triggerShortLabel}</span>
        <svg
          className={`h-3.5 w-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t("langSwitcher.ariaLabel")}
          className="absolute right-0 z-30 mt-1 min-w-[8.5rem] rounded-md border border-cyan-500/20 bg-zinc-950/95 py-1 shadow-lg backdrop-blur-md"
        >
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="block w-full px-3 py-2 text-left font-mono text-sm text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-100 focus-visible:bg-cyan-500/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-400/50"
              onClick={() => switchLocale(otherLocale)}
            >
              {optionLabel}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
