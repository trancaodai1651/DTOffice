// A departure stays pending until its own, current ticket has reached the director and is explicitly decided.
export function createExitQueue() {
  const entries = new Map();
  let seq = 0;
  const first = () => entries.values().next().value || null;
  return {
    list: () => [...entries.values()],
    first,
    request(actor, data) {
      const existing = [...entries.values()].find(entry => entry.actor === actor);
      if (existing) return existing;
      const entry = { id: ++seq, actor, data, stage: 'queued' };
      entries.set(entry.id, entry);
      return entry;
    },
    visit(id) {
      const entry = entries.get(id);
      if (entry !== first() || entry?.stage !== 'queued') return false;
      entry.stage = 'visiting'; return true;
    },
    arrive(id) {
      const entry = entries.get(id);
      if (entry !== first() || entry?.stage !== 'visiting') return false;
      entry.stage = 'ready'; return true;
    },
    decide(id, allowed) {
      const entry = entries.get(id);
      if (entry !== first() || entry?.stage !== 'ready') return null;
      entries.delete(id);
      return { ...entry, allowed: allowed === true };
    },
    cancel(actor) {
      const entry = [...entries.values()].find(entry => entry.actor === actor);
      if (entry) entries.delete(entry.id);
      return entry || null;
    },
  };
}
