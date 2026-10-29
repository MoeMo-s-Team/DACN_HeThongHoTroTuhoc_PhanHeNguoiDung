const { cpSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const source = join(__dirname, '../src/ai/schemas');
const target = join(__dirname, '../dist/ai/schemas');
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
