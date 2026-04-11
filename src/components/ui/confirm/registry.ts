import type { ConfirmShowFn } from "./types";

let showImpl: ConfirmShowFn | null = null;

export function registerConfirm(fn: ConfirmShowFn | null) {
  showImpl = fn;
}

export function getConfirm(): ConfirmShowFn {
  if (!showImpl) {
    throw new Error(
      "[confirm] 未挂载 ConfirmProvider。请在根 layout 中包裹 <ConfirmProvider>。",
    );
  }
  return showImpl;
}
