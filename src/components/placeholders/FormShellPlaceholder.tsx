/**
 * 登录表单外观占位：输入框与按钮不可提交、不可编辑（readOnly / disabled）。
 */
export function FormShellPlaceholder() {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      aria-label="登录表单占位"
    >
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          账号（占位）
          <input
            readOnly
            disabled
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
            defaultValue="未启用"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          密码（占位）
          <input
            readOnly
            disabled
            type="password"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
            defaultValue="******"
          />
        </label>
        <button
          type="button"
          disabled
          className="w-full rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
        >
          登录（未启用）
        </button>
      </div>
    </div>
  );
}
