import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameHasWinner, gameWorkPending, scheduledRoundFinished } from '../../src/shared/game-lifecycle.js';

test('rest/finished animations cannot interrupt a round; work and approvals can', () => {
  const idle = { status: 'rest', bg: [] };
  for (const type of ['idle', 'rest', 'stop', 'interrupt', 'deploy', 'release', 'testok']) assert.equal(gameWorkPending(idle, { type }), false, type);
  assert.equal(gameWorkPending(idle, null), false);
  for (const type of ['prompt', 'read', 'write', 'bash', 'ask', 'wait', 'fail']) assert.equal(gameWorkPending(idle, { type }), true, type);
  for (const status of ['work', 'wait']) assert.equal(gameWorkPending({ status }, null), true);
  assert.equal(gameWorkPending({ ...idle, bg: [{}] }, null), true);
  assert.equal(gameWorkPending(null, null), true, 'a removed session must release its seat');
});

test('a round needs its target score or cleared table before releasing players', () => {
  assert.equal(gameHasWinner([4, 3], 5), false);
  assert.equal(gameHasWinner([4, 5], 5), true);
  assert.equal(gameHasWinner([2, 3], 5, 10), false);
  assert.equal(gameHasWinner([2, 3], 5, 0), true);
  assert.equal(gameHasWinner([15, 0], Infinity, 0), true);
});

test('the pickleball booking waits for its current match even after the scheduled end', () => {
  assert.equal(scheduledRoundFinished(false, 4, 3), false);
  assert.equal(scheduledRoundFinished(true, 4, 4), false);
  assert.equal(scheduledRoundFinished(true, 5, 4), true);
  assert.equal(scheduledRoundFinished(true, 0, 4), false, 'a reset court is not a completed match');
});
