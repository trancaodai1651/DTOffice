import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExitQueue } from '../../src/shared/exit-requests.js';
import { officeLayout } from '../../src/shared/office-layout.js';

test('new offices default to HQ and every valid saved or URL layout survives', () => {
  assert.equal(officeLayout(null, null), 'hq');
  assert.equal(officeLayout(null, 'pro'), 'pro');
  assert.equal(officeLayout(null, 'cozy'), 'cozy');
  assert.equal(officeLayout('pro', 'hq'), 'pro');
  assert.equal(officeLayout('invalid', 'cozy'), 'cozy');
  assert.equal(officeLayout('invalid', 'invalid'), 'hq');
});

test('departure requires a visit and an explicit decision for the first person only', () => {
  const queue = createExitQueue(), one = {}, two = {};
  const first = queue.request(one, { reason: 'home' }), second = queue.request(two, { reason: 'errand' });
  assert.equal(queue.request(one, {}), first, 'Repeated movement must not create duplicate requests');
  assert.equal(queue.decide(first.id, true), null, 'No approval before visiting');
  assert.equal(queue.visit(second.id), false);
  assert.equal(queue.visit(first.id), true);
  assert.equal(queue.decide(first.id, true), null, 'Walking to the room is not meeting the director');
  assert.equal(queue.arrive(first.id), true);
  for (let tick = 0; tick < 1000; tick++) assert.equal(queue.first(), first, 'Time and rendering do not decide');
  assert.equal(queue.decide(first.id, false).allowed, false);
  assert.equal(queue.first(), second);
  assert.equal(queue.visit(second.id), true);
  assert.equal(queue.arrive(second.id), true);
  assert.equal(queue.decide(second.id, true).allowed, true);
  assert.deepEqual(queue.list(), []);
});

test('work arriving cancels a departure and a stale decision cannot approve a replacement ticket', () => {
  const queue = createExitQueue(), actor = {};
  const old = queue.request(actor, {});
  queue.visit(old.id); queue.arrive(old.id);
  assert.equal(queue.cancel(actor), old);
  const replacement = queue.request(actor, {});
  queue.visit(replacement.id); queue.arrive(replacement.id);
  assert.equal(queue.decide(old.id, true), null);
  assert.equal(queue.first(), replacement);
  assert.equal(queue.cancel({}), null);
});
