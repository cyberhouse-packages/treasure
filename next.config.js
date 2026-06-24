/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Erlaubt große Audio-Uploads über Server Actions falls genutzt; der
  // eigentliche Audio-Upload läuft jedoch direkt per presigned URL zum Storage.
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

module.exports = nextConfig;
