export function classifyReliability(queueStats, unresolvedDlq, thresholds = { retry: 50, failed: 20, dlq: 100 }) {
  const retry = Number(queueStats.retry || 0);
  const failed = Number(queueStats.failed || 0);
  const dlq = Number(unresolvedDlq || 0);

  const ok = retry <= thresholds.retry && failed <= thresholds.failed && dlq <= thresholds.dlq;
  return {
    ok,
    retry,
    failed,
    unresolvedDlq: dlq,
    message: ok ? 'Queue health within thresholds' : 'Queue pressure above threshold',
  };
}
