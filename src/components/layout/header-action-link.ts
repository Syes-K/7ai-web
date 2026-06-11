/**
 * 顶栏操作链统一样式（首页 / Console / Admin / Chat）。
 * 固定 32px 高，避免 hover 背景溢出 header；ProLayout 自带 hover 已由 globals.css 重置。
 */
export const HEADER_ACTION_LINK_CLASS =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm leading-none outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-400/80";

/** 顶栏 `<button>` 触发器：重置原生 button 样式 */
export const HEADER_ACTION_BUTTON_CLASS = `${HEADER_ACTION_LINK_CLASS} m-0 cursor-pointer appearance-none border-0 bg-transparent`;

/** 顶栏仅图标按钮（Chat 顶栏等） */
export const HEADER_ACTION_ICON_CLASS =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-sm outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-400/80";
