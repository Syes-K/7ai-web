import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "typeorm"],
  async redirects() {
    return [
      {
        source: "/console/settings",
        destination: "/console/profile",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
