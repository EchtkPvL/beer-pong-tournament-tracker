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

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha,
  },
};

export default withNextIntl(nextConfig);
