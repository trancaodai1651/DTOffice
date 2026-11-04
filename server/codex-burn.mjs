// "Cái gì đang ăn gói" for Codex: where Codex's plan goes, by model, project, session and day, from Codex's own
// session files ($CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl). Each `token_count` event carries the tokens of the
// call that just ended (last_token_usage) and the plan's windows (rate_limits: 5 h primary, weekly secondary). Nothing
// is sent anywhere and no prompt text is kept: only the counts, summed per day and model, per file. A file is read once,
// then only what was added to it (its size remembered), so reading every 20 s costs almost nothing.
import fsp from 'node:fs/promises';
import path from 'node:path';

const DAY = 86400e3;
const dayOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const zero = () => ({ input: 0, cached: 0, output: 0, reasoning: 0, tokens: 0, req: 0 });
function add(a, u) { a.input += u.input; a.cached += u.cached; a.output += u.output; a.reasoning += u.reasoning; a.tokens += u.tokens; a.req += u.req; return a; }

/** One token_count line's numbers (last_token_usage), or null. */
export function usageOf(info) {
  const u = info?.last_token_usage; if (!u) return null;
  const n = (x) => (Number.isFinite(+x) && +x > 0 ? +x : 0);
  const input = n(u.input_tokens), cached = Math.min(n(u.cached_input_tokens), input), output = n(u.output_tokens);
  return { input, cached, output, reasoning: n(u.reasoning_output_tokens), tokens: n(u.total_tokens) || input + output, req: 1 };
}

/** Fold one rollout line into a file's state: { sid, cwd, model, origin, days: { day: { model: usage } }, limits, at }. */
export function foldLine(st, j) {
  const p = j?.payload, ts = Date.parse(j?.timestamp || '') || 0;
  if (j?.type === 'session_meta' && p) { st.sid = p.id || p.session_id || st.sid; st.cwd = p.cwd || st.cwd; st.origin = p.originator || st.origin; if (p.model) st.model = p.model; return; }
  if (j?.type === 'turn_context' && p) { if (p.model) st.model = p.model; if (p.cwd) st.cwd = p.cwd; return; }
  if (j?.type !== 'event_msg' || p?.type !== 'token_count') return;
  // (the plan's own windows only: Codex also writes other limits, "premium" say, with neither window)
  const rl = p.rate_limits;
  if (rl && (rl.primary || rl.secondary) && (!rl.limit_id || rl.limit_id === 'codex') && ts >= (st.limitsAt || 0)) { st.limits = rl; st.limitsAt = ts; }
  // (the same count written again, when only the limits changed: its running total hasn't moved, nothing new to add)
  const total = +p.info?.total_token_usage?.total_tokens || 0;
  if (total && total === st.lastTotal) return;
  if (total) st.lastTotal = total;
  const u = usageOf(p.info); if (!u || !ts) return;
  const d = dayOf(ts), m = st.model || '?';
  ((st.days[d] ??= {})[m] ??= zero());
  add(st.days[d][m], u);
  st.at = Math.max(st.at || 0, ts);
}

/**
 * @param {{ home: () => string, nameOf?: (sid: string) => { name?: string, open?: boolean, role?: string } | null, now?: () => number }} o
 */
export function createCodexBurn({ home, nameOf = () => null, now = Date.now }) {
  const files = new Map();   // file -> { size, rest, st }
  async function listFiles(since) {
    const root = path.join(home(), 'sessions'), out = [];
    for (let t = now(); t >= since - DAY; t -= DAY) {   // (a day's folder by its date; one more for files begun before midnight)
      const d = new Date(t), dir = path.join(root, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'));
      let names = []; try { names = await fsp.readdir(dir); } catch { continue; }
      for (const n of names) if (/^rollout-.*\.jsonl$/.test(n)) out.push(path.join(dir, n));
    }
    return out;
  }
  async function readFile(f) {
    let size = 0; try { size = (await fsp.stat(f)).size; } catch { files.delete(f); return null; }
    let e = files.get(f);
    if (!e || size < e.size) { e = { size: 0, rest: '', st: { sid: '', cwd: '', model: '', origin: '', days: {}, limits: null, limitsAt: 0, at: 0 } }; files.set(f, e); }
    if (size > e.size) {
      const fd = await fsp.open(f, 'r');
      try {
        const buf = Buffer.alloc(size - e.size); await fd.read(buf, 0, buf.length, e.size);
        const text = e.rest + buf.toString('utf8'), lines = text.split('\n');
        e.rest = lines.pop() || '';
        for (const l of lines) { if (!l.includes('"token_count"') && !l.includes('"session_meta"') && !l.includes('"turn_context"')) continue; try { foldLine(e.st, JSON.parse(l)); } catch { /* a broken line */ } }
        e.size = size;
      } finally { await fd.close(); }
    }
    return e.st;
  }
  /** today or the last 7 days: the totals, by model, project, session and day, and the plan's windows. */
  async function report(range = 'today') {
    const t = now(), start = range === '7d' ? new Date(new Date(t - 6 * DAY).setHours(0, 0, 0, 0)).getTime() : new Date(new Date(t).setHours(0, 0, 0, 0)).getTime();
    const want = new Set(); for (let x = start; x <= t; x += DAY) want.add(dayOf(x));
    const total = zero(), models = new Map(), projects = new Map(), sessions = [], perDay = new Map([...want].sort().map((d) => [d, { day: d, tokens: 0, models: {} }]));
    let limits = null, limitsAt = 0;
    for (const f of await listFiles(Math.min(start, t - 7 * DAY))) {   // (the whole week read: what this range is of the plan's week)
      const st = await readFile(f); if (!st) continue;
      if (st.limits && st.limitsAt > limitsAt) { limits = st.limits; limitsAt = st.limitsAt; }
      const mine = zero(), used = new Set();
      for (const [d, byModel] of Object.entries(st.days)) {
        if (!want.has(d)) continue;
        for (const [m, u] of Object.entries(byModel)) {
          add(mine, u); add(total, u); used.add(m);
          add(models.get(m) || models.set(m, zero()).get(m), u);
          const pd = perDay.get(d); pd.tokens += u.tokens; pd.models[m] = (pd.models[m] || 0) + u.tokens;
        }
      }
      if (!mine.tokens) continue;
      const proj = st.cwd ? path.basename(st.cwd) : '', key = st.cwd || '';
      const p = projects.get(key) || projects.set(key, { name: proj, cwd: st.cwd, ...zero(), sessions: 0 }).get(key);
      add(p, mine); p.sessions++;
      const who = nameOf(st.sid) || {};
      sessions.push({ sid: st.sid, name: who.name || '', open: !!who.open, role: who.role || '', project: proj, cwd: st.cwd, models: [...used], exec: st.origin === 'codex_exec', at: st.at, ...mine });
    }
    const share = (x) => (total.tokens ? x.tokens / total.tokens : 0);
    const sorted = (it) => [...it].sort((a, b) => b.tokens - a.tokens).map((x) => ({ ...x, share: share(x) }));
    // the plan's windows, and what this range is of the week (≈: tokens since the week began over the % used)
    const win = (w, key) => (w && Number.isFinite(+w.used_percent) ? { key, pct: +w.used_percent, minutes: +w.window_minutes || 0, resetsAt: (+w.resets_at || 0) * 1000 } : null);
    const windows = [win(limits?.primary, 'five'), win(limits?.secondary, 'weekly')].filter((w) => w && (!w.resetsAt || w.resetsAt > t));
    let plan = null;
    const wk = windows.find((w) => w.key === 'weekly');
    if (wk && wk.pct >= 1 && wk.resetsAt) {
      const since = wk.resetsAt - 7 * DAY;
      let tok = 0; for (const e of files.values()) for (const [d, by] of Object.entries(e.st.days)) if (Date.parse(`${d}T23:59:59`) >= since) for (const u of Object.values(by)) tok += u.tokens;
      if (tok > 0) plan = { pct: wk.pct, resetsAt: wk.resetsAt, perTok: wk.pct / tok, name: limits?.plan_type || '' };
    }
    sessions.sort((a, b) => b.tokens - a.tokens);
    return { ok: true, agent: 'codex', range: range === '7d' ? '7d' : 'today', total, plan, windows, limitsAt,
      by: { model: sorted([...models].map(([name, u]) => ({ name, ...u }))) },
      projects: sorted(projects.values()).map((p) => ({ ...p, cwd: undefined, dir: p.cwd })),
      sessions: sessions.slice(0, 40).map((s) => ({ ...s, share: share(s) })), rest: { n: Math.max(0, sessions.length - 40), tokens: sessions.slice(40).reduce((a, s) => a + s.tokens, 0), share: sessions.slice(40).reduce((a, s) => a + share(s), 0) },
      roles: sorted(Object.values(sessions.reduce((o, s) => { if (s.role) add(o[s.role] ||= { name: s.role, ...zero() }, s); return o; }, {}))),
      perDay: [...perDay.values()] };
  }
  return { report, files };
}

