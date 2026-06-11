"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SUPPORTED_LOCALES, type AppLocale } from "@/common/constants/i18n";
import {
  HEADER_ACTION_BUTTON_CLASS,
} from "@/components/layout/header-action-link";
import { usePathname, useRouter } from "@/i18n/navigation";

type AuthNamespace = "page.login" | "page.register";
type HomeNamespace = "page.home";
type ChatNamespace = "page.chat";
type ConsoleShellNamespace = "page.console.shell";
type AdminShellNamespace = "page.admin.shell";
type SwitcherNamespace =
  | HomeNamespace
  | AuthNamespace
  | ChatNamespace
  | ConsoleShellNamespace
  | AdminShellNamespace;

type LanguageSwitcherProps = {
  /** next-intl 命名空间，默认 page.home */
  namespace?: SwitcherNamespace;
  /** 首页默认样式；认证页 / Chat 顶栏使用次要色 */
  variant?: "home" | "auth" | "shell";
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

  const triggerFullLabel =
    locale === "en" ? t("langSwitcher.label.en") : t("langSwitcher.label.zh");
  const triggerShortLabel =
    locale === "en" ? t("langSwitcher.label.enShort") : t("langSwitcher.label.zhShort");

  const triggerClass =
    variant === "auth"
      ? `${HEADER_ACTION_BUTTON_CLASS} font-mono text-[#9AA3B2] hover:text-[#00E5FF]`
      : variant === "shell"
        ? `${HEADER_ACTION_BUTTON_CLASS} font-mono text-zinc-400/90 hover:text-cyan-200/90`
        : `${HEADER_ACTION_BUTTON_CLASS} font-mono text-zinc-300/90 hover:text-cyan-200/90`;

  const close = useCallback(() => setOpen(false), []);

  const switchLocale = useCallback(
    (target: AppLocale) => {
      if (busy) {
        return;
      }
      close();
      if (target === locale) {
        return;
      }
      setBusy(true);
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
    <div ref={containerRef} className="relative flex h-8 shrink-0 items-center">
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
          className="absolute right-0 top-full z-30 mt-1 min-w-[8.5rem] rounded-md border border-cyan-500/20 bg-zinc-950/95 py-1 shadow-lg backdrop-blur-md"
        >
          {SUPPORTED_LOCALES.map((target) => {
            const selected = target === locale;
            return (
              <li key={target} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`block w-full px-3 py-2 text-left font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-400/50 ${
                    selected
                      ? "cursor-default bg-cyan-500/15 text-cyan-100"
                      : "text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-100 focus-visible:bg-cyan-500/15"
                  }`}
                  onClick={() => switchLocale(target)}
                >
                  {t(`langSwitcher.label.${target}`)}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
