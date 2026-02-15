import type { NextConfig } from "next";
import { execSync } from "child_process";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const commitSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return '';
  }
})();

const version = (() => {
  try {
    return execSync('git describe --tags --exact-match HEAD 2>/dev/null').toString().trim();
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
