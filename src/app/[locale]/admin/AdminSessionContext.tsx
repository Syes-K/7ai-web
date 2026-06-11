"use client";

import { createContext, useContext } from "react";

type AdminSessionValue = {
  /** 当前登录用户 ID（供 users 页自操作禁用等） */
  userId: string;
};

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

/** 由 layout 注入当前管理员会话上下文 */
export function AdminSessionProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  return (
    <AdminSessionContext.Provider value={{ userId }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession must be used within AdminSessionProvider");
  }
  return ctx;
}
