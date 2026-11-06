// Only work owned by the office is interrupted when its native app restarts.
export function updateReadiness(tasks = [], runs = [], jobs = []) {
  const busy = tasks.length + runs.filter(r => r.status === 'run').length + jobs.filter(j => ['run', 'print', 'render'].includes(j.status)).length;
  return { safe: busy === 0, busy };
}
