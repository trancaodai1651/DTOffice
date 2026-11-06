import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personnelName, sessionName } from '../../src/shared/session-name.js';

test('personnel names survive chat renames, project moves and office reconnects', () => {
  const s = { sid: 'persistent-thread', id: 'connection-one', agent: 'codex', title: 'A chat title', name: 'project-ab', cwd: '/a' };
  const name = sessionName(s);
  assert.ok(name.split(' ').length >= 3);
  assert.equal(sessionName({ ...s, id: 'connection-two', title: 'Renamed chat', name: 'another-project-ab', cwd: '/b' }), name);
  assert.equal(personnelName('codex', s.sid), name);
  assert.notEqual(sessionName({ ...s, agent: 'claude' }), name);
  assert.notEqual(sessionName({ ...s, sid: 'another-thread' }), name);
});

test('role names stay intact and server names are used by clients', () => {
  assert.equal(sessionName({ role: 'pm', name: 'pm-abc', title: 'Project Manager' }), 'Project Manager');
  assert.equal(sessionName({ role: 'pm', name: 'Project Manager' }), 'Project Manager');
  assert.equal(sessionName({ id: 'public-id', personnelName: 'Trần Minh An', title: 'Chat title' }), 'Trần Minh An');
  assert.equal(sessionName(null), '');
});
