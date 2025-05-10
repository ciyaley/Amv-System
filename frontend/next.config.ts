import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    // NODE_ENV==='development' のときだけ 8787 に飛ばす例
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8787/api/:path*',
        },
      ];
    }
    // 本番はリライトルールなし (同一オリジンの Workers を使う想定)
    return [];
  },
};

export default nextConfig;
