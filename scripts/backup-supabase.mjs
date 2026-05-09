#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const outDir = process.env.BACKUP_DIR || './backups';
if (!databaseUrl) { console.error('SUPABASE_DB_URL or DATABASE_URL is required'); process.exit(1); }
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const file = join(outDir, `maitri-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
execFileSync('pg_dump', [databaseUrl, '--format=custom', '--no-owner', '--no-acl', '--file', file], { stdio: 'inherit' });
const data = readFileSync(file); const checksum = createHash('sha256').update(data).digest('hex'); const size = statSync(file).size;
console.log(JSON.stringify({ file: basename(file), path: file, size, checksum }, null, 2));
