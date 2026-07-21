// Applied to every route. A full default-src CSP is a deliberate non-goal for
// now — Next.js inline bootstrap scripts would need nonces, and the assess form
// calls third-party geo APIs (Open-Meteo, Overpass mirrors) from the browser.
// The directives below are the subset that can't break anything: no framing
// (clickjacking), no plugins, no <base> hijack, forms post same-origin only.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  async redirects() {
    return [
      // /marketplace was renamed to /personnel — permanent redirect so old links resolve
      { source: "/marketplace", destination: "/personnel", permanent: true },
    ]
  },
}

export default nextConfig
