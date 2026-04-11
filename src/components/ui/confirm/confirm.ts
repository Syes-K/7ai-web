import { getConfirm } from "./registry";
import type { ConfirmOptions } from "./types";

/**
 * 命令式确认框，用法类似 antd Modal.confirm，返回 Promise：
 * - `true`：用户点击确定
 * - `false`：取消、点遮罩、按 Esc
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return getConfirm()(options);
}
