/**
 * 对话区骨架占位：消息与输入区均为静态展示。
 */
export function ChatShellPlaceholder() {
  return (
    <div className="space-y-4">
      <div
        className="min-h-[200px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        aria-label="消息列表占位"
      >
        <div className="space-y-3">
          <div className="ml-auto max-w-[85%] rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
            用户消息占位
          </div>
          <div className="mr-auto max-w-[85%] rounded-2xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-600">
            助手回复占位
          </div>
        </div>
      </div>
      <div
        className="flex gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        aria-label="输入区占位"
      >
        <input
          readOnly
          disabled
          className="min-h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
          defaultValue="输入框占位（未启用）"
        />
        <button
          type="button"
          disabled
          className="rounded-lg bg-slate-200 px-4 text-sm font-medium text-slate-500"
        >
          发送
        </button>
      </div>
    </div>
  );
}
