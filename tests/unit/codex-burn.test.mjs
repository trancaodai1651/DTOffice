// What eats the Codex plan (server/codex-burn.mjs): Codex's own session files summed by model, project, session and day,
// read again only where they grew, and the plan's windows as Codex last said them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCodexBurn, foldLine, usageOf } from '../../server/codex-burn.mjs';

const NOW = new Date('2026-11-04T15:00:00').getTime();
const iso = (ms) => new Date(ms).toISOString();
const meta = (id, cwd, at) => ({ timestamp: iso(at), type: 'session_meta', payload: { id, cwd, originator: 'codex_exec' } });
const ctx = (model, at) => ({ timestamp: iso(at), type: 'turn_context', payload: { model, cwd: '' } });
const count = (at, input, cached, output, pct = 40) => ({ timestamp: iso(at), type: 'event_msg', payload: { type: 'token_count',
  info: { last_token_usage: { input_tokens: input, cached_input_tokens: cached, output_tokens: output, reasoning_output_tokens: 0, total_tokens: input + output } },
  rate_limits: { primary: { used_percent: 10, window_minutes: 300, resets_at: (NOW + 3600e3) / 1000 }, secondary: { used_percent: pct, window_minutes: 10080, resets_at: (NOW + 2 * 86400e3) / 1000 }, plan_type: 'plus' } } });
function home() {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'office-codex-burn-'));
  const day = path.join(h, 'sessions', '2026', '11', '04'), before = path.join(h, 'sessions', '2026', '11', '02');
  fs.mkdirSync(day, { recursive: true }); fs.mkdirSync(before, { recursive: true });
  const write = (f, lines) => fs.writeFileSync(f, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  write(path.join(day, 'rollout-a.jsonl'), [meta('sid-a', 'E:\\shop', NOW - 3600e3), ctx('gpt-big', NOW - 3600e3), count(NOW - 3000e3, 1000, 800, 100), count(NOW - 2000e3, 2000, 1500, 200, 45)]);
  write(path.join(day, 'rollout-b.jsonl'), [meta('sid-b', 'E:\\notes', NOW - 1800e3), ctx('gpt-small', NOW - 1800e3), count(NOW - 1700e3, 500, 0, 50, 47)]);
  write(path.join(before, 'rollout-c.jsonl'), [meta('sid-c', 'E:\\shop', NOW - 2 * 86400e3), ctx('gpt-big', NOW - 2 * 86400e3), count(NOW - 2 * 86400e3 + 60e3, 4000, 0, 400)]);
  return { h, day, write };
}

test('one call\'s tokens, from its token_count line', () => {
  assert.deepEqual(usageOf({ last_token_usage: { input_tokens: 10, cached_input_tokens: 99, output_tokens: 5, total_tokens: 15 } }), { input: 10, cached: 10, output: 5, reasoning: 0, tokens: 15, req: 1 });
  assert.equal(usageOf(null), null);
  const st = { days: {} };
  foldLine(st, ctx('m1', NOW)); foldLine(st, count(NOW, 10, 0, 5));
  assert.equal(Object.values(st.days)[0].m1.tokens, 15);
  // the same count again (only the limits moved), and a "premium" limit with no windows: neither counts
  const again = count(NOW + 1000, 10, 0, 5); again.payload.info.total_token_usage = { total_tokens: 15 };
  const first = count(NOW, 10, 0, 5); first.payload.info.total_token_usage = { total_tokens: 15 };
  const st2 = { days: {} }; foldLine(st2, first); foldLine(st2, again);
  foldLine(st2, { timestamp: iso(NOW + 2000), type: 'event_msg', payload: { type: 'token_count', info: null, rate_limits: { limit_id: 'premium', primary: null, secondary: null } } });
  assert.equal(Object.values(st2.days)[0]['?'].tokens, 15);
  assert.equal(st2.limits.secondary.used_percent, 40);
});

test('today and the last 7 days, by model, project, session and day; the plan\'s windows and its weekly rate', async () => {
  const { h } = home();
  const names = { 'sid-a': { name: 'Backend', role: 'backend' } };
  const burn = createCodexBurn({ home: () => h, now: () => NOW, nameOf: (sid) => names[sid] || null });
  const today = await burn.report('today');
  assert.equal(today.total.tokens, 1100 + 2200 + 550);
  assert.deepEqual(today.by.model.map((m) => m.name), ['gpt-big', 'gpt-small']);
  assert.deepEqual(today.projects.map((p) => [p.name, p.tokens]), [['shop', 3300], ['notes', 550]]);
  assert.equal(today.sessions[0].name, 'Backend');
  assert.deepEqual(today.roles.map((r) => [r.name, r.tokens]), [['backend', 3300]]);
  assert.deepEqual(today.windows.map((w) => [w.key, w.pct]), [['five', 10], ['weekly', 47]], 'the last numbers Codex gave (the latest of all files)');
  assert.ok(today.plan && today.plan.perTok > 0);
  assert.equal(Math.round(today.plan.perTok * (3850 + 4400)), 47, 'the week\'s tokens make the week\'s %');
  const week = await burn.report('7d');
  assert.equal(week.total.tokens, 3850 + 4400);
  assert.equal(week.perDay.length, 7);
  assert.equal(week.perDay.find((d) => d.day === '2026-11-02').tokens, 4400);
});

test('a file read again only where it grew', async () => {
  const { h, day } = home();
  const burn = createCodexBurn({ home: () => h, now: () => NOW });
  assert.equal((await burn.report('today')).total.tokens, 3850);
  fs.appendFileSync(path.join(day, 'rollout-b.jsonl'), `${JSON.stringify(count(NOW - 60e3, 100, 0, 10))}\n`);
  assert.equal((await burn.report('today')).total.tokens, 3960);
  assert.equal((await burn.report('today')).total.tokens, 3960, 'nothing counted twice');
});
