import { defineConfig, devices } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.example' });
process.env.SEED_PASSWORD ||= 'LocalDevOnly_ChangeBeforeSharing';
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required for E2E tests');
const apiEnv = {
  ...process.env,
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  JWT_ACCESS_SECRET: randomBytes(32).toString('base64'),
  FRONTEND_ORIGIN: 'http://127.0.0.1:3100',
};

export default defineConfig({
  testDir: './e2e',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3100' },
  webServer: [
    {
      command: 'pnpm --filter @dacn/api dev',
      url: 'http://127.0.0.1:3101/api/v1/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: apiEnv,
    },
    {
      command: 'pnpm dev',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3101/api/v1' },
    },
  ],
});
