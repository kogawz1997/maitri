import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

export function loadLocalEnvFiles() {
  const files = ['.env.production.local', '.env.local', '.env.production', '.env'];
  const loaded = [];
  for (const file of files) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    loadDotenv({ path, override: false });
    loaded.push(file);
  }
  return loaded;
}

export function isPlaceholderValue(value) {
  if (!value) return true;
  const normalized = String(value).trim().toLowerCase();
  return (
    normalized === '' ||
    normalized.includes('replace_me') ||
    normalized.includes('replace-with') ||
    normalized.includes('your_') ||
    normalized.includes('your-') ||
    normalized.includes('yourdomain') ||
    normalized.includes('placeholder') ||
    normalized.includes('demo_') ||
    normalized.includes('_demo') ||
    normalized.includes('not_real') ||
    normalized.includes('xxxxxxxx') ||
    normalized === 'sg.replace_me' ||
    normalized === 'sk_live_replace_me' ||
    normalized === 'whsec_replace_me'
  );
}
