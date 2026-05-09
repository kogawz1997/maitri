import assert from 'node:assert/strict';
import { classifyReliability } from '../../src/lib/reliability/metrics.js';

const ok = classifyReliability({ retry: 2, failed: 1 }, 5);
assert.equal(ok.ok, true);

const highRetry = classifyReliability({ retry: 99, failed: 1 }, 5);
assert.equal(highRetry.ok, false);

const highDlq = classifyReliability({ retry: 2, failed: 1 }, 999);
assert.equal(highDlq.ok, false);

console.log('reliability metrics tests passed');
