#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [
    '--experimental-strip-types',
    '--no-warnings',
    path.join(__dirname, 'verify-levels-runner.ts'),
], { stdio: 'inherit', cwd: path.join(__dirname, '..') });

process.exit(r.status === null ? 1 : r.status);
