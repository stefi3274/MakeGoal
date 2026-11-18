import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les pages.
const entetes = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

// Politique de contenu : scripts limités à notre site, Google Analytics et Cloudflare Turnstile ;
// objets et iframes tiers interdits ; formulaires et <base> limités au site. Images/médias/connexions
// ouverts en HTTPS car les vidéos et posts chargent des photos et écussons externes.
const dev = process.env.NODE_ENV !== 'production';
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (dev ? " 'unsafe-eval'" : '') + ' https://www.googletagmanager.com https://challenges.cloudflare.com',
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' blob: https: wss:",
  'frame-src https://challenges.cloudflare.com',
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/:path*', headers: entetes },
      // Pages et API sensibles : jamais mises en cache, jamais indexées.
      ...['/admin/:path*', '/caisse/:path*', '/api/caisse-:path*'].map(source => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ];
  },
};

export default nextConfig;
