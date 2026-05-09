param(
  [ValidateSet("node", "docker", "check")]
  [string]$Mode = "node"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path ".env.local")) {
  Write-Error "Missing .env.local. Copy .env.production.example or .env.demo first."
}

switch ($Mode) {
  "node" {
    npm install --legacy-peer-deps --no-audit --no-fund
    npm run type-check
    npm run build
    npm run start
  }
  "docker" {
    docker compose up --build
  }
  "check" {
    npm install --legacy-peer-deps --no-audit --no-fund
    npm run final:verify
  }
}
