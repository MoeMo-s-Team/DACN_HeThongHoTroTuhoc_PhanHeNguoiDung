import { spawnSync } from 'node:child_process';
import { requireTestDatabaseUrl } from '../prisma/test-database-url';

const databaseUrl = requireTestDatabaseUrl();
const env = {
  ...process.env,
  DEVELOPMENT_DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL: databaseUrl,
};

for (const args of [
  ['exec', 'prisma', 'migrate', 'deploy'],
  ['exec', 'jest', '--runInBand', '--config', 'jest.integration.config.ts'],
]) {
  const result = spawnSync('pnpm', args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
