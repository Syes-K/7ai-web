import type { ReactNode } from "react";

/**
 * ProLayout `title` 顶栏文案：字号略小于侧栏 BrandMark（`!text-sm`），避免抢视觉。
 */
export function ProShellHeaderTitle({ children }: { children: ReactNode }) {
  return (
    <span className="!text-xs font-medium leading-tight tracking-tight text-white/65">
      {children}
    </span>
  );
}
