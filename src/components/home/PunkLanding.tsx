import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PunkHomeHeader } from "./PunkHomeHeader";
import "./punk-home.css";

const FEATURE_KEYS = ["01", "02", "03", "04"] as const;

const FEATURE_INDEX_COLORS: Record<(typeof FEATURE_KEYS)[number], string> = {
  "01": "text-cyan-500/90",
  "02": "text-fuchsia-500/90",
  "03": "text-emerald-500/90",
  "04": "text-violet-400/90",
};

export async function PunkLanding() {
  const locale = await getLocale();
  const isEn = locale === "en";
  const t = await getTranslations("page.home");

  return (
    <div
      className={`punk-landing relative isolate min-h-[100dvh] overflow-hidden bg-[#030208] text-zinc-100${isEn ? " punk-landing-en" : ""}`}
    >
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

      <div
        className="punk-glitch-bg-flash-layer pointer-events-none absolute inset-0 z-[1] mix-blend-screen"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% 38%, rgba(34,211,238,0.42), transparent 55%), radial-gradient(ellipse 70% 45% at 62% 52%, rgba(232,121,249,0.32), transparent 50%)",
        }}
      />

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

      <main className="relative z-10 flex min-h-[calc(100dvh-56px)] flex-col px-4 pb-6 pt-4 sm:px-6 sm:pb-8">
        <div className="flex flex-1 flex-col items-center justify-center py-4 sm:py-6">
          <p
            className={`punk-tag-breathe mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/35 bg-fuchsia-950/30 px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-fuchsia-200/90 sm:text-xs${isEn ? " punk-hero-tag" : ""}`}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#e879f9]" />
            {t("hero.tag")}
          </p>

          <div className="relative mx-auto max-w-4xl text-center">
            <h1
              className={`punk-hero-title relative z-10 font-sans font-black leading-[1.05] tracking-tight text-4xl sm:text-6xl md:text-7xl${isEn ? " sm:text-5xl md:text-6xl lg:text-7xl" : ""}`}
            >
              <span
                className="punk-glitch-layer absolute inset-0 -z-10 bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-cyan-400 bg-clip-text font-black text-transparent opacity-40 blur-[1px] sm:blur-[1.5px]"
                aria-hidden
              >
                {t("hero.title")}
              </span>
              <span className="bg-gradient-to-br from-white via-cyan-100 to-zinc-400 bg-clip-text text-transparent">
                {t("hero.title")}
              </span>
            </h1>
            <p className="punk-hero-subtitle mt-3 font-mono text-sm text-cyan-500/80 sm:text-base md:text-lg">
              {t("hero.subtitle")}
            </p>
          </div>

          <p className="punk-hero-desc mx-auto mt-6 max-w-xl text-center font-mono text-[11px] tracking-[0.06em] text-zinc-500/65 sm:text-xs">
            {t("hero.description")}
          </p>

          <div className="mt-10 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center">
            <Link
              href="/chat"
              className="punk-cta punk-cta-glow inline-flex min-w-[200px] items-center justify-center border border-cyan-400/50 bg-cyan-950/40 px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200 transition hover:border-cyan-300 hover:text-white"
            >
              {t("cta.chat")}
            </Link>
            <Link
              href="/console/profile"
              className="punk-cta inline-flex min-w-[200px] items-center justify-center border border-zinc-600 bg-zinc-950/50 px-8 py-3.5 font-mono text-sm uppercase tracking-[0.15em] text-zinc-300 transition hover:border-fuchsia-500/50 hover:text-fuchsia-200"
            >
              {t("cta.console")}
            </Link>
          </div>
        </div>

        <ul className="punk-feature-grid mx-auto mt-auto w-full max-w-3xl shrink-0 grid grid-cols-1 gap-3 font-mono text-[11px] text-zinc-500 sm:grid-cols-2 sm:text-xs lg:grid-cols-4">
          {FEATURE_KEYS.map((key) => (
            <li
              key={key}
              className="punk-feature-item rounded border border-zinc-800/80 bg-black/40 px-4 py-3 text-left"
            >
              <span className={FEATURE_INDEX_COLORS[key]}>[{key}]</span> {t(`features.${key}`)}
            </li>
          ))}
        </ul>
      </main>

      <footer className="relative z-20 border-t border-zinc-800/50 bg-black/40 px-4 py-4 text-center font-mono text-[10px] text-zinc-600 sm:text-xs">
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-3">
          <span className="text-zinc-500">{t("footer.sysLine")}</span>
          <a
            href={`mailto:${t("footer.email")}`}
            className="text-zinc-500 transition hover:text-cyan-300"
          >
            {t("footer.emailLabel")}&nbsp;
            {t("footer.email")}
          </a>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-500 transition hover:text-cyan-300"
          >
            {t("footer.icp")}
          </a>
        </div>
      </footer>
    </div>
  );
}
