import { spawnSync } from 'node:child_process';
import { requireTestDatabaseUrl } from '../prisma/test-database-url';

const databaseUrl = requireTestDatabaseUrl();
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  SEED_PASSWORD: process.env.SEED_PASSWORD || 'LocalDevOnly_ChangeBeforeSharing',
};

for (const args of [
  ['exec', 'prisma', 'migrate', 'deploy'],
  ['exec', 'tsx', 'prisma/seed.ts'],
]) {
  const result = spawnSync('pnpm', args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
