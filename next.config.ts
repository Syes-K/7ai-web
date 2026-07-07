import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "pg", "typeorm"],
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

export default withNextIntl(nextConfig);
