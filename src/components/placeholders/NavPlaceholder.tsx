"use client";

import Link from "next/link";

const links = [
  { href: "/", label: "首页" },
  { href: "/login", label: "登录" },
  { href: "/register", label: "注册" },
  { href: "/chat", label: "对话" },
  { href: "/console", label: "控制台" },
] as const;

/**
 * 顶部导航占位：仅静态链接，无鉴权与路由守卫逻辑。
 */
export function NavPlaceholder() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <div className="text-sm font-semibold text-slate-900">7ai-web</div>
        <nav className="flex flex-wrap gap-4 text-sm text-slate-600">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-1 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
