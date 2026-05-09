# Uptime Monitoring Setup

## Recommended: Better Uptime (free tier works)
1. Sign up at https://betteruptime.com
2. Add monitor: `https://yourdomain.com/api/health`
3. Set alert threshold: 1 failed check
4. Add on-call: email + LINE notify

## Alternative: UptimeRobot (free)
1. Sign up at https://uptimerobot.com
2. Monitor type: HTTP(s)
3. URL: `https://yourdomain.com/api/health`
4. Interval: 5 minutes

## Critical endpoints to monitor
| Endpoint | Expected | Alert if |
|---|---|---|
| `/api/health` | 200 | != 200 |
| `/api/public/search?city=Bangkok` | 200 | != 200 or > 3s |
| `/search` (public) | 200 | != 200 |
| `/api/cron/night-audit` | 200 | not called in 25h |

## Health check endpoint
`GET /api/health` returns:
```json
{ "status": "ok", "db": "connected", "timestamp": "..." }
```

## Incident response
See: `docs/INCIDENT_RUNBOOK.md`
