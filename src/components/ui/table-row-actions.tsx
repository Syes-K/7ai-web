import { Children, isValidElement, type ReactNode } from "react";

type TableRowActionsProps = {
  children: ReactNode;
  /** 不换行（需配合足够列宽） */
  nowrap?: boolean;
  /** 固定两排：前两项第一排，其余第二排（用于无图标长文案操作列） */
  twoRows?: boolean;
};

/** ProTable 行内操作组：按钮间距 16px，大于单按钮内图标与文字间距 */
export function TableRowActions({
  children,
  nowrap = false,
  twoRows = false,
}: TableRowActionsProps) {
  const items = Children.toArray(children).filter(isValidElement);

  if (twoRows && items.length > 1) {
    return (
      <div className="flex flex-col gap-y-1">
        <div className="flex flex-nowrap items-center gap-x-4">{items.slice(0, 2)}</div>
        {items.length > 2 ? (
          <div className="flex flex-nowrap items-center gap-x-4">{items.slice(2)}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-x-4 gap-y-1 ${nowrap ? "flex-nowrap" : "flex-wrap"}`}
    >
      {children}
    </div>
  );
}

/** link 操作按钮：图标与文字 4px（antd 默认 8px，易与组间距混淆） */
export const TABLE_ACTION_BTN_CLASS =
  "px-0 !h-auto [&_.ant-btn-icon+span]:!ms-1 [&_.ant-btn-icon]:!me-0";
