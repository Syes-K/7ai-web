"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** 用于 aria-labelledby；不传则内部生成 */
  titleId?: string;
  /** 正文区域的 id，供 aria-describedby */
  describedBy?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** 打开时优先聚焦（与确认框主按钮一致） */
  initialFocusRef?: RefObject<HTMLElement | null>;
  maxWidthClass?: string;
  /** 追加到对话框面板（如 max-h、flex 纵向分区） */
  panelClassName?: string;
  /**
   * 若设置，将 children 包在此容器内（位于标题与 footer 之间），
   * 便于正文区 `min-h-0` + 内部滚动而标题/底栏固定。
   */
  bodyClassName?: string;
};

/**
 * 与删除会话等 confirm 弹层一致的外壳：顶偏移、遮罩、边框与阴影。
 * 内容由 children / footer 传入。
 */
export function ModalShell({
  open,
  onClose,
  title,
  titleId: titleIdProp,
  describedBy,
  children,
  footer,
  initialFocusRef,
  maxWidthClass = "max-w-md",
  panelClassName,
  bodyClassName,
}: ModalShellProps) {
  const genTitleId = useId();
  const titleId = titleIdProp ?? genTitleId;
  const prevActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevActive.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      initialFocusRef?.current?.focus();
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      prevActive.current?.focus?.();
    };
  }, [open, onClose, initialFocusRef]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const a11yDesc = describedBy
    ? ({ "aria-describedby": describedBy } as const)
    : {};

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 pt-[clamp(3rem,14vh,8rem)]"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label="关闭"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...a11yDesc}
        className={`relative z-10 w-full ${maxWidthClass} rounded-xl border border-cyan-500/25 bg-zinc-950/95 p-5 shadow-[0_0_48px_-12px_rgba(34,211,238,0.35)] ${panelClassName ?? ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id={titleId}
          className="shrink-0 min-w-0 font-mono text-base font-medium text-cyan-100/95"
        >
          {title}
        </h2>
        {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
