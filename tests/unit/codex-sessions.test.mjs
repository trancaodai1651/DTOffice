import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCodexSessions, isCodexDesktopProcess, outputOf, readCodexLog, toolOf } from '../../server/codex-sessions.mjs';

const line = (type, payload) => JSON.stringify({ timestamp: new Date().toISOString(), type, payload }) + '\n';
function dayDir(home) {
  const t = new Date();
  const d = path.join(home, 'sessions', String(t.getFullYear()), String(t.getMonth() + 1).padStart(2, '0'), String(t.getDate()).padStart(2, '0'));
  fs.mkdirSync(d, { recursive: true });
  return d;
}

test('Codex tool calls read as Claude Code tools', () => {
  assert.deepEqual(toolOf('shell', JSON.stringify({ command: ['bash', '-lc', 'npm test'] })), { tool_name: 'Bash', tool_input: { command: 'npm test' } });
  assert.deepEqual(toolOf('shell_command', { command: 'dir' }).tool_input.command, 'dir');
  assert.equal(toolOf('exec_command', { cmd: 'ls -la' }).tool_input.command, 'ls -la');
  const p = toolOf('apply_patch', '*** Begin Patch\n*** Add File: src/a.js\n+x\n*** End Patch', '/w');
  assert.equal(p.tool_name, 'Write'); assert.equal(p.tool_input.file_path, path.join('/w', 'src/a.js'));
  assert.equal(toolOf('apply_patch', { input: '*** Update File: b.js\n*** Update File: c.js' }).tool_name, 'Edit');
  assert.deepEqual(toolOf('update_plan', { plan: [{ step: 'Do it', status: 'in_progress' }] }).tool_input.todos, [{ content: 'Do it', status: 'in_progress' }]);
  assert.equal(toolOf('github__create_issue', {}).tool_name, 'mcp__github__create_issue');
  assert.equal(toolOf('write_stdin', {}), null);
});

test('a shell output says whether it failed', () => {
  assert.equal(outputOf(JSON.stringify({ output: 'ok', metadata: { exit_code: 0 } })).failed, false);
  assert.equal(outputOf(JSON.stringify({ output: 'boom', metadata: { exit_code: 2 } })).failed, true);
  assert.equal(outputOf('Exit code: 1\nWall time: 0.2 seconds\nOutput:\nnope').failed, true);
  assert.equal(outputOf('Success. Updated the following files:\nM a.js').failed, false);
});

test('a rollout file growing becomes the hook events of a session', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-home-')), dir = dayDir(home), got = [];
  const sessions = createCodexSessions({ home: () => home, onEvent: (p) => got.push(p), procs: async () => null, pollMs: 1e9 });
  await sessions.poll();   // (the office's start: nothing there yet)
  const file = path.join(dir, 'rollout-2026-01-01T00-00-00-abc.jsonl');
  fs.writeFileSync(file, line('session_meta', { id: 'abc-123', cwd: '/proj', originator: 'codex_cli_rs', cli_version: '0.50.0' })
    + line('turn_context', { cwd: '/proj', model: 'gpt-5-codex' })
    + line('event_msg', { type: 'user_message', message: 'run the tests' })
    + line('response_item', { type: 'function_call', name: 'shell', arguments: JSON.stringify({ command: ['bash', '-lc', 'npm test'] }), call_id: 'c1' }));
  await sessions.poll();
  fs.appendFileSync(file, line('response_item', { type: 'function_call_output', call_id: 'c1', output: JSON.stringify({ output: 'fail', metadata: { exit_code: 1 } }) })
    + line('event_msg', { type: 'agent_message', message: 'One test fails.' })
    + line('event_msg', { type: 'task_complete', last_agent_message: 'One test fails.' }));
  await sessions.poll();
  assert.deepEqual(got.map((p) => p.hook_event_name), ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUseFailure', 'Stop']);
  assert.ok(got.every((p) => p.session_id === 'abc-123' && p.agent === 'codex' && p.cwd === '/proj'));
  assert.equal(got[1].prompt, 'run the tests');
  assert.equal(got[2].tool_input.command, 'npm test');
  assert.equal(got[4].last_assistant_message, 'One test fails.');
  assert.equal(got[4].codex_model, 'gpt-5-codex');
  const log = await readCodexLog(file);
  assert.deepEqual(log.map((x) => x.role), ['user', 'tool', 'claude']);
  fs.rmSync(home, { recursive: true, force: true });
});

test('the newer rollout format (Codex 0.1xx): UserMessage items, assistant response items, task_complete with an error', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-home-')), dir = dayDir(home), got = [];
  const sessions = createCodexSessions({ home: () => home, onEvent: (p) => got.push(p), procs: async () => null, pollMs: 1e9 });
  await sessions.poll();
  const file = path.join(dir, 'rollout-2026-11-03T14-55-08-new.jsonl');
  fs.writeFileSync(file, line('session_meta', { id: 'new-1', cwd: 'C:\\proj', originator: 'codex_exec', cli_version: '0.166.0', history_mode: 'legacy' })
    + line('event_msg', { type: 'task_started', turn_id: 't1' })
    + line('response_item', { type: 'message', role: 'user', content: [{ type: 'input_text', text: '<environment_context>…</environment_context>' }] })
    + line('response_item', { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'say hi' }] })
    + line('event_msg', { type: 'item_completed', item: { type: 'UserMessage', content: [{ type: 'text', text: 'say hi' }] } })
    + line('response_item', { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hi!' }] })
    + line('event_msg', { type: 'task_complete', last_agent_message: 'Hi!', error: null })
    + line('event_msg', { type: 'item_completed', item: { type: 'UserMessage', content: [{ type: 'text', text: 'again' }] } })
    + line('event_msg', { type: 'task_complete', last_agent_message: null, error: { message: 'unexpected status 429 Too Many Requests: usage limit reached' } }));
  await sessions.poll();
  assert.deepEqual(got.map((p) => p.hook_event_name), ['SessionStart', 'UserPromptSubmit', 'Stop', 'UserPromptSubmit', 'StopFailure']);
  assert.equal(got[1].prompt, 'say hi');
  assert.equal(got[2].last_assistant_message, 'Hi!');
  assert.equal(got[4].error, 'rate_limit');
  assert.deepEqual((await readCodexLog(file)).map((x) => `${x.role}:${x.text}`), ['user:say hi', 'claude:Hi!', 'user:again']);
  fs.rmSync(home, { recursive: true, force: true });
});

test('a session ends when no codex runs any more', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-home-')), dir = dayDir(home), got = [];
  const file = path.join(dir, 'rollout-x.jsonl');
  fs.writeFileSync(file, line('session_meta', { id: 'old-1', cwd: '/p' }));
  const past = new Date(Date.now() - 2 * 60e3); fs.utimesSync(file, past, past);
  const sessions = createCodexSessions({ home: () => home, onEvent: (p) => got.push(p), procs: async () => [], pollMs: 1e9 });
  await sessions.poll();
  assert.deepEqual(got.map((p) => p.hook_event_name), ['SessionStart', 'SessionEnd']);
  await sessions.poll();
  assert.equal(got.length, 2, 'a closed unchanged file must not reappear every poll');
  fs.rmSync(home, { recursive: true, force: true });
});

test('Codex Desktop restores and retains the latest resting chat per project, without importing history', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-desktop-')), dir = dayDir(home), got = [];
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const make = (id, cwd, age, originator = 'Codex Desktop', source = 'vscode') => {
    const file = path.join(dir, `rollout-${id}.jsonl`);
    fs.writeFileSync(file, line('session_meta', { id, cwd, originator, source, cli_version: '0.166.0' }) + line('event_msg', { type: 'user_message', message: 'old private work' }));
    const stamp = new Date(Date.now() - age); fs.utimesSync(file, stamp, stamp); return file;
  };
  make('older', '/same-project', 16 * 3600e3);
  const latest = make('latest', '/same-project', 15 * 3600e3);
  make('another-project', '/other-project', 14 * 3600e3);
  make('child', '/same-project', 13 * 3600e3, 'Codex Desktop', { subagent: { thread_spawn: { parent_thread_id: 'latest' } } });
  make('cli', '/cli-project', 12 * 3600e3, 'codex_cli_rs', 'cli');
  const watcher = createCodexSessions({ home: () => home, onEvent: (p) => got.push(p), procs: async () => [{ args: 'C:\\Users\\me\\AppData\\Local\\OpenAI\\Codex\\bin\\codex.exe app-server' }] });
  await watcher.poll(); await watcher.poll();
  assert.deepEqual(watcher.list().map((s) => s.sid).sort(), ['another-project', 'latest']);
  assert.equal(got.length, 2);
  assert.ok(got.every((p) => p.hook_event_name === 'SessionStart' && p.codex_origin === 'Codex Desktop'));
  fs.appendFileSync(latest, line('event_msg', { type: 'user_message', message: 'new work' }));
  await watcher.poll();
  assert.equal(got.at(-1).session_id, 'latest'); assert.equal(got.at(-1).prompt, 'new work');
});

test('a copied parent session_meta never merges a desktop fork into its parent', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-fork-')), dir = dayDir(home), got = [];
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const watcher = createCodexSessions({ home: () => home, onEvent: (p) => got.push(p) });
  await watcher.poll();
  fs.writeFileSync(path.join(dir, 'rollout-fork.jsonl'), line('session_meta', { id: 'child', cwd: '/project', originator: 'Codex Desktop', source: { subagent: 'parent' } })
    + line('session_meta', { id: 'parent', cwd: '/other', originator: 'codex_cli_rs' })
    + JSON.stringify({ timestamp: new Date(Date.now() - 3600e3).toISOString(), type: 'turn_context', payload: { cwd: '/ancestor-project', model: 'ancestor-model' } }) + '\n'
    + JSON.stringify({ timestamp: new Date(Date.now() - 3600e3).toISOString(), type: 'event_msg', payload: { type: 'user_message', message: 'copied ancestor work' } }) + '\n'
    + line('event_msg', { type: 'user_message', message: 'child work' }));
  await watcher.poll();
  assert.ok(got.every((p) => p.session_id === 'child' && p.cwd === '/project'));
  assert.equal(watcher.list()[0].sid, 'child');
  assert.deepEqual(got.map((p) => p.hook_event_name), ['SessionStart', 'UserPromptSubmit']);
  assert.equal(got.at(-1).prompt, 'child work');
  assert.ok(isCodexDesktopProcess({ args: '/Applications/Codex.app/Contents/Resources/codex app-server' }));
  assert.ok(!isCodexDesktopProcess({ args: 'codex app-server --listen stdio://' }), 'account helper is not desktop presence');
});
