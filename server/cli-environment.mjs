// Launch an independent employee CLI without inheriting its parent's nested-session guard.
// Authentication, provider configuration and the selected account remain intact.
import os from 'node:os';
export function standaloneEnvironment(env = process.env) {
  const next = { ...env };
  for (const key of ['CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_PARENT_SESSION_ID']) delete next[key];
  for (const key of ['CLAUDE_CONFIG_DIR', 'CODEX_HOME']) if (typeof next[key] === 'string') next[key] = next[key].replace(/^~(?=$|[\\/])/, os.homedir());
  return next;
}
export function authStatus(stdout) {
  try { const value = JSON.parse(String(stdout).replace(/^\uFEFF/, '').trim()); return typeof value.loggedIn === 'boolean' ? value.loggedIn : null; }
  catch { return null; }
}
export function cliCommand(file, args) {
  return /\.[cm]?js$/i.test(file) ? { file: process.execPath, args: [file, ...args] } : { file, args };
}
