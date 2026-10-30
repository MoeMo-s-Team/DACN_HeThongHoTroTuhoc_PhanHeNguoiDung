import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contracts = join(root, 'packages/contracts');
const tracked = {
  openapi: join(contracts, 'openapi.json'),
  types: join(contracts, 'src/generated/openapi.ts'),
};
const mode = process.argv[2];
if (!['generate', 'check'].includes(mode)) {
  throw new Error('Usage: node scripts/contracts.mjs <generate|check>');
}

function generate(directory) {
  const openapi = join(directory, 'openapi.json');
  const types = join(directory, 'openapi.ts');
  execFileSync('pnpm', ['--filter', '@dacn/api', 'exec', 'tsx', 'scripts/generate-openapi.ts', openapi], {
    cwd: root,
    stdio: 'inherit',
  });
  execFileSync('pnpm', ['exec', 'openapi-typescript', openapi, '--output', types], {
    cwd: root,
    stdio: 'inherit',
  });
  return { openapi, types };
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'dacn-contracts-'));
try {
  const fresh = generate(temporaryDirectory);
  if (mode === 'generate') {
    mkdirSync(dirname(tracked.types), { recursive: true });
    copyFileSync(fresh.openapi, tracked.openapi);
    copyFileSync(fresh.types, tracked.types);
    console.log('Generated OpenAPI snapshot and TypeScript transport types.');
  } else if (mode === 'check') {
    let stale = false;
    for (const [name, path] of Object.entries(tracked)) {
      if (!existsSync(path) || !readFileSync(path).equals(readFileSync(fresh[name]))) {
        console.error(`${path.slice(root.length + 1)} is stale; run pnpm contracts:generate`);
        stale = true;
      }
    }
    if (stale) process.exitCode = 1;
    else console.log('OpenAPI snapshot and generated TypeScript are up to date.');
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
