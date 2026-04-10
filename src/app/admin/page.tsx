import { redirect } from "next/navigation";

/** `/admin` 默认进入配置管理（与设计 spec §1.2 一致） */
export default function AdminIndexPage() {
  redirect("/admin/config");
}
