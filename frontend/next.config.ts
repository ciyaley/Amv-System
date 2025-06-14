import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Performance Optimizations */
  
  // ✅ ESLint warnings only for production build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // ✅ TypeScript error handling
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Experimental features for performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@headlessui/react'],
  },

  // Turbo configuration (moved from experimental)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Bundle optimization
  webpack: (config, { isServer }) => {
    // Bundle analyzer in development
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: isServer ? 'server-bundle-report.html' : 'client-bundle-report.html',
        })
      );
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './'),
    };

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },

  // Compression
  compress: true,
  
  // Headers for caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

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
