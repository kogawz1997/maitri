# Deployment Toolkit Added

This patch adds multi-target deployment support for Maitri PMS across Windows, macOS, Linux, Docker, GitHub Actions, and common hosting platforms.

## Added

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `deploy/render.yaml`
- `railway.json`
- `nixpacks.toml`
- `fly.toml`
- `koyeb.yaml`
- `ecosystem.config.cjs`
- `deploy/nginx.conf`
- `scripts/deploy-local.sh`
- `scripts/deploy-local.ps1`
- `scripts/check-deploy-targets.mjs`
- `.github/workflows/deploy-check.yml`
- `docs/DEPLOYMENT_MATRIX.md`

## New scripts

```bash
npm run deploy:check
npm run deploy:docker
npm run verify:deploy
```

## Fastest test

```bash
cp .env.production.example .env.local
npm install --legacy-peer-deps --no-audit --no-fund
npm run verify:deploy
npm run build
```

## Docker test

```bash
docker compose up --build
```
