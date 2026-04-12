import Link from "next/link";

type BrandMarkProps = {
  className?: string;
  /**
   * 加在「7AI·CLUB」词标上的类。
   * 在 ProLayout 侧栏内若需控制字号，请使用 `!text-sm` 等带 `!` 的 Tailwind 类，避免被 antd 对 `.ant-pro-sider-logo a` 等的字号规则覆盖。
   */
  wordmarkClassName?: string;
  /** 第二行说明，如「系统管理」「个人与业务」（用于 ProLayout 侧栏）。 */
  subtitle?: string;
  /**
   * 为 `false` 时不使用 `Link`，词标为纯展示（由外层如 ProLayout `onMenuHeaderClick` 处理导航）。
   * @default true
   */
  withLink?: boolean;
};

function WordmarkText() {
  return (
    <>
      <span className="text-fuchsia-400/90">7AI</span>
      <span className="text-zinc-500">·</span>
      <span className="text-cyan-400/90">CLUB</span>
    </>
  );
}

export function BrandMark({
  className = "",
  wordmarkClassName = "",
  subtitle,
  withLink = true,
}: BrandMarkProps) {
  const ringOffsetClass = subtitle
    ? "focus-visible:ring-offset-[#14141c]"
    : "focus-visible:ring-offset-[#050508]";

  const markClass = [
    "inline-block font-mono tracking-widest outline-none transition",
    withLink ? `hover:opacity-90 focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2 ${ringOffsetClass}` : "",
    wordmarkClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = <WordmarkText />;

  if (subtitle) {
    return (
      <span
        className={`flex flex-col items-start leading-tight ${className}`.trim()}
      >
        {withLink ? (
          <Link href="/" className={markClass}>
            {inner}
          </Link>
        ) : (
          <span className={markClass}>{inner}</span>
        )}
        <span className="text-[11px] text-white/45">{subtitle}</span>
      </span>
    );
  }

  const fullMarkClass = `${markClass} ${className}`.trim();

  return withLink ? (
    <Link href="/" className={fullMarkClass}>
      {inner}
    </Link>
  ) : (
    <span className={fullMarkClass}>{inner}</span>
  );
}
