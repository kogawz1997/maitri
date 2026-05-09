import fs from 'node:fs';

const required = [
  'Dockerfile',
  '.dockerignore',
  'docker-compose.yml',
  'railway.json',
  'nixpacks.toml',
  'fly.toml',
  'koyeb.yaml',
  'ecosystem.config.cjs',
  'deploy/render.yaml',
  'deploy/nginx.conf',
  'scripts/deploy-local.sh',
  'scripts/deploy-local.ps1',
  '.github/workflows/deploy-check.yml',
  'docs/DEPLOYMENT_MATRIX.md'
];

let failed = false;
for (const file of required) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing ${file}`);
    failed = true;
  } else {
    console.log(`✅ ${file}`);
  }
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const script of ['deploy:check', 'deploy:local', 'deploy:docker']) {
  if (!pkg.scripts?.[script]) {
    console.error(`❌ Missing package script: ${script}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('✅ Deploy target toolkit checks passed');
