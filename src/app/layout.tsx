import type { Metadata } from "next";
import { ConfirmProvider } from "@/components/ui/confirm";
import "./globals.css";

export const metadata: Metadata = {
  title: "7ai-web",
  description: "0.0.1 静态占位",
  icons: {
    /** 显式声明：仅写 `apple` 时可能覆盖 Next 对 `app/icon` 的合并，导致缺少 rel=icon */
    icon: [
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      {
        url: "/apple-touch-icon.svg",
        type: "image/svg+xml",
        sizes: "180x180",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
