import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveTeamPresence } from '../../src/shared/team-presence.js';
import { TEAM_SEATS, TEAM_GROUPS } from '../../src/shared/team-roles.js';
import { ROLES } from '../../server/team.mjs';

const session = (id, status = 'work', role = 'frontend', lastAt = 1) => ({ id, role, status, lastAt });
test('personnel are always the catalog, independent of execution and synchronization', () => {
  const loading = deriveTeamPresence([]);
  assert.deepEqual(loading.map(p => p.roleId), TEAM_SEATS);
  assert.ok(loading.every(p => p.activity === 'unknown' && p.primarySessionId === null));
  const fresh = deriveTeamPresence([], [], 'fresh');
  assert.ok(fresh.every(p => p.activity === 'idle' && !p.sessionIds.length));
  for (const [group, start, end] of TEAM_GROUPS) assert.deepEqual(TEAM_SEATS.slice(start, end), ROLES.filter(r => r.group === group).map(r => r.id));
});
test('multiple sessions retain their IDs; approval wins over work, rest and recency', () => {
  const input = [session('working', 'work', 'frontend', 99), session('pending', 'rest'), session('resting', 'rest', 'frontend', 100)];
  const before = structuredClone(input);
  const p = deriveTeamPresence(input, [{ sess: 'pending' }], 'fresh').find(p => p.roleId === 'frontend');
  assert.equal(p.activity, 'wait'); assert.equal(p.primarySessionId, 'pending');
  assert.deepEqual(p.sessionIds, ['pending', 'working', 'resting']);
  assert.deepEqual(input, before);
});
test('ties are deterministic; metadata arrival/change and gone only change links', () => {
  const a = session('b'), b = session('a'), outside = { id: 'ordinary', name: 'PM Agent', role: 'other', status: 'work' };
  const project = xs => deriveTeamPresence(xs, [], 'fresh');
  assert.deepEqual(project([a,b,outside])[6].sessionIds, ['a','b']);
  b.role = 'backend';
  assert.deepEqual(project([a,b])[6].sessionIds, ['b']);
  assert.deepEqual(project([b])[7].sessionIds, ['a']);
  assert.equal(project([]).length, 15);
  assert.equal(project([outside]).reduce((n,p) => n+p.sessionIds.length,0), 0);
});
test('stale data keeps observed activity, unknown statuses never become working', () => {
  const p = deriveTeamPresence([session('pending','wait')], [], 'stale')[6];
  assert.equal(p.freshness, 'stale'); assert.equal(p.activity, 'wait');
  assert.equal(deriveTeamPresence([session('new','unrecognized')], [], 'fresh')[6].activity, 'unknown');
  assert.equal(deriveTeamPresence([session('rest','rest')], [], 'fresh')[6].activity, 'rest');
});
