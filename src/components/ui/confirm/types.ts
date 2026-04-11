import type { ReactNode } from "react";

export type ConfirmOptions = {
  /** 标题，缺省为「确认操作」 */
  title?: ReactNode;
  /** 正文说明 */
  content: ReactNode;
  okText?: string;
  cancelText?: string;
  /** 主按钮使用危险色（删除、清空等） */
  okDanger?: boolean;
};

export type ConfirmShowFn = (options: ConfirmOptions) => Promise<boolean>;
