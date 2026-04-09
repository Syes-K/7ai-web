"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CaptchaField } from "./CaptchaField";
import { FieldError } from "./FieldError";
import {
  mapRegisterApiError,
  type RegisterFieldErrors,
} from "./map-api-errors";

const inputBase =
  "mt-1.5 h-11 w-full rounded-lg border px-3 text-[#E8EAEF] outline-none focus:ring-2 focus:ring-[rgba(0,245,255,0.25)]";
const inputNormal =
  "border-white/[0.12] bg-[#151A24] focus:border-[rgba(0,245,255,0.45)]";
const inputError =
  "border-[#FF5C7A]/55 bg-[#151A24] focus:border-[#FF5C7A]/55";

/**
 * 注册表单：错误就近展示在各字段下
 */
export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") ?? "";

  const redirectTimerRef = useRef<number | null>(null);

  const [email, setEmail] = useState("");
  const [telNo, setTelNo] = useState("");
  const [nickName, setNickName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          nickName,
          password,
          passwordConfirm,
          telNo: telNo.trim() === "" ? null : telNo.trim(),
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
          mapRegisterApiError(
            data.error?.code,
            data.error?.message ?? "注册失败",
          ),
        );
        return;
      }
      setSuccess("注册成功，正在跳转…");
      const next = data.redirectUrl ?? "/";
      redirectTimerRef.current = window.setTimeout(() => {
        router.push(next);
        router.refresh();
      }, 2000);
    } catch {
      setErrors({ general: "网络异常，请重试" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <label className="block text-sm font-medium text-[#9AA3B2]">
        邮箱 <span className="text-[#FF5C7A]">*</span>
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
          disabled={loading || Boolean(success)}
          aria-invalid={Boolean(errors.email)}
          className={`${inputBase} ${errors.email ? inputError : inputNormal}`}
        />
        <FieldError message={errors.email} />
      </label>

      <label className="block text-sm font-medium text-[#9AA3B2]">
        手机号（可选）
        <input
          type="tel"
          name="telNo"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="11 位数字，可留空"
          value={telNo}
          onChange={(e) => {
            setTelNo(e.target.value.replace(/\D/g, "").slice(0, 11));
            setErrors((prev) => ({ ...prev, telNo: undefined }));
          }}
          disabled={loading || Boolean(success)}
          aria-invalid={Boolean(errors.telNo)}
          className={`${inputBase} ${errors.telNo ? inputError : inputNormal}`}
        />
        <FieldError message={errors.telNo} />
      </label>

      <label className="block text-sm font-medium text-[#9AA3B2]">
        昵称 <span className="text-[#FF5C7A]">*</span>
        <input
          type="text"
          name="nickName"
          autoComplete="nickname"
          required
          value={nickName}
          onChange={(e) => {
            setNickName(e.target.value);
            setErrors((prev) => ({ ...prev, nickName: undefined }));
          }}
          disabled={loading || Boolean(success)}
          aria-invalid={Boolean(errors.nickName)}
          className={`${inputBase} ${errors.nickName ? inputError : inputNormal}`}
        />
        <FieldError message={errors.nickName} />
      </label>

      <label className="block text-sm font-medium text-[#9AA3B2]">
        密码 <span className="text-[#FF5C7A]">*</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          disabled={loading || Boolean(success)}
          aria-invalid={Boolean(errors.password)}
          className={`${inputBase} ${errors.password ? inputError : inputNormal}`}
        />
        <FieldError message={errors.password} />
      </label>

      <label className="block text-sm font-medium text-[#9AA3B2]">
        确认密码 <span className="text-[#FF5C7A]">*</span>
        <input
          type="password"
          name="passwordConfirm"
          autoComplete="new-password"
          required
          value={passwordConfirm}
          onChange={(e) => {
            setPasswordConfirm(e.target.value);
            setErrors((prev) => ({ ...prev, passwordConfirm: undefined }));
          }}
          disabled={loading || Boolean(success)}
          aria-invalid={Boolean(errors.passwordConfirm)}
          className={`${inputBase} ${errors.passwordConfirm ? inputError : inputNormal}`}
        />
        <FieldError message={errors.passwordConfirm} />
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
          disabled={loading || Boolean(success)}
          serverError={errors.captcha}
        />
      </div>

      <FieldError message={errors.general} />
      {success ? (
        <p className="text-sm text-[#3EE08F]" role="status">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || Boolean(success)}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-[#00E5FF] text-sm font-semibold text-[#050608] shadow-[0_0_24px_rgba(0,229,255,0.25)] transition hover:brightness-110 disabled:opacity-60"
      >
        {success ? "即将跳转…" : loading ? "提交中…" : "注册"}
      </button>

      <p className="text-center text-sm text-[#9AA3B2]">
        已有账号？{" "}
        <Link
          href="/login"
          className="font-medium text-[#00E5FF] hover:underline"
        >
          登录
        </Link>
      </p>
    </form>
  );
}
