import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "7ai-web",
  description: "0.0.1 静态占位",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
