import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 82], // Tambahkan 82 di sini
    // ... konfigurasi gambar lainnya jika ada (seperti remotePatterns)
  },
};

export default nextConfig;
