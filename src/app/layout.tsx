import type { Metadata } from "next";
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
    <html lang="en">
      <head>
        {/* 慢网时 layout.css / antd CSS-in-JS 可能晚于 HTML：内联最小可读样式，避免衬线字体 + 白屏 */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                margin: 0;
                min-height: 100%;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                -webkit-font-smoothing: antialiased;
              }
              .console-app-root, .admin-app-root,
              .console-app-root .ant-pro-layout-content,
              .admin-app-root .ant-pro-layout-content {
                background-color: #0a0a0f;
                color: rgba(255, 255, 255, 0.88);
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
