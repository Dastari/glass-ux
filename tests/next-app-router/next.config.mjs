/** @type {import('next').NextConfig} */
export default {
  // The release's font preload table imports bundled fonts with Vite's ?url convention.
  // App Router can load the same assets through webpack's resource modules.
  webpack(config) {
    config.module.rules.push({
      test: /\.woff2$/,
      resourceQuery: /url/,
      type: "asset/resource",
      generator: { filename: "static/media/[name].[contenthash][ext]" },
    });
    return config;
  },
  experimental: { cpus: 2 },
};
