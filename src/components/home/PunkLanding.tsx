import Link from "next/link";
import { PunkHomeHeader } from "./PunkHomeHeader";
import "./punk-home.css";

export function PunkLanding() {
  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden bg-[#030208] text-zinc-100">
      {/* 背景层（与标题 punk-glitch-shift 同频位移） */}
      <div
        className="punk-glitch-bg-sync pointer-events-none absolute inset-0 z-0 opacity-[0.4]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 211, 238, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232, 121, 249, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
        }}
      />
      <div className="punk-glitch-bg-sync pointer-events-none absolute -left-1/4 top-0 z-0 h-[60vh] w-[70vw]">
        <div className="punk-aurora-blob h-full w-full rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>
      <div className="punk-glitch-bg-sync pointer-events-none absolute -right-1/4 bottom-0 z-0 h-[50vh] w-[60vw]">
        <div className="punk-aurora-blob h-full w-full rounded-full bg-fuchsia-600/15 blur-[100px] [animation-delay:-4s]" />
      </div>
      <div className="punk-glitch-bg-sync pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,211,238,0.12),transparent)]" />

      {/* 故障同步色闪（与标题 glitch 同时间点） */}
      <div
        className="punk-glitch-bg-flash-layer pointer-events-none absolute inset-0 z-[1] mix-blend-screen"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% 38%, rgba(34,211,238,0.42), transparent 55%), radial-gradient(ellipse 70% 45% at 62% 52%, rgba(232,121,249,0.32), transparent 50%)",
        }}
      />

      {/* 扫描线 */}
      <div
        className="pointer-events-none absolute inset-0 z-[2] overflow-hidden opacity-[0.07]"
        aria-hidden
      >
        <div
          className="punk-scan-sweep h-[40%] w-full"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(34,211,238,0.5), transparent)",
          }}
        />
      </div>

      <PunkHomeHeader />

      <main className="relative z-10 flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center px-4 pb-16 pt-10 sm:px-6">
        <p className="punk-tag-breathe mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/35 bg-fuchsia-950/30 px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-fuchsia-200/90 sm:text-xs">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#e879f9]" />
          PERSONAL · AI LEARNING
        </p>

        {/* 故障风标题 */}
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="relative z-10 font-sans text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            <span
              className="punk-glitch-layer absolute inset-0 -z-10 bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-cyan-400 bg-clip-text font-black text-transparent opacity-40 blur-[1px] sm:blur-[1.5px]"
              aria-hidden
            >
              解构智能
            </span>
            <span className="bg-gradient-to-br from-white via-cyan-100 to-zinc-400 bg-clip-text text-transparent">
              解构智能
            </span>
          </h1>
          <p className="mt-3 font-mono text-sm text-cyan-500/80 sm:text-base md:text-lg">
            DECONSTRUCT · LEARN · BREAK THINGS
          </p>
        </div>

        <p className="mx-auto mt-8 max-w-lg text-center text-sm leading-relaxed text-zinc-400 sm:text-base">
          AI实验场：模型、提示词、管线——只管玩，不管懂，不装腔，只折腾。
        </p>

        <div className="mt-12 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center">
          <Link
            href="/chat"
            className="punk-cta-glow inline-flex min-w-[200px] items-center justify-center border border-cyan-400/50 bg-cyan-950/40 px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200 transition hover:border-cyan-300 hover:text-white"
          >
            进入对话
          </Link>
          <Link
            href="/console"
            className="inline-flex min-w-[200px] items-center justify-center border border-zinc-600 bg-zinc-950/50 px-8 py-3.5 font-mono text-sm uppercase tracking-[0.15em] text-zinc-300 transition hover:border-fuchsia-500/50 hover:text-fuchsia-200"
          >
            后台控制
          </Link>
        </div>

        <ul className="mt-16 grid max-w-3xl grid-cols-1 gap-3 font-mono text-[11px] text-zinc-500 sm:grid-cols-2 sm:text-xs lg:grid-cols-4">
          <li className="rounded border border-zinc-800/80 bg-black/40 px-4 py-3 text-left">
            <span className="text-cyan-500/90">[01]</span> 流式对话 · 多模型
          </li>
          <li className="rounded border border-zinc-800/80 bg-black/40 px-4 py-3 text-left">
            <span className="text-fuchsia-500/90">[02]</span> 提示词与配置
          </li>
          <li className="rounded border border-zinc-800/80 bg-black/40 px-4 py-3 text-left">
            <span className="text-emerald-500/90">[03]</span> 知识库 · 意图路由
          </li>
          <li className="rounded border border-zinc-800/80 bg-black/40 px-4 py-3 text-left">
            <span className="text-violet-400/90">[04]</span> 助手 · 指定人设
          </li>
        </ul>
      </main>

      <footer className="relative z-20 border-t border-zinc-800/50 bg-black/40 px-4 py-4 text-center font-mono text-[10px] text-zinc-600 sm:text-xs">
        <span className="text-zinc-500">SYS://local · learning mode · no warranty</span>
      </footer>
    </div>
  );
}
