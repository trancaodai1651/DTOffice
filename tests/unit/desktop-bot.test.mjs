import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desktopBotSnapshot } from '../../src/shared/desktop-bot.js';
import { createT } from '../../src/i18n/index.js';

test('native companion prioritizes approval, counts both CLIs and shares no private session fields', () => {
  const snapshot = desktopBotSnapshot([
    { status: 'work' }, // real Claude hook sessions have no explicit agent field
    { agent: 'codex', status: 'rest' },
    { agent: 'codex', status: 'work', lastPrompt: 'private task', title: 'private chat', account: 'private account' },
    { agent: 'codex', status: 'wait' },
  ], true, createT('vi'));
  assert.deepEqual([snapshot.working, snapshot.waiting, snapshot.total], [2, 1, 4]);
  assert.equal(snapshot.status, 'Claude + Codex chờ duyệt 1 việc');
  assert.deepEqual(snapshot.agents.claude, { working: 1, waiting: 0 });
  assert.equal(snapshot.enabled, true);
  assert.doesNotMatch(JSON.stringify(snapshot), /private/);
  assert.equal(snapshot.words.hide, 'Ẩn bot');
});

test('companion handles work, idle and disabled states in English', () => {
  const tr = createT('en');
  assert.equal(desktopBotSnapshot([{ agent: 'codex', status: 'work' }], true, tr).status, 'Claude + Codex are on 1 jobs');
  const idle = desktopBotSnapshot([], false, tr);
  assert.equal(idle.status, 'Claude + Codex are idle');
  assert.equal(idle.enabled, false);
  assert.equal(idle.words.show, 'Show Codex Bot on desktop');
});
