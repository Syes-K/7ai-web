"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CaptchaField, type CaptchaLabels } from "./CaptchaField";
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
  const t = useTranslations("page.login");
  const router = useRouter();
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

  const [email, setEmail] = useState(() => t("testAccount.email"));
  const [password, setPassword] = useState("test1234");
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
            data.error?.message ?? t("errors.loginFailed"),
          ),
        );
        return;
      }
      const next = data.redirectUrl ?? "/";
      router.push(next);
      router.refresh();
    } catch {
      setErrors({ general: t("errors.networkRetry") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <label className="block text-sm font-medium text-[#9AA3B2]">
        {t("form.email.label")}
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
        {t("form.password.label")}
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
          labels={captchaLabels}
        />
      </div>

      <FieldError message={errors.general} />

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-[#00E5FF] text-sm font-semibold text-[#050608] shadow-[0_0_24px_rgba(0,229,255,0.25)] transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? t("form.submitting") : t("form.submit")}
      </button>

      <p className="text-center text-xs text-[#7E8796]">
        {t("testAccount.intro")}{" "}
        <a
          href={`mailto:${t("testAccount.adminEmail")}`}
          className="text-[#78A9B2] hover:underline"
        >
          {t("testAccount.adminEmail")}
        </a>
      </p>
    </form>
  );
}
