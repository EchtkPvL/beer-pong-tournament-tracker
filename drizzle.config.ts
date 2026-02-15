import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.vercel/.env.production.local' });
config({ path: '.vercel/.env.preview.local' });
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
