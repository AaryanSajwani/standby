/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // /marketplace was renamed to /personnel — permanent redirect so old links resolve
      { source: "/marketplace", destination: "/personnel", permanent: true },
    ]
  },
}

export default nextConfig
