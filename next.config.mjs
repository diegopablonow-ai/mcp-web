// @ts-check
import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  // -------------------------------------------------------------------------
  // React Compiler requires babel-plugin-react-compiler to be installed.
  // Keep it disabled until the dependency is added intentionally.
  // -------------------------------------------------------------------------
  reactCompiler: false,

  // -------------------------------------------------------------------------
  // Turbopack
  // -------------------------------------------------------------------------
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  // -------------------------------------------------------------------------
  // Cache Components
  // -------------------------------------------------------------------------
  cacheComponents: true,

  // -------------------------------------------------------------------------
  // Security headers
  //
  // Applied to every route. CSP connect-src includes *.sentry.io so the
  // Sentry browser SDK can send events. Tighten script-src and connect-src
  // to match your actual domains before deploying to production.
  // -------------------------------------------------------------------------
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevents clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevents MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Forces HTTPS for 1 year, including subdomains
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Controls referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restricts browser features
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Content Security Policy — tighten script-src / connect-src for production.
          // 'unsafe-inline' on style-src is required for Tailwind CSS-in-JS;
          // 'unsafe-eval' on script-src is required by some Next.js dev tooling
          // and should be removed in production if your stack allows it.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",       // remove unsafe-inline in prod if possible
              "style-src 'self' 'unsafe-inline'",        // required for Tailwind
              "img-src 'self' data: blob:",
              "font-src 'self'",
              // *.sentry.io is required for the Sentry browser SDK tunnel endpoint.
              "connect-src 'self' https://api.mcp-builder.com https://*.sentry.io",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

// ── Sentry build-time configuration ────────────────────────────────────────
// withSentryConfig wraps the Next.js config to:
//   • Upload source maps to Sentry at build time (SENTRY_AUTH_TOKEN required
//     in CI/Vercel — add as a secret, never commit it).
//   • Tree-shake Sentry from client bundles when SENTRY_DSN is absent
//     (safe for local dev and CI — no events will be sent).
//   • Add the /monitoring Sentry tunnel route so browser events bypass
//     ad-blockers that block *.sentry.io directly.
//
// Full option reference: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
// ---------------------------------------------------------------------------
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in CI / production builds where SENTRY_AUTH_TOKEN
  // is present. Local dev skips upload silently.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI, // suppress output outside CI

  // Hides source maps from the browser bundle (they are uploaded to Sentry).
  hideSourceMaps: true,

  // Disable automatic instrumentation of Server Components / Route Handlers
  // that Sentry enables by default — opt in explicitly per-route instead.
  // Set to false to re-enable auto-wrapping.
  autoInstrumentServerFunctions: false,

  // Tunnel Sentry browser requests through /monitoring to avoid ad-blockers.
  tunnelRoute: "/monitoring",

  // Disable the default Sentry CLI wizard prompt during builds.
  disableLogger: true,
})
