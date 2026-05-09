# Maitri PMS Deployment Matrix

This project can now be tested or deployed on multiple targets across Windows, macOS, and Linux.

## Best target by purpose

| Purpose | Recommended target | Notes |
|---|---|---|
| Fast Next.js preview | Vercel | Best for quick web preview, weaker for cron/background workloads. |
| Free/cheap fullstack test | Render / Koyeb | Good for demo. Free tiers may sleep or be slower. |
| SaaS-style deploy | Railway / Northflank | Better for services, workers, Redis, cron. Usually not fully free long-term. |
| Control + low cost | VPS + PM2/Nginx | Best when you can manage Linux. |
| Portable local/prod | Docker | Same behavior on Windows/macOS/Linux via Docker Desktop or Linux Docker. |

## Local testing

### Windows PowerShell

```powershell
Copy-Item .env.production.example .env.local
notepad .env.local
.\scripts\deploy-local.ps1 check
.\scripts\deploy-local.ps1 node
```

### macOS/Linux

```bash
cp .env.production.example .env.local
nano .env.local
./scripts/deploy-local.sh check
./scripts/deploy-local.sh node
```

### Docker on any OS

```bash
cp .env.production.example .env.local
# edit .env.local
docker compose up --build
```

Open: http://localhost:3000

## Platform configs included

| Platform | File |
|---|---|
| Docker | `Dockerfile`, `docker-compose.yml` |
| Render Blueprint | `deploy/render.yaml` |
| Railway | `railway.json`, `nixpacks.toml` |
| Fly.io | `fly.toml` |
| Koyeb | `koyeb.yaml` |
| VPS PM2 | `ecosystem.config.cjs` |
| VPS Nginx | `deploy/nginx.conf` |
| GitHub Actions | `.github/workflows/deploy-check.yml` |

## Required production environment variables

Minimum required variables normally include:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=
```

Optional but recommended:

```bash
SENTRY_DSN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENDGRID_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OMISE_SECRET_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

## VPS quick path

```bash
sudo apt update
sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2

git clone <repo-url> maitri-pms
cd maitri-pms
cp .env.production.example .env.local
nano .env.local
npm install --legacy-peer-deps --no-audit --no-fund
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

Copy `deploy/nginx.conf` into `/etc/nginx/sites-available/maitri-pms`, edit `server_name`, enable it, then add HTTPS via Certbot.

## Reality check before public launch

```bash
npm run final:verify
npm run deploy:check
npm run build
```
