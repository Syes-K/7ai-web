"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CaptchaField } from "./CaptchaField";
import { FieldError } from "./FieldError";
import {
  mapLoginApiError,
  type LoginFieldErrors,
} from "./map-api-errors";

const inputBase =
  "mt-1.5 h-11 w-full rounded-lg border px-3 text-[#E8EAEF] outline-none focus:ring-2 focus:ring-[rgba(0,245,255,0.25)]";
const inputNormal =
  "border-white/[0.12] bg-[#151A24] focus:border-[rgba(0,245,255,0.45)]";
const inputError =
  "border-[#FF5C7A]/55 bg-[#151A24] focus:border-[#FF5C7A]/55";

/**
 * 登录表单：邮箱 + 密码 + 图形验证码（错误就近展示）
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          captchaId,
          captcha,
          redirect: redirectParam || undefined,
        }),
      });
      const data = (await res.json()) as {
        redirectUrl?: string;
        error?: { code?: string; message?: string };
      };
      if (!res.ok) {
        setErrors(
          mapLoginApiError(
            data.error?.code,
            data.error?.message ?? "登录失败",
          ),
        );
        return;
      }
      const next = data.redirectUrl ?? "/";
      router.push(next);
      router.refresh();
    } catch {
      setErrors({ general: "网络异常，请重试" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <label className="block text-sm font-medium text-[#9AA3B2]">
        邮箱
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          disabled={loading}
          aria-invalid={Boolean(errors.email)}
          className={`${inputBase} ${errors.email ? inputError : inputNormal}`}
        />
        <FieldError message={errors.email} />
      </label>

      <label className="block text-sm font-medium text-[#9AA3B2]">
        密码
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          disabled={loading}
          aria-invalid={Boolean(errors.password)}
          className={`${inputBase} ${errors.password ? inputError : inputNormal}`}
        />
        <FieldError message={errors.password} />
      </label>

      <div>
        <CaptchaField
          captchaId={captchaId}
          onCaptchaIdChange={(id) => {
            setCaptchaId(id);
            setErrors((prev) => ({ ...prev, captcha: undefined }));
          }}
          value={captcha}
          onValueChange={(v) => {
            setCaptcha(v);
            setErrors((prev) => ({ ...prev, captcha: undefined }));
          }}
          disabled={loading}
          serverError={errors.captcha}
        />
      </div>

      <FieldError message={errors.general} />

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-[#00E5FF] text-sm font-semibold text-[#050608] shadow-[0_0_24px_rgba(0,229,255,0.25)] transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "登录中…" : "登录"}
      </button>

      <p className="text-center text-sm text-[#9AA3B2]">
        没有账号？{" "}
        <Link
          href="/register"
          className="font-medium text-[#00E5FF] hover:underline"
        >
          注册
        </Link>
      </p>
    </form>
  );
}
