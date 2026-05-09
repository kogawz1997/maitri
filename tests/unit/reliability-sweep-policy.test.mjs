import assert from 'node:assert/strict';
import { decideStuckJobAction, shouldMoveToDeadLetter, normalizeAttempts } from '../../src/lib/reliability/sweep.js';

assert.equal(decideStuckJobAction(0, 5), 'retry');
assert.equal(decideStuckJobAction(4, 5), 'retry');
assert.equal(decideStuckJobAction(5, 5), 'failed');
assert.equal(decideStuckJobAction(6, 5), 'failed');

assert.equal(shouldMoveToDeadLetter(0, 5), false);
assert.equal(shouldMoveToDeadLetter(4, 5), false);
assert.equal(shouldMoveToDeadLetter(5, 5), true);

assert.equal(normalizeAttempts({ id: 'a', attempts: null }), 0);
assert.equal(normalizeAttempts({ id: 'b', attempts: 3 }), 3);
assert.equal(normalizeAttempts({ id: 'c' }), 0);

console.log('reliability sweep policy tests passed');
