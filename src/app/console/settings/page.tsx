import { redirect } from "next/navigation";

/** 与 `next.config` 重定向一致；保留本文件以防仅客户端路由时仍可落到 canonical。 */
export default function ConsoleSettingsRedirectPage() {
  redirect("/console/profile");
}
