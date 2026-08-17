import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const caseOnlyMode = process.env.JIUXUANGE_CASE_ONLY === 'true';
const caseOnlyAliases: Record<string, string> = caseOnlyMode
  ? {
      '@/components/openmaic-app-providers':
        './components/jiuxuange/case-only/noop-app-providers.tsx',
      '@/components/openmaic-home-page': './components/jiuxuange/case-only/noop-openmaic-home.tsx',
    }
  : {};

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR?.trim() || '.next',
  env: {
    JIUXUANGE_BUILD_COMMIT_REF: process.env.COMMIT_REF ?? '',
  },
  turbopack: {
    root: projectRoot,
    resolveAlias: caseOnlyAliases,
  },
  output: process.env.VERCEL || process.env.NETLIFY ? undefined : 'standalone',
  transpilePackages: ['mathml2omml', 'pptxgenjs', '@openmaic/importer'],
  // These agent packages do a runtime `import(specifier)` with a computed
  // specifier (to lazily load node:fs/os/path without breaking browser/Vite
  // builds). webpack can't statically analyze that and bundling it throws
  // "Cannot find module as expression is too dynamic" at runtime on the server
  // (the "Edit with AI" Pro-mode path), which broke the #619 keep-alive e2e.
  // Mark them server-external so Next loads them natively and the dynamic
  // import resolves as a real Node call.
  serverExternalPackages: ['@earendil-works/pi-ai', '@earendil-works/pi-agent-core'],
  experimental: {
    proxyClientMaxBodySize: '200mb',
  },
  async headers() {
    const extraAncestors = process.env.ALLOWED_FRAME_ANCESTORS?.trim();
    const frameAncestors = extraAncestors ? `'self' ${extraAncestors}` : "'self'";

    return [
      {
        source: '/(.*)',
        headers: [
          // X-Frame-Options only supports SAMEORIGIN (no allow-list),
          // so we omit it when custom ancestors are configured.
          ...(!extraAncestors ? [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }] : []),
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
      // Static public assets: cache for a day at the browser instead of
      // revalidating (default max-age=0) on every page load.
      ...['/avatars/:path*', '/logos/:path*', '/vendor/:path*'].map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      })),
      {
        source:
          '/:file(jiuxuange-maic-mark\\.png|logo-horizontal\\.png|openmaic-mark\\.png|favicon\\.ico)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },
};

export default nextConfig;
