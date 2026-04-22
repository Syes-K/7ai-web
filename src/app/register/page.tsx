import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getCurrentUser } from "@/server/auth/session-user";
import { isAdminEmail } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "注册 | 7ai-web",
  description: "注册账号",
};

/**
 * 注册页：邮箱必填，手机号可选
 */
export default async function RegisterPage() {
  await gateRegisterPage();
  return (
    <AuthShell title="注册账号">
      <Suspense
        fallback={
          <p className="text-center text-sm text-[#9AA3B2]">加载中…</p>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}

async function gateRegisterPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/register");
  }
  if (!isAdminEmail(user.email)) {
    redirect("/login");
  }
}
