import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Recon workbooks are ~1.7 MB each; the default Server Action limit is 1 MB.
      // Note: the hosting platform imposes its own per-request cap (~4.5 MB on
      // Vercel), so large multi-file uploads should go one/a few at a time.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
