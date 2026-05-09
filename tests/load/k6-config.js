/**
 * Load Test — k6
 * Install: brew install k6
 * Run: k6 run tests/load/k6-config.js --env BASE_URL=https://yourdomain.com
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 10  },  // ramp up
    { duration: '1m',  target: 50  },  // sustained load
    { duration: '30s', target: 100 },  // spike
    { duration: '30s', target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed:   ['rate<0.01'],  // <1% errors
    errors:            ['rate<0.05'],
  },
};

export default function () {
  // 1. Public landing
  const landing = http.get(`${BASE}/`);
  check(landing, { 'landing 200': r => r.status === 200 });
  errorRate.add(landing.status !== 200);

  // 2. Search
  const search = http.get(`${BASE}/api/public/search?city=Bangkok&checkIn=2025-12-01&checkOut=2025-12-03&adults=2`);
  check(search, {
    'search 200': r => r.status === 200,
    'search fast': r => r.timings.duration < 1500,
  });
  errorRate.add(search.status !== 200);

  // 3. Availability
  const avail = http.get(`${BASE}/api/public/availability?hotelId=test&checkIn=2025-12-01&checkOut=2025-12-03`);
  check(avail, { 'availability 200': r => r.status === 200 });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'tests/load/results/summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  return `
Load Test Results:
  Requests: ${metrics.http_reqs?.values?.count || 0}
  Error rate: ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%
  p95 response: ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(0) || 0}ms
  p99 response: ${metrics.http_req_duration?.values?.['p(99)']?.toFixed(0) || 0}ms
  `;
}
