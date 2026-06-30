"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CaptchaField, type CaptchaLabels } from "./CaptchaField";
import { FieldError } from "./FieldError";
import {
  mapRegisterApiError,
  type RegisterFieldErrors,
} from "./map-api-errors";
import { navigateAfterAuth } from "./navigate-after-auth";

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
  const t = useTranslations("page.register");
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") ?? "";

  const captchaLabels: CaptchaLabels = useMemo(
    () => ({
      label: t("captcha.label"),
      placeholder: t("captcha.placeholder"),
      refresh: t("captcha.refresh"),
      loading: t("captcha.loading"),
      empty: t("captcha.empty"),
      imageAlt: t("captcha.imageAlt"),
      loadFailed: t("captcha.loadFailed"),
      networkRetry: t("errors.networkRetry"),
    }),
    [t],
  );

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
            data.error?.message ?? t("errors.registerFailed"),
          ),
        );
        return;
      }
      setSuccess(t("form.success"));
      redirectTimerRef.current = window.setTimeout(() => {
        navigateAfterAuth(data.redirectUrl);
      }, 2000);
    } catch {
      setErrors({ general: t("errors.networkRetry") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <label className="block text-sm font-medium text-[#9AA3B2]">
        {t("form.email.label")} <span className="text-[#FF5C7A]">*</span>
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
        {t("form.telNo.label")}
        <input
          type="tel"
          name="telNo"
          inputMode="numeric"
          autoComplete="tel"
          placeholder={t("form.telNo.placeholder")}
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
        {t("form.nickName.label")} <span className="text-[#FF5C7A]">*</span>
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
        {t("form.password.label")} <span className="text-[#FF5C7A]">*</span>
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
        {t("form.passwordConfirm.label")} <span className="text-[#FF5C7A]">*</span>
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
          labels={captchaLabels}
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
        {success
          ? t("form.redirecting")
          : loading
            ? t("form.submitting")
            : t("form.submit")}
      </button>

      <p className="text-center text-sm text-[#9AA3B2]">
        {t("form.hasAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-[#00E5FF] hover:underline"
        >
          {t("form.signInLink")}
        </Link>
      </p>
    </form>
  );
}
