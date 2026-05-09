export function decideStuckJobAction(attempts, maxAttempts) {
  return attempts >= maxAttempts ? 'failed' : 'retry';
}

export function shouldMoveToDeadLetter(attempts, maxAttempts) {
  return attempts >= maxAttempts;
}

export function normalizeAttempts(job) {
  return Number(job?.attempts || 0);
}
