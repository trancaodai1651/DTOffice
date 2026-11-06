import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { standaloneEnvironment, authStatus, cliCommand } from '../../server/cli-environment.mjs';
test('employees retain selected credentials/provider but cannot inherit the parent nested-session guard', () => {
  const source = { CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'cli', CLAUDE_CODE_SESSION_ID: 'parent', CLAUDE_CODE_OAUTH_TOKEN: 'dummy-test-token', ANTHROPIC_BASE_URL: 'https://provider.example', CLAUDE_CONFIG_DIR: '~/.claude-work', CODEX_HOME: '~/.codex-work' };
  const child = standaloneEnvironment(source);
  assert.equal(child.CLAUDECODE, undefined); assert.equal(child.CLAUDE_CODE_ENTRYPOINT, undefined);
  assert.equal(child.CLAUDE_CODE_SESSION_ID, undefined); assert.equal(source.CLAUDECODE, '1');
  assert.equal(child.CLAUDE_CODE_OAUTH_TOKEN, source.CLAUDE_CODE_OAUTH_TOKEN);
  assert.equal(child.ANTHROPIC_BASE_URL, source.ANTHROPIC_BASE_URL);
  assert.equal(child.CLAUDE_CONFIG_DIR, `${os.homedir()}/.claude-work`);
  assert.equal(child.CODEX_HOME, `${os.homedir()}/.codex-work`);
});
test('auth status has three states; unsupported or failing probes are not proof of logout', () => {
  assert.equal(authStatus('{"loggedIn":true}'), true); assert.equal(authStatus('\uFEFF{"loggedIn":false}'), false);
  for (const out of ['', '{}', 'unsupported command', '{"loggedIn":"false"}']) assert.equal(authStatus(out), null);
  assert.deepEqual(cliCommand('C:/npm/claude.mjs', ['auth', 'status']), { file: process.execPath, args: ['C:/npm/claude.mjs', 'auth', 'status'] });
  assert.deepEqual(cliCommand('C:/cli/claude.exe', ['auth', 'status']), { file: 'C:/cli/claude.exe', args: ['auth', 'status'] });
});
