const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
if (!baseUrl) {
  console.error('Missing NEXT_PUBLIC_APP_URL or APP_URL');
  process.exit(1);
}
const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/ops/health`);
const body = await res.text();
console.log(body);
if (!res.ok) process.exit(1);
