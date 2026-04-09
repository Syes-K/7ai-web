import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 0.0.1：仅静态占位；后续若接入原生模块再按需调整 serverExternalPackages */
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
