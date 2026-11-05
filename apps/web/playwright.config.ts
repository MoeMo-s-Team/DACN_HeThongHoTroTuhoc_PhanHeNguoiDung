import { defineConfig, devices } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.example' });
process.env.SEED_PASSWORD ||= 'LocalDevOnly_ChangeBeforeSharing';
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required for E2E tests');
function portFromEnv(name: string, fallback: number) {
  const port = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${name} must be a valid TCP port`);
  return port;
}
const apiPort = portFromEnv('E2E_API_PORT', 3101);
const webPort = portFromEnv('E2E_WEB_PORT', 3100);
if (apiPort === webPort) throw new Error('E2E_API_PORT and E2E_WEB_PORT must be different');
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const webOrigin = `http://127.0.0.1:${webPort}`;
const apiEnv = {
  ...process.env,
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  API_PORT: String(apiPort),
  JWT_ACCESS_SECRET: randomBytes(32).toString('base64'),
  FRONTEND_ORIGIN: webOrigin,
};

export default defineConfig({
  testDir: './e2e',
  use: { ...devices['Desktop Chrome'], baseURL: webOrigin },
  webServer: [
    {
      command: 'pnpm --filter @dacn/api dev',
      url: `${apiOrigin}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: apiEnv,
    },
    {
      command: `pnpm exec next dev --hostname 0.0.0.0 --port ${webPort}`,
      url: webOrigin,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: `${apiOrigin}/api/v1` },
    },
  ],
});
