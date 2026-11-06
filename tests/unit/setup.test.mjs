// The first run (server/setup.mjs): which CLIs, what gets installed, what the page is told.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSetup, pickAgents } from '../../server/setup.mjs';

const memPrefs = () => { const m = {}; return { get: (k) => m[k], set: (k, v) => { m[k] = v; } }; };

test('pickAgents keeps the known CLIs in order, null for none', () => {
  assert.deepEqual(pickAgents(['codex', 'claude']), ['claude', 'codex']);
  assert.deepEqual(pickAgents(['codex', 'x']), ['codex']);
  assert.equal(pickAgents(['x']), null);
  assert.equal(pickAgents('claude'), null);
});

test('choosing Codex only, already installed: nothing to install, Codex is the choice', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'office-setup-'));
  const prefs = memPrefs(), sent = [], chosen = [];
  const s = createSetup({ root: home, port: 4999, prefs, claude: () => null, codex: () => '/x/codex', broadcast: (m) => sent.push(m), onAgents: (a) => chosen.push(a), env: { CODEX_HOME: home, CLAUDE_CONFIG_DIR: home } });
  assert.equal(s.out().agents, null);
  assert.equal(await s.run(['codex']), true);
  assert.deepEqual(prefs.get('agents'), ['codex']);
  assert.deepEqual(chosen, [['codex']]);
  const last = sent.at(-1).setup;
  assert.equal(last.job.ok, true);
  assert.deepEqual(last.job.steps.map((x) => [x.key, x.state]), [['codex:cli', 'ok']]);
  assert.equal(last.codex.signedIn, false);
  fs.writeFileSync(path.join(home, 'auth.json'), '{}');
  assert.equal(s.out().codex.signedIn, true);
});

test('an unknown choice starts nothing', async () => {
  const s = createSetup({ root: os.tmpdir(), port: 4999, prefs: memPrefs(), claude: () => null, codex: () => null });
  assert.equal(await s.run(['nope']), false);
  assert.equal(s.out().job, null);
});

test('login checks follow the selected account and preserve token authentication even under a Claude parent', () => {
  let selected = 'account-a', result = '{"loggedIn":true}'; const calls = [];
  const s = createSetup({ root: os.tmpdir(), port: 4999, prefs: memPrefs(), claude: () => ({ file: 'claude.mjs' }), codex: () => null,
    accountEnv: () => ({ CLAUDE_CONFIG_DIR: selected, CLAUDECODE: '1', CLAUDE_CODE_OAUTH_TOKEN: 'dummy-test-token', ANTHROPIC_BASE_URL: 'https://provider.example' }),
    exec: (file, args, options, cb) => { calls.push({ file, args, env: options.env }); cb(null, result); } });
  assert.equal(s.out().claude.signedIn, true);
  assert.equal(calls[0].file, process.execPath); assert.equal(calls[0].env.CLAUDECODE, undefined);
  assert.equal(calls[0].env.CLAUDE_CODE_OAUTH_TOKEN, 'dummy-test-token');
  assert.equal(calls[0].env.ANTHROPIC_BASE_URL, 'https://provider.example');
  selected = 'account-b'; result = '{"loggedIn":false}';
  assert.equal(s.out().claude.signedIn, false); assert.equal(calls.at(-1).env.CLAUDE_CONFIG_DIR, 'account-b');
  selected = 'account-c'; result = 'unsupported command'; assert.equal(s.out().claude.signedIn, null);
});

test('a failed executable auth probe stays unknown and does not crash the server', () => {
  const s = createSetup({ root: os.tmpdir(), port: 4999, prefs: memPrefs(), claude: () => ({ file: 'not-a-windows-executable.sh' }), codex: () => null, exec: () => { throw Object.assign(new Error('spawn EFTYPE'), { code: 'EFTYPE' }); } });
  assert.doesNotThrow(() => s.out()); assert.equal(s.out().claude.signedIn, null);
});
