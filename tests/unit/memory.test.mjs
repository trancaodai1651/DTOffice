// Session memory (server/memory.mjs): a session's work kept when it ends, read when the next one starts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMemory, wrap } from '../../server/memory.mjs';
import { createT } from '../../src/i18n/index.js';

const tr = (k, v = {}) => `${k}${Object.keys(v).length ? ` ${JSON.stringify(v)}` : ''}`;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'office-mem-'));

test('a session that was asked something leaves one entry when it ends; the next one reads it', () => {
  const dir = tmp(), proj = path.join(dir, 'proj'), saved = [];
  const m = createMemory({ dir: path.join(dir, 'mem'), tr, onSaved: (x) => saved.push(x) });
  const s = { key: 'k1', cwd: proj, name: 'proj-ab' };
  m.observe(s, 'SessionStart', {});
  m.observe(s, 'UserPromptSubmit', { prompt: 'fix   the login bug' });
  m.observe(s, 'PostToolUse', { tool_name: 'Edit', tool_input: { file_path: path.join(proj, 'src', 'login.js') } });
  m.observe(s, 'PostToolUse', { tool_name: 'Bash', tool_input: { command: 'npm test' } });
  m.observe(s, 'PostToolUse', { tool_name: 'Read', tool_input: { file_path: path.join(proj, 'a.js') } });
  m.observe(s, 'Stop', { last_assistant_message: 'Fixed it, tests pass.' });
  assert.equal(m.count(proj), 0, 'nothing kept while it runs');
  m.observe(s, 'SessionEnd', {});
  assert.equal(m.count(proj), 1);
  assert.equal(saved.length, 1);
  const [e] = m.entries(proj);
  assert.deepEqual(e.prompts, ['fix the login bug']);
  assert.deepEqual(e.files, ['src/login.js']);
  assert.equal(e.cmds, 1);
  assert.equal(e.reply, 'Fixed it, tests pass.');
  const words = m.context(proj);
  assert.match(words, /^server\.memory\.head/);
  assert.match(words, /src\/login\.js/);
  assert.match(words, /Claude Code · proj-ab/);
  assert.equal(m.open(), 0);
});

test('nothing asked, nothing kept; a subagent\'s steps are not its own entry; the folder may be spelt another way', () => {
  const dir = tmp(), proj = path.join(dir, 'Proj');
  const m = createMemory({ dir: path.join(dir, 'mem'), tr });
  m.observe({ key: 'a', cwd: proj }, 'SessionStart', {});
  m.end('a');
  assert.equal(m.count(proj), 0);
  m.observe({ key: 'b', cwd: proj }, 'UserPromptSubmit', { prompt: 'x', agent_id: 'sub1' });
  m.end('b');
  assert.equal(m.count(proj), 0);
  m.observe({ key: 'c', cwd: proj, agent: 'codex' }, 'UserPromptSubmit', { prompt: 'add tests' });
  m.end('c');
  assert.equal(m.count(`${proj}${path.sep}`), 1, 'a trailing slash is the same folder');
  if (process.platform === 'win32') assert.equal(m.count(proj.toUpperCase()), 1, 'Windows: the same folder in other letters');
  assert.match(m.context(proj), /Codex/);
});

test('your notes, taking one out, clearing, and switching it off', () => {
  const dir = tmp(), proj = path.join(dir, 'p');
  let on = true;
  const m = createMemory({ dir: path.join(dir, 'mem'), tr, on: () => on });
  assert.equal(m.note(proj, '  always run npm test  '), true);
  assert.equal(m.note(proj, '   '), false);
  const [n] = m.entries(proj);
  assert.equal(n.kind, 'note');
  assert.match(m.context(proj), /always run npm test/);
  on = false;
  assert.equal(m.context(proj), '', 'off: nothing read');
  m.observe({ key: 'z', cwd: proj }, 'UserPromptSubmit', { prompt: 'q' }); m.end('z');
  assert.equal(m.count(proj), 1, 'off: nothing kept');
  on = true;
  assert.equal(m.remove(proj, n.id), true);
  assert.equal(m.count(proj), 0);
  m.note(proj, 'x'); assert.equal(m.clear(proj), true); assert.equal(m.count(proj), 0);
});

test('a long memory is cut to what a session start can take, newest first', () => {
  const dir = tmp(), proj = path.join(dir, 'p');
  const m = createMemory({ dir: path.join(dir, 'mem'), tr });
  for (let i = 0; i < 60; i++) { m.observe({ key: `s${i}`, cwd: proj }, 'UserPromptSubmit', { prompt: `task ${i} ${'x'.repeat(200)}` }); m.end(`s${i}`); }
  assert.equal(m.count(proj), 40, 'the newest 40 kept');
  const words = m.context(proj);
  assert.ok(words.length <= 4000);
  assert.match(words, /task 59/);
  assert.doesNotMatch(words, /task 20 /);
});

test('work the office gave ends: kept at once, with what the run knew when its events came late', () => {
  const dir = tmp(), proj = path.join(dir, 'p');
  const m = createMemory({ dir: path.join(dir, 'mem'), tr });
  m.observe({ key: 'cx', cwd: proj, agent: 'codex' }, 'PostToolUse', { tool_name: 'Bash' });
  const e = m.finish({ key: 'cx', cwd: proj, agent: 'codex', name: 'p-01', prompt: 'count the files', reply: 'There is 1.' });
  assert.deepEqual([e.prompts, e.reply, e.cmds, e.agent], [['count the files'], 'There is 1.', 1, 'codex']);
  assert.equal(m.finish({ cwd: proj, prompt: 'again', reply: 'ok' }).prompts[0], 'again', 'no session seen at all: from the run alone');
  assert.equal(m.count(proj), 2);
});

test('the memory the office added to a prompt is not kept as part of what was asked', () => {
  const dir = tmp(), proj = path.join(dir, 'p');
  const m = createMemory({ dir: path.join(dir, 'mem'), tr });
  m.observe({ key: 'a', cwd: proj, agent: 'codex' }, 'UserPromptSubmit', { prompt: `count the files${wrap('server.memory.head\n- an older entry')}` });
  const e = m.end('a');
  assert.deepEqual(e.prompts, ['count the files']);
  assert.match(m.context(proj), /^server\.memory\.head\n- \d\d\/\d\d \d\d:\d\d · Codex/);
});

test('prepared projects pass a short guide and pinned notes, with fallback for legacy projects and file opt-out', (t) => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const proj = path.join(dir, 'project'), guide = path.join(proj, '.ai-office');
  fs.mkdirSync(guide, { recursive: true });
  let files = true, on = true;
  const m = createMemory({ dir: path.join(dir, 'data'), tr: createT('en'), files: () => files, on: () => on });
  m.finish({ cwd: proj, prompt: 'old task to be looked up only', reply: 'old answer to be looked up only' });
  assert.match(m.context(proj), /old task to be looked up only/, 'legacy JSON still works without a compact guide');
  fs.writeFileSync(path.join(guide, 'INDEX.md'), '# Index');
  assert.match(m.context(proj), /old task to be looked up only/, 'partial setup does not hide past context');
  fs.writeFileSync(path.join(guide, 'STATE.md'), '# State');
  let words = m.context(proj);
  assert.match(words, /INDEX\.md/); assert.match(words, /STATE\.md/);
  assert.doesNotMatch(words, /old task to be looked up only|old answer to be looked up only/);
  assert.ok(words.length < 600);
  m.note(proj, 'Always keep the app at port 4310 running');
  assert.match(m.context(proj), /Always keep the app/);
  assert.doesNotMatch(m.context(proj), /old task to be looked up only/);
  files = false;
  assert.match(m.context(proj), /old task to be looked up only/, 'file opt-out restores existing JSON behavior');
  on = false; assert.equal(m.context(proj), '');
});

test('a compact project works before any session history, and still bounds pinned context', (t) => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const guide = path.join(dir, 'project', '.ai-office'); fs.mkdirSync(guide, { recursive: true });
  for (const name of ['INDEX.md', 'STATE.md', 'MEMORY.md']) fs.writeFileSync(path.join(guide, name), '# owned by agents');
  const m = createMemory({ dir: path.join(dir, 'data'), tr: createT('vi'), files: () => true });
  const proj = path.dirname(guide);
  assert.match(m.context(proj), /INDEX\.md/);
  for (let i = 0; i < 15; i++) m.note(proj, `rule ${i}: ${'x'.repeat(450)}`);
  assert.ok(m.context(proj).length <= 4000);
  assert.match(m.context(proj), /rule 14/);
  fs.rmSync(path.join(guide, 'STATE.md'));
  fs.mkdirSync(path.join(guide, 'STATE.md'));
  assert.doesNotMatch(m.context(proj), /INDEX\.md/, 'directories are not valid context files');
});
