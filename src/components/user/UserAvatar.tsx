type UserAvatarProps = {
  /** 用于取首字展示，通常为昵称或邮箱 */
  displayName: string;
  /** `sm` 约 24px，与原先 antd Avatar small 接近 */
  size?: "sm" | "md";
  className?: string;
};

const sizeClass: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-6 w-6 min-h-[1.5rem] min-w-[1.5rem] text-[11px]",
  md: "h-8 w-8 min-h-[2rem] min-w-[2rem] text-xs",
};

/**
 * 用户头像（首字母），非 antd Avatar，供控制台 / 管理后台 / 首页等复用。
 */
export function UserAvatar({ displayName, size = "sm", className = "" }: UserAvatarProps) {
  const initial = (displayName.trim().slice(0, 1) || "?").toUpperCase();
  return (
    <span
      className={`inline-flex select-none items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/35 to-fuchsia-600/25 font-semibold text-cyan-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-cyan-400/30 ${sizeClass[size]} ${className}`.trim()}
      aria-hidden
    >
      {initial}
    </span>
  );
}
