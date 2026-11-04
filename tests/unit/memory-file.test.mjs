// The memory as a file in the project (server/memory-file.mjs): what the office writes, and what it leaves alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { putBlock, logEntry, writeProjectMemory } from '../../server/memory-file.mjs';
import { createT } from '../../src/i18n/index.js';

// the office's words as their keys, lists as two items, so what is written can be checked
const tr = (k, v, as) => (as === 'list' ? [`${k}.1 {file}`, `${k}.2`] : `${k}${v ? ` ${JSON.stringify(v)}` : ''}`);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'office-memfile-'));

test('a block between markers is replaced, or added at the end; the rest is kept', () => {
  assert.equal(putBlock('', '<a>', '</a>', 'x'), '<a>\nx\n</a>\n');
  assert.equal(putBlock('# Mine\n', '<a>', '</a>', 'x'), '# Mine\n\n<a>\nx\n</a>\n');
  assert.equal(putBlock('top\n<a>\nold\n</a>\nbottom', '<a>', '</a>', 'new'), 'top\n<a>\nnew\n</a>\nbottom');
});

test('a project log keeps session metadata and changed files without copying the conversation', () => {
  const e = logEntry({ kind: 'session', at: Date.UTC(2026, 10, 4, 3, 5), agent: 'codex', name: 'shop-a2', role: 'QA Tester Agent', via: 'team', model: 'gpt-6-sol', effort: 'high', prompts: ['test login'], files: ['a.js'], cmds: 3, reply: 'all green' }, tr);
  assert.match(e, /^### \d\d\/11\/2026 \d\d:05 · server\.memFile\.who: QA Tester Agent server\.memFile\.sessionOf .* · CLI: Codex CLI · Model: gpt-6-sol · Effort: high/);
  assert.match(e, /server\.memFile\.viaTeam/);
  assert.doesNotMatch(e, /test login|all green/);
  assert.match(e, /a\.js/);
  assert.match(e, /server\.memFile\.ended/);
  assert.match(logEntry({ kind: 'session', at: 0, failed: true }, tr), /server\.memFile\.stopped/);
  assert.match(logEntry({ kind: 'session', at: 0, agent: 'claude', name: 'x' }, tr), /CLI: Claude Code/);
});

test('the project gets MEMORY.md and the office\'s lines in CLAUDE.md and AGENTS.md; what agents write stays', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Our rules\nUse tabs.\n');
  const file = writeProjectMemory(dir, [{ kind: 'note', at: 0, text: 'remember X' }], tr);
  assert.equal(file, path.join(dir, '.ai-office', 'MEMORY.md'));
  let mem = fs.readFileSync(file, 'utf8');
  assert.match(mem, /server\.memFile\.rules\.1 \.ai-office\/MEMORY\.md/);
  const logFile = path.join(dir, '.ai-office', 'SESSION-LOG.md');
  assert.doesNotMatch(mem, /remember X/);
  assert.match(fs.readFileSync(logFile, 'utf8'), /remember X/);
  const claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(claude, /^# Our rules\nUse tabs\.\n\n<!-- my-office:memory:start -->/, 'its own words first, kept');
  assert.match(agents, /server\.memFile\.agentsRules\.1 \.ai-office\/MEMORY\.md/);
  // an agent adds its notes; the office writes the log again: the notes stay, the log is the new one, once
  fs.writeFileSync(file, mem + '\n### agent note: chose SQLite\n');
  writeProjectMemory(dir, [{ kind: 'note', at: 0, text: 'remember Y' }], tr);
  mem = fs.readFileSync(file, 'utf8');
  assert.match(mem, /chose SQLite/);
  assert.match(fs.readFileSync(logFile, 'utf8'), /remember Y/);
  assert.doesNotMatch(fs.readFileSync(logFile, 'utf8'), /remember X/);
  assert.doesNotMatch(mem, /remember Y/);
  writeProjectMemory(dir, [], tr);
  assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').split('my-office:memory:start').length, 2, 'the block once, however often written');
  assert.equal(writeProjectMemory(path.join(dir, 'nope'), [], tr), null);
});

test('sync preserves legacy logs, handwritten guidance, the compact index and concurrent task handoffs', (t) => {
  for (const lang of ['vi', 'en']) {
    const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const memdir = path.join(dir, '.ai-office'); fs.mkdirSync(path.join(memdir, 'state'), { recursive: true });
    const legacy = '# Durable\r\nKeep my decisions.\r\n<!-- office-log:start -->\r\nLegacy exact.\r\n<!-- office-log:end -->\r\n';
    fs.writeFileSync(path.join(memdir, 'MEMORY.md'), legacy);
    const owned = { 'INDEX.md': '# Index\n', 'STATE.md': '# State\n[state](state/task-a.md)\n', 'state/task-a.md': 'another agent is still working\n' };
    for (const [name, text] of Object.entries(owned)) fs.writeFileSync(path.join(memdir, name), text);
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Local rules\nKeep this.\n<!-- my-office:memory:start -->\nOld read-everything rule\n<!-- my-office:memory:end -->\nAfter block.\n');
    writeProjectMemory(dir, [{ kind: 'session', at: 0, prompts: ['private request'], reply: 'private reply', files: ['a.js'] }], createT(lang));
    const memory = fs.readFileSync(path.join(memdir, 'MEMORY.md'), 'utf8');
    assert.ok(memory.startsWith(legacy.trimEnd()), 'legacy content is retained exactly');
    for (const [name, text] of Object.entries(owned)) assert.equal(fs.readFileSync(path.join(memdir, name), 'utf8'), text);
    const log = path.join(memdir, 'SESSION-LOG.md');
    fs.writeFileSync(log, '# Manual log annotation\n' + fs.readFileSync(log, 'utf8'));
    const before = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
    assert.match(before, /INDEX\.md/); assert.match(before, /STATE\.md/);
    assert.doesNotMatch(before, /Old read-everything/);
    assert.match(before, /^# Local rules\nKeep this\./); assert.match(before, /After block\./);
    writeProjectMemory(dir, [], createT(lang));
    assert.equal(fs.readFileSync(path.join(memdir, 'MEMORY.md'), 'utf8'), memory, 'memory does not grow on each sync');
    assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), before, 'instructions are idempotent');
    assert.match(fs.readFileSync(log, 'utf8'), /^# Manual log annotation/);
    const claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
    const block = text => text.slice(text.indexOf('<!-- my-office:memory:start -->'), text.indexOf('<!-- my-office:memory:end -->'));
    assert.equal(block(before), block(claude), 'both CLIs get the same guidance');
  }
});

test('new memory instructions in both languages avoid mandatory history and project logs redact metadata', (t) => {
  for (const lang of ['vi', 'en']) {
    const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    writeProjectMemory(dir, [{ kind: 'session', at: 0, name: 'token=secret-value', model: 'password=secret-model', prompts: ['verbatim-private-prompt'], reply: 'verbatim-private-answer', files: ['config/api_key=secret-file'] }, { kind: 'note', at: 0, text: 'password=secret-note' }], createT(lang));
    const memory = fs.readFileSync(path.join(dir, '.ai-office', 'MEMORY.md'), 'utf8');
    assert.match(memory, /INDEX\.md/); assert.match(memory, /STATE\.md/);
    assert.doesNotMatch(memory, /read this whole file|đọc toàn bộ file/);
    const log = fs.readFileSync(path.join(dir, '.ai-office', 'SESSION-LOG.md'), 'utf8');
    assert.doesNotMatch(log, /secret-value|secret-model|secret-file|secret-note|verbatim-private/);
    assert.match(log, /•••/);
  }
});
