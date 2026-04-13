"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
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

  return (
    <>
      {children}
      <ModalShell
        open={!!pending}
        onClose={() => close(false)}
        title={pending?.options.title ?? "确认操作"}
        titleId={titleId}
        describedBy={descId}
        initialFocusRef={okRef}
        footer={
          pending ? (
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-600 bg-zinc-900/90 px-4 py-2 font-mono text-sm text-zinc-200 transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0"
                onClick={() => close(false)}
              >
                {pending.options.cancelText ?? "取消"}
              </button>
              <button
                ref={okRef}
                type="button"
                className={`rounded-lg px-4 py-2 font-mono text-sm text-white shadow-lg transition focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-0 ${
                  pending.options.okDanger
                    ? "border border-rose-500/40 bg-rose-600/85 hover:bg-rose-500/90 focus-visible:ring-rose-300/35"
                    : "border border-cyan-500/40 bg-cyan-600/80 hover:bg-cyan-500/85 focus-visible:ring-cyan-300/35"
                }`}
                onClick={() => close(true)}
              >
                {pending.options.okText ?? "确定"}
              </button>
            </div>
          ) : null
        }
      >
        {pending ? (
          <div
            id={descId}
            className="mt-3 text-sm leading-relaxed text-zinc-400"
          >
            {pending.options.content}
          </div>
        ) : null}
      </ModalShell>
    </>
  );
}
