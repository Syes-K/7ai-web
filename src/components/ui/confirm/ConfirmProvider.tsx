"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { registerConfirm } from "./registry";
import type { ConfirmOptions } from "./types";

type Pending = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const titleId = useId();
  const descId = useId();
  const okRef = useRef<HTMLButtonElement>(null);
  const prevActive = useRef<HTMLElement | null>(null);

  const show = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  useEffect(() => {
    registerConfirm(show);
    return () => registerConfirm(null);
  }, [show]);

  const close = useCallback((value: boolean) => {
    setPending((p) => {
      if (p) {
        p.resolve(value);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) {
      return;
    }
    prevActive.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => okRef.current?.focus(), 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      prevActive.current?.focus?.();
    };
  }, [pending, close]);

  const modal =
    pending &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 pt-[clamp(3rem,14vh,8rem)]"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
          aria-label="关闭"
          onClick={() => close(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="relative z-10 w-full max-w-md rounded-xl border border-cyan-500/25 bg-zinc-950/95 p-5 shadow-[0_0_48px_-12px_rgba(34,211,238,0.35)]"
        >
          <h2
            id={titleId}
            className="font-mono text-base font-medium text-cyan-100/95"
          >
            {pending.options.title ?? "确认操作"}
          </h2>
          <div
            id={descId}
            className="mt-3 text-sm leading-relaxed text-zinc-400"
          >
            {pending.options.content}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-600 bg-zinc-900/90 px-4 py-2 font-mono text-sm text-zinc-200 transition hover:bg-zinc-800"
              onClick={() => close(false)}
            >
              {pending.options.cancelText ?? "取消"}
            </button>
            <button
              ref={okRef}
              type="button"
              className={`rounded-lg px-4 py-2 font-mono text-sm text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 ${
                pending.options.okDanger
                  ? "border border-rose-500/40 bg-rose-600/85 hover:bg-rose-500/90 focus:ring-rose-400/60"
                  : "border border-cyan-500/40 bg-cyan-600/80 hover:bg-cyan-500/85 focus:ring-cyan-400/50"
              }`}
              onClick={() => close(true)}
            >
              {pending.options.okText ?? "确定"}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {children}
      {modal}
    </>
  );
}
