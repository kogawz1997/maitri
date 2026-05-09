/**
 * Generate PWA PNG icons from SVG
 * Run once after npm install: node scripts/generate-icons.mjs
 * Requires: npm install --save-dev sharp
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svg  = readFileSync(join(root, 'public/icons/icon.svg'));

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const size of sizes) {
  await sharp(svg).resize(size, size).png().toFile(join(root, `public/icons/icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}
console.log('\n✅ All icons generated. Commit public/icons/ to git.');
