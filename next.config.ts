import type { NextConfig } from "next";
import { execSync } from "child_process";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const commitSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return (process.env.VERCEL_GIT_COMMIT_SHA ?? '').substring(0, 7);
  }
})();

const version = (() => {
  // Fetch tags first — Vercel uses shallow clones that lack them
  try { execSync('git fetch --tags --quiet', { stdio: 'ignore' }); } catch {}
  try {
    const tag = execSync('git tag --points-at HEAD').toString().trim();
    return tag.split('\n')[0] || '';
  } catch {
    return '';
  }
})();

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha,
    NEXT_PUBLIC_VERSION: version,
  },
};

export default withNextIntl(nextConfig);
