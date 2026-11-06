// The first run: which CLIs the office connects to (Claude Code, Codex or both), kept in prefs.agents. Choosing one
// installs it when it is missing (from npm, the way both are published) and, for Claude Code, adds the office's hooks
// (`my-office install`). Each step is sent to the page as it goes ({ k: 'setup' }). Signing in stays the CLI's own:
// login() opens a terminal window with `claude` (it asks to sign in on its first start) or `codex login`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { standaloneEnvironment, authStatus, cliCommand } from './cli-environment.mjs';

export const AGENTS = ['claude', 'codex'];
const PKG = { claude: '@anthropic-ai/claude-code', codex: '@openai/codex' };

/** The agents a request asked for, in the office's order; null when it names none it knows. */
export function pickAgents(list) {
  const out = AGENTS.filter((a) => Array.isArray(list) && list.includes(a));
  return out.length ? out : null;
}

export function createSetup({ root, port, prefs, claude, codex, broadcast = () => {}, onAgents = () => {}, onAuth = () => {}, log = () => {}, env = process.env, accountEnv = () => env, exec = execFile }) {
  const home = os.homedir(), WIN = process.platform === 'win32';
  const claudeDir = () => accountEnv().CLAUDE_CONFIG_DIR || path.join(home, '.claude');
  const codexDir = () => String(env.CODEX_HOME || path.join(home, '.codex')).replace(/^~(?=$|[\\/])/, home);
  // Claude Code's sign-in, as Claude Code itself tells it (`claude auth status`, kept a minute): a .credentials.json can
  // be there with no account in it (only MCP servers' sign-ins), and the Claude desktop app signs in on its own, apart
  // from the CLI. Codex's: whether its auth.json is there (what is in it is Codex's own).
  let auth = { at: 0, in: null, busy: false, dir: '' };
  // (the variables of a Claude Code the office was started from, when it was, say nothing about the CLI's own sign-in)
  const cliEnv = () => standaloneEnvironment(accountEnv());
  function claudeAuth(force = false) {
    const bin = claude(), dir = claudeDir(); if (!bin || auth.busy) return;
    if (dir !== auth.dir) auth = { at: 0, in: null, busy: false, dir };
    if (!force && Date.now() - auth.at < 60_000) return;
    auth.busy = true;
    const file = typeof bin === 'string' ? bin : bin.file;
    const e = cliEnv();
    const cmd = cliCommand(file, ['auth', 'status']);
    const checked = (err, out) => {
      const now = authStatus(out);   // failed/unsupported check is unknown, never a false "logged out"
      const moved = now !== auth.in;
      auth = { at: Date.now(), in: now, busy: false, dir };
      if (moved) { onAuth(now); send(); }
    };
    try { exec(cmd.file, cmd.args, { env: e, timeout: 20_000, windowsHide: true }, checked); }
    catch (err) { checked(err, ''); }   // an invalid/unavailable executable must not crash the office or imply logout
  }
  const signedIn = { claude: () => { claudeAuth(); return auth.dir === claudeDir() ? auth.in : null; },
    codex: () => fs.existsSync(path.join(codexDir(), 'auth.json')) };
  function hooksIn() {
    try { return fs.readFileSync(path.join(claudeDir(), 'settings.json'), 'utf8').includes(`127.0.0.1:${port}/event`); } catch { return false; }
  }
  let job = null;
  const out = () => ({
    agents: prefs.get('agents') || null,
    claude: { cli: !!claude(), signedIn: signedIn.claude(), hooks: hooksIn() },
    codex: { cli: !!codex(), signedIn: signedIn.codex() },
    job,
  });
  const send = () => broadcast({ k: 'setup', setup: out() });
  const step = (key, state, note = '') => {
    const s = job.steps.find((x) => x.key === key);
    if (s) Object.assign(s, { state, note }); else job.steps.push({ key, state, note });
    send();
  };
  // npm, from the node the office runs on (an app ships node with npm beside it), else the one on PATH. Global
  // packages go where npm puts them for this user (%APPDATA%\npm on Windows), never into the app's own folder.
  function npm(args) {
    const cli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    const e = { ...env, ...(WIN && env.APPDATA && { npm_config_prefix: path.join(env.APPDATA, 'npm') }) };
    const [cmd, a, shell] = fs.existsSync(cli) ? [process.execPath, [cli, ...args], false] : [WIN ? 'npm.cmd' : 'npm', args, WIN];
    return new Promise((resolve) => {
      let tail = '';
      const p = spawn(cmd, a, { env: e, shell, windowsHide: true });
      const keep = (d) => { tail = (tail + d).slice(-2000); };
      p.stdout.on('data', keep); p.stderr.on('data', keep);
      p.on('error', (err) => resolve({ ok: false, tail: err.message }));
      p.on('close', (code) => resolve({ ok: code === 0, tail }));
    });
  }
  function hooks() {
    return new Promise((resolve) => {
      let tail = '';
      const p = spawn(process.execPath, [path.join(root, 'bin', 'cli.mjs'), 'install', '--no-panel', '--no-menubar'], { env: { ...env, OFFICE_PORT: String(port) }, windowsHide: true });
      p.stdout.on('data', (d) => { tail = (tail + d).slice(-2000); }); p.stderr.on('data', (d) => { tail = (tail + d).slice(-2000); });
      p.on('error', (err) => resolve({ ok: false, tail: err.message }));
      p.on('close', (code) => resolve({ ok: code === 0, tail }));
    });
  }
  const lastLine = (t) => String(t || '').trim().split(/\r?\n/).filter(Boolean).slice(-2).join(' ').slice(0, 300);

  /** Set the office up for these agents: what is missing installed, Claude's hooks added. false while one runs. */
  async function run(list) {
    const agents = pickAgents(list);
    if (!agents || job?.running) return false;
    job = { agents, running: true, steps: [], ok: false };
    let ok = true;
    for (const a of agents) {
      if (!(a === 'claude' ? claude() : codex())) {
        step(`${a}:cli`, 'run');
        const r = await npm(['install', '-g', PKG[a]]);
        log(`setup: npm install -g ${PKG[a]}: ${r.ok ? 'ok' : 'failed'}`);
        const found = r.ok && !!(a === 'claude' ? claude() : codex());
        step(`${a}:cli`, found ? 'ok' : 'fail', found ? '' : lastLine(r.tail));
        if (!found) { ok = false; continue; }
      } else step(`${a}:cli`, 'ok');
      if (a === 'claude') {
        step('claude:hooks', 'run');
        const r = await hooks();
        step('claude:hooks', r.ok && hooksIn() ? 'ok' : 'fail', r.ok ? '' : lastLine(r.tail));
        if (!r.ok) ok = false;
      }
    }
    prefs.set('agents', agents);
    job.running = false; job.ok = ok;
    onAgents(agents);
    send();
    return true;
  }
  /** A terminal window to sign in with: `claude auth login` or `codex login`. */
  function login(agent) {
    const bin = agent === 'claude' ? claude() : agent === 'codex' ? codex() : null;
    if (!bin) return false;
    const file = typeof bin === 'string' ? bin : bin.file;
    return terminal([...(/\.(m?js)$/.test(file) ? [process.execPath] : []), file, ...(agent === 'codex' ? ['login'] : ['auth', 'login'])]);   // (Claude Code: the CLI's own sign-in, in the browser)
  }
  /** A terminal window running a command the user watches (and answers, when it asks): a sign-in, installing ffmpeg. */
  function terminal(line) {
    try {
      if (WIN) spawn('cmd', ['/c', 'start', '""', 'cmd', '/k', ...line.map((x) => (/\s/.test(x) ? `"${x}"` : x))], { env: cliEnv(), detached: true, stdio: 'ignore', windowsHide: false, windowsVerbatimArguments: true }).unref();
      else if (process.platform === 'darwin') spawn('osascript', ['-e', `tell application "Terminal" to do script ${JSON.stringify(line.map((x) => `'${x.replace(/'/g, "'\\''")}'`).join(' '))}`, '-e', 'tell application "Terminal" to activate'], { detached: true, stdio: 'ignore' }).unref();
      else spawn('x-terminal-emulator', ['-e', ...line], { detached: true, stdio: 'ignore' }).unref();
      return true;
    } catch { return false; }
  }
  return { out, run, login, terminal, recheck: () => claudeAuth(true), agents: () => prefs.get('agents') || null };
}
