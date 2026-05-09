import { existsSync } from 'node:fs';
import { join } from 'node:path';

const nextBin = join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');
const nextPkg = join(process.cwd(), 'node_modules', 'next', 'package.json');

if (!existsSync(nextBin) || !existsSync(nextPkg)) {
  console.error('❌ Build blocked: Next.js dependency was not installed correctly.');
  console.error('Run `npm ci` and verify node_modules/next exists before build.');
  process.exit(1);
}

console.log('✅ Next.js dependency is installed.');
