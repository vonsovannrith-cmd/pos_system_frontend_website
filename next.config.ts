
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin(
  "./src/i18n/request.ts"
);

const nextConfig: NextConfig = {
  output: "standalone",

  async rewrites() {
    const backend =
      process.env.BACKEND_URL ?? "http://localhost:8080";

    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
