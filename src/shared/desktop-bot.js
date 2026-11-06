// The native companion needs counts and translated labels, never prompts, titles or account data.
export function desktopBotSnapshot(sessions, enabled, tr) {
  const codex = [...sessions].filter((s) => s.agent === 'codex');
  const working = codex.filter((s) => s.status === 'work').length;
  const waiting = codex.filter((s) => s.status === 'wait').length;
  return { enabled, working, waiting, total: codex.length,
    words: Object.fromEntries(['name', 'idle', 'limits', 'hide', 'drag', 'offline', 'show'].map((key) => [key, tr(`specialists.bot.${key}`)])),
    status: waiting ? tr('specialists.bot.waiting', { n: waiting }) : working ? tr('specialists.bot.working', { n: working }) : tr('specialists.bot.idle') };
}
