"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CaptchaFieldProps = {
  /** 父组件提交用 */
  captchaId: string;
  onCaptchaIdChange: (id: string) => void;
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  /** 提交后服务端校验失败等，展示在输入框下方 */
  serverError?: string;
};

/**
 * 图形验证码：加载 / 刷新 GET /api/auth/captcha
 */
export function CaptchaField({
  captchaId,
  onCaptchaIdChange,
  value,
  onValueChange,
  disabled,
  serverError,
}: CaptchaFieldProps) {
  const [imageSrc, setImageSrc] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  /** 父组件每次渲染会传入新的函数引用，若放进 useCallback/useEffect 依赖会导致反复请求 */
  const onCaptchaIdChangeRef = useRef(onCaptchaIdChange);
  const onValueChangeRef = useRef(onValueChange);
  onCaptchaIdChangeRef.current = onCaptchaIdChange;
  onValueChangeRef.current = onValueChange;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/auth/captcha");
      const data = (await res.json()) as {
        captchaId?: string;
        imageBase64?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        setLoadError(data.error?.message ?? "验证码加载失败");
        return;
      }
      if (data.captchaId && data.imageBase64) {
        onCaptchaIdChangeRef.current(data.captchaId);
        setImageSrc(data.imageBase64);
        onValueChangeRef.current("");
      }
    } catch {
      setLoadError("网络异常，请重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="overflow-hidden rounded-lg border border-white/[0.12] bg-[#151A24]">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt="图形验证码"
              width={120}
              height={44}
              className="block h-11 w-[120px] object-cover"
            />
          ) : (
            <div className="flex h-11 w-[120px] items-center justify-center text-xs text-[#5C6570]">
              {loading ? "加载中…" : "—"}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={disabled || loading}
          className="rounded-lg border border-[#00E5FF]/40 bg-transparent px-3 py-2 text-sm text-[#00E5FF] transition hover:bg-[#00E5FF]/10 disabled:opacity-50"
        >
          刷新
        </button>
      </div>
      <label className="block text-sm font-medium text-[#9AA3B2]">
        验证码
        <input
          type="text"
          name="captcha"
          autoComplete="off"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled || !captchaId}
          placeholder="不区分大小写"
          aria-invalid={Boolean(serverError)}
          className={`mt-1.5 h-11 w-full rounded-lg border bg-[#151A24] px-3 text-[#E8EAEF] outline-none ring-0 placeholder:text-[#5C6570] focus:ring-2 focus:ring-[rgba(0,245,255,0.25)] ${
            serverError
              ? "border-[#FF5C7A]/55 focus:border-[#FF5C7A]/55"
              : "border-white/[0.12] focus:border-[rgba(0,245,255,0.45)]"
          }`}
        />
      </label>
      {serverError ? (
        <p className="text-sm text-[#FF5C7A]" role="alert">
          {serverError}
        </p>
      ) : null}
      {loadError ? (
        <p className="text-sm text-[#FF5C7A]" role="alert">
          {loadError}
        </p>
      ) : null}
    </div>
  );
}
