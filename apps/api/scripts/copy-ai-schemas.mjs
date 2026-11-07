import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(apiRoot, 'src', 'ai', 'schemas', 'release1');
const destination = join(apiRoot, 'dist', 'src', 'ai', 'schemas', 'release1');

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
