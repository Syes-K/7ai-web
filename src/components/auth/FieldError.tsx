/**
 * 单行字段错误提示（置于对应控件下方）
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <p className="mt-1.5 text-sm leading-snug text-[#FF5C7A]" role="alert">
      {message}
    </p>
  );
}
