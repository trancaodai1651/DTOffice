// Codex CLI sessions in the office: Codex has no hooks like Claude Code's, but it writes every session as it goes to
// $CODEX_HOME/sessions/YYYY/MM/DD/rollout-<time>-<id>.jsonl (session_meta, the turn's context, what you typed, each tool
// call and its output, its answers, task_complete). Those files are read as they grow, every line turned into the hook
// event Claude Code would have sent (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse(Failure), Stop, SessionEnd)
// with Claude's tool names (shell → Bash, apply_patch → Edit/Write, update_plan → TodoWrite…), and handed to the office's
// own onHook: a Codex session is a person at a desk like any other, with `agent: 'codex'` for its logo.
// CLI sessions expire when idle. While Codex Desktop runs, keep its latest main chat per project present at rest.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const DAY = 86400e3;
export const isCodexDesktopProcess = (p) => /OpenAI[\\/]Codex[\\/]|Codex\.app[\\/]|codex-desktop|--session-source[=\s]+["']?codex[-_ ]desktop/i.test(String(p?.args || ''));
const desktopSession = (f) => /desktop/i.test(f.origin || '') && !f.child;
const projectKey = (cwd) => process.platform === 'win32' ? String(cwd).replaceAll('\\', '/').toLowerCase() : String(cwd);
const SHELLS = new Set(['shell', 'shell_command', 'local_shell', 'container.exec', 'exec_command', 'unified_exec']);

const parse = (s) => { if (s && typeof s === 'object') return s; try { return JSON.parse(String(s ?? '')); } catch { return null; } };
// ['bash', '-lc', 'npm test'] / ['powershell.exe', '-Command', 'dir'] -> the command itself
function cmdOf(a) {
  if (typeof a === 'string') return a;
  if (!Array.isArray(a)) return '';
  const i = a.findIndex((x) => /^-(l?c|Command|NoProfile)$/i.test(String(x)));
  return (i >= 0 && a.length > i + 1 ? a.slice(i + 1) : a).filter((x) => !/^-NoProfile$/i.test(String(x))).join(' ');
}
// the files an apply_patch touches: "*** Add File: a", "*** Update File: b", "*** Delete File: c"
function patchFiles(text) {
  const out = [];
  for (const m of String(text || '').matchAll(/^\*\*\* (Add|Update|Delete) File: (.+)$/gm)) out.push({ op: m[1], file: m[2].trim() });
  return out;
}
const abs = (f, cwd) => (f && cwd && !path.isAbsolute(f) ? path.join(cwd, f) : f);
const textOf = (content) => (Array.isArray(content) ? content.map((c) => (typeof c === 'string' ? c : c?.text || '')).join('\n') : String(content ?? '')).trim();
// what you typed, in either way Codex writes it: event_msg user_message (older), event_msg item_completed with a
// UserMessage item (0.1xx and later)
function promptOf(j) {
  const p = j.payload;
  if (j.type !== 'event_msg') return null;
  if (p.type === 'user_message') return String(p.message || '').trim() || null;
  if (p.type === 'item_completed' && p.item?.type === 'UserMessage') return textOf(p.item.content) || null;
  return null;
}
// Codex's words: an assistant message among the response items (both formats), or its agent_message event
function replyOf(j) {
  const p = j.payload;
  if (j.type === 'response_item' && p.type === 'message' && p.role === 'assistant') return textOf(p.content) || null;
  if (j.type === 'event_msg' && p.type === 'agent_message') return String(p.message || '').trim() || null;
  if (j.type === 'event_msg' && p.type === 'item_completed' && p.item?.type === 'AgentMessage') return textOf(p.item.content ?? p.item.text) || null;
  return null;
}

/** A Codex tool call as Claude Code's: { tool_name, tool_input } (null: one the office doesn't show). */
export function toolOf(name, args, cwd = '') {
  const a = parse(args) || (typeof args === 'string' ? { input: args } : {});
  if (SHELLS.has(name)) return { tool_name: 'Bash', tool_input: { command: cmdOf(a.command ?? a.cmd ?? ''), ...(a.justification ? { description: String(a.justification) } : {}) } };
  if (name === 'write_stdin') return null;   // (more input for a command already shown)
  if (name === 'apply_patch') {
    const files = patchFiles(a.input ?? a.patch ?? args), f = files[0];
    if (!f) return { tool_name: 'Edit', tool_input: { file_path: '' } };
    return { tool_name: files.length === 1 && f.op === 'Add' ? 'Write' : 'Edit', tool_input: { file_path: abs(f.file, cwd), ...(files.length > 1 ? { files: files.map((x) => abs(x.file, cwd)) } : {}) } };
  }
  if (name === 'update_plan') return { tool_name: 'TodoWrite', tool_input: { todos: (a.plan || []).map((p) => ({ content: String(p.step || ''), status: p.status || 'pending' })) } };
  if (name === 'view_image') return { tool_name: 'Read', tool_input: { file_path: abs(a.path, cwd) } };
  if (name === 'web_search') return { tool_name: 'WebSearch', tool_input: { query: String(a.query || '') } };
  if (/__/.test(name) && !name.startsWith('mcp__')) return { tool_name: `mcp__${name}`, tool_input: a };   // (an MCP server's tool, server__tool)
  return { tool_name: name || 'tool', tool_input: a };
}
// a call's output: { text, failed } (shell outputs say their exit code, as JSON metadata or as "Exit code: N" text)
export function outputOf(o) {
  const j = parse(o), text = String(j && typeof j === 'object' ? j.output ?? j.content ?? o : o ?? '');
  const code = j?.metadata?.exit_code ?? (/^Exit code: (\d+)/m.exec(text)?.[1] != null ? Number(/^Exit code: (\d+)/m.exec(text)[1]) : null);
  const failed = (code != null && code !== 0) || /^(apply_patch verification failed|error:|execution error)/i.test(text.trim()) || j?.success === false;
  return { text: text.slice(0, 20000), failed };
}

/** The conversation in a rollout file, for the session drawer: [{ role: 'user' | 'claude' | 'tool', text | tool_name,
    tool_input, ts }], the last n. */
export async function readCodexLog(file, n = 120) {
  let fh;
  try { fh = await fsp.open(file, 'r'); } catch { return []; }
  try {
    const { size } = await fh.stat(), len = Math.min(size, 4_000_000), buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, size - len);
    const lines = buf.toString('utf8').split('\n'); if (size > len) lines.shift();
    const items = []; let cwd = '';
    for (const line of lines) {
      const j = parse(line); if (!j?.payload) continue;
      const p = j.payload, ts = j.timestamp ? Date.parse(j.timestamp) : 0;
      const said = promptOf(j), reply = replyOf(j);
      if (j.type === 'session_meta' || j.type === 'turn_context') cwd = p.cwd || cwd;
      else if (said) items.push({ role: 'user', text: said, ts });
      else if (reply) { const prev = items.findLast((x) => x.role !== 'tool'); if (!(prev?.role === 'claude' && prev.text === reply)) items.push({ role: 'claude', text: reply, ts }); }   // (once: its response item and its event say the same)
      else if (j.type === 'event_msg' && p.type === 'turn_aborted') items.push({ role: 'note', text: '', aborted: true, ts });
      else if (j.type === 'response_item' && (p.type === 'function_call' || p.type === 'custom_tool_call')) { const t = toolOf(p.name, p.arguments ?? p.input, cwd); if (t) items.push({ role: 'tool', ...t, ts }); }
      else if (j.type === 'response_item' && p.type === 'web_search_call') items.push({ role: 'tool', tool_name: 'WebSearch', tool_input: { query: String(p.action?.query || '') }, ts });
    }
    return items.slice(-n);
  } finally { await fh.close(); }
}

/** home() -> $CODEX_HOME; onEvent(payload) -> the office's onHook; procs() -> the codex processes running ([] none,
    null unknown). */
export function createCodexSessions({ home, onEvent, procs = async () => null, pollMs = 1500, idleMs = 30 * 60e3, log = () => {} }) {
  const files = new Map();   // file -> { off, sid, cwd, model, calls, buf, open, lastMsg, quietAt, seenAt, mtime, history }
  const headers = new Map(), closed = new Map();
  let timer = null, busy = false, first = true, procsAt = 0, running = null;

  const send = (f, ev, extra = {}) => {
    if (!f.sid) return;
    f.quietAt = Date.now();
    Promise.resolve(onEvent({ hook_event_name: ev, session_id: f.sid, cwd: f.cwd, agent: 'codex', codex_file: f.file, codex_model: f.model || '', ...extra })).catch((e) => log(`codex ${ev}: ${e.message}`));
  };

  // Recover recent desktop projects; tracked sessions remain watched even when their start date leaves this window.
  async function candidates() {
    const root = path.join(home(), 'sessions'), out = [];
    for (let d = 0; d < 7; d++) {
      const t = new Date(Date.now() - d * DAY), dir = path.join(root, String(t.getFullYear()), String(t.getMonth() + 1).padStart(2, '0'), String(t.getDate()).padStart(2, '0'));
      let names = []; try { names = await fsp.readdir(dir); } catch { continue; }
      for (const n of names) if (/^rollout-.*\.jsonl$/.test(n)) out.push(path.join(dir, n));
    }
    return [...new Set([...out, ...files.keys()])];
  }

  function line(f, j) {
    const p = j.payload; if (!p) return;
    const ts = j.timestamp ? Date.parse(j.timestamp) : Date.now();
    const old = f.history && ts < f.seenAt - 60e3;   // (a resumed conversation's earlier turns copied in: state only, no events)
    if (j.type === 'session_meta') {
      const fresh = !f.sid;
      // Desktop forks copy an ancestor's session_meta after their own. Never let it replace this file's identity.
      if (f.sid && p.id && p.id !== f.sid) return;
      f.sid = p.id || f.sid; f.cwd = p.cwd || f.cwd; f.origin = p.originator || f.origin || '';
      f.startedAt ||= ts;
      f.child = !!(p.source && typeof p.source === 'object' && p.source.subagent);
      f.version = p.cli_version || f.version || '';
      if (fresh && f.sid) send(f, 'SessionStart', { source: f.history ? 'resume' : 'startup', codex_origin: f.origin, codex_version: p.cli_version || '' });
      return;
    }
    if (f.startedAt && ts < f.startedAt) return;   // copied ancestor turns precede this fork's own metadata
    if (j.type === 'turn_context') { if (p.cwd) f.cwd = p.cwd; if (p.model) f.model = p.model; return; }
    if (old) return;
    const said = promptOf(j), reply = replyOf(j);
    if (said) { f.open = true; f.lastMsg = ''; f.lastKind = ''; send(f, 'UserPromptSubmit', { prompt: said }); return; }
    if (reply) { f.lastMsg = reply; f.lastKind = 'msg'; return; }
    if (j.type === 'event_msg') {
      switch (p.type) {
        case 'task_complete': {
          f.open = false; f.calls.clear();
          const err = p.error?.message ? String(p.error.message) : '';
          if (err && !p.last_agent_message) send(f, 'StopFailure', { error: /usage limit|rate.?limit|\b429\b/i.test(err) ? 'rate_limit' : 'error', last_assistant_message: err });
          else send(f, 'Stop', { last_assistant_message: String(p.last_agent_message ?? f.lastMsg ?? '') });
          break;
        }
        case 'turn_aborted': f.open = false; f.calls.clear(); send(f, 'Stop', { last_assistant_message: f.lastMsg || '', aborted: true }); break;
        case 'exec_approval_request': case 'apply_patch_approval_request': send(f, 'PermissionRequest', { ...(toolOf(p.type === 'exec_approval_request' ? 'shell' : 'apply_patch', p.type === 'exec_approval_request' ? { command: p.command } : { input: Object.keys(p.changes || {}).map((x) => `*** Update File: ${x}`).join('\n') }, f.cwd) || {}) }); break;
        case 'error': f.open = false; send(f, 'StopFailure', { error: /usage limit|rate.?limit/i.test(String(p.message || '')) ? 'rate_limit' : 'error', last_assistant_message: String(p.message || '') }); break;
        default: break;
      }
      return;
    }
    if (j.type !== 'response_item') return;
    if (p.type === 'function_call' || p.type === 'custom_tool_call') {
      const t = toolOf(p.name, p.arguments ?? p.input, f.cwd); f.lastKind = 'call';
      if (!t) return;
      f.open = true;
      f.calls.set(p.call_id || `${Date.now()}`, t);
      send(f, 'PreToolUse', t);
    } else if (p.type === 'function_call_output' || p.type === 'custom_tool_call_output') {
      const t = f.calls.get(p.call_id); if (!t) return;
      f.calls.delete(p.call_id);
      const o = outputOf(p.output);
      send(f, o.failed ? 'PostToolUseFailure' : 'PostToolUse', o.failed ? { ...t, error: o.text } : { ...t, tool_response: { stdout: o.text } });
    } else if (p.type === 'web_search_call') {
      const t = { tool_name: 'WebSearch', tool_input: { query: String(p.action?.query || '') } };
      send(f, 'PreToolUse', t); send(f, 'PostToolUse', { ...t, tool_response: {} });
    }
  }

  async function readMore(f, size) {
    if (size < f.off) f.off = 0;   // (written over: from the start)
    if (size === f.off) return;
    let fh;
    try {
      fh = await fsp.open(f.file, 'r');
      const len = Math.min(size - f.off, 8_000_000), buf = Buffer.alloc(len);
      await fh.read(buf, 0, len, f.off); f.off += len;
      f.buf += buf.toString('utf8');
    } catch { return; } finally { await fh?.close(); }
    let nl;
    while ((nl = f.buf.indexOf('\n')) >= 0) {
      const l = f.buf.slice(0, nl); f.buf = f.buf.slice(nl + 1);
      if (!l.trim()) continue;
      try { line(f, JSON.parse(l)); } catch { /* half a line, or not JSON */ }
    }
  }

  // a session already open when the office starts: its header only (who it is, where), then from the end on
  async function header(f) {
    let fh;
    try {
      fh = await fsp.open(f.file, 'r');
      const buf = Buffer.alloc(262144), { bytesRead } = await fh.read(buf, 0, buf.length, 0);
      for (const l of buf.toString('utf8', 0, bytesRead).split('\n')) {
        const j = parse(l); if (!j) continue;
        const ts = j.timestamp ? Date.parse(j.timestamp) : 0;
        if (j.type === 'turn_context' && (!f.startedAt || !ts || ts >= f.startedAt)) { f.cwd = j.payload?.cwd || f.cwd; f.model = j.payload?.model || f.model; }
        if (j.type === 'session_meta' && (!f.sid || j.payload?.id === f.sid)) {
          f.cwd = j.payload?.cwd || f.cwd; f.sid ||= j.payload?.id;
          f.startedAt ||= ts;
          f.origin = j.payload?.originator || f.origin || ''; f.version = j.payload?.cli_version || '';
          f.child = !!(j.payload?.source && typeof j.payload.source === 'object' && j.payload.source.subagent);
        }
      }
    } catch { /* gone */ } finally { await fh?.close(); }
  }

  async function poll() {
    if (busy) return; busy = true;
    try {
      const now = Date.now();
      if (now - procsAt > 10e3) { procsAt = now; running = await procs().catch(() => null); }
      const desktopOnline = Array.isArray(running) && running.some(isCodexDesktopProcess);
      const entries = (await Promise.all((await candidates()).map(async (file) => {
        try { return { file, st: await fsp.stat(file) }; } catch { return null; }
      }))).filter(Boolean).sort((a, b) => b.st.mtimeMs - a.st.mtimeMs);
      const present = new Set(entries.map(({ file }) => file));
      for (const cache of [headers, closed]) for (const file of cache.keys()) if (!present.has(file)) cache.delete(file);
      const latest = new Map();
      if (desktopOnline) for (const { file } of entries) {
        let meta = files.get(file) || headers.get(file);
        if (!meta) { meta = { file }; await header(meta); headers.set(file, meta); }
        if (desktopSession(meta) && meta.cwd && !latest.has(projectKey(meta.cwd))) latest.set(projectKey(meta.cwd), file);
      }
      const retained = new Set(latest.values());
      for (const { file, st } of entries) {
        let f = files.get(file);
        if (!f) {
          if (!retained.has(file) && (closed.get(file) === st.mtimeMs || now - st.mtimeMs > (first ? 10 * 60e3 : idleMs))) continue;
          f = { file, off: 0, sid: '', cwd: '', model: '', calls: new Map(), buf: '', open: false, lastMsg: '', quietAt: now, seenAt: now, mtime: st.mtimeMs, history: false };
          files.set(file, f);
          if (first || now - st.birthtimeMs > 120e3) {   // (an old file come back to life: `codex resume`)
            f.history = true;
            if (first || retained.has(file)) { await header(f); f.off = st.size; if (f.sid) send(f, 'SessionStart', { source: 'resume', codex_origin: f.origin || '', codex_version: f.version || '' }); }
          }
        }
        if (st.mtimeMs !== f.mtime || st.size !== f.off) { f.mtime = st.mtimeMs; await readMore(f, st.size); }
      }
      first = false;
      // which sessions are over: no codex running at all, or a file quiet for long
      for (const [file, f] of files) {
        const quiet = now - f.mtime;
        // (an older Codex writes no task_complete: its last answer, then a quiet moment, ends the turn)
        if (f.open && f.lastKind === 'msg' && !f.calls.size && quiet > 8000) { f.open = false; send(f, 'Stop', { last_assistant_message: f.lastMsg }); }
        if ((!retained.has(file) && quiet > idleMs) || (Array.isArray(running) && !running.length && quiet > 60e3)) {
          send(f, 'SessionEnd', { reason: quiet > idleMs ? 'idle' : 'exit' }); closed.set(file, f.mtime); files.delete(file);
        }
      }
    } catch (e) { log(`codex sessions: ${e.message}`); } finally { busy = false; }
  }

  return {
    start() { if (!timer && fs.existsSync(home())) log(`codex sessions: watching ${path.join(home(), 'sessions')}`); timer ??= setInterval(poll, pollMs); timer.unref?.(); poll(); },
    stop() { clearInterval(timer); timer = null; },
    poll,
    /** the sessions being followed: [{ sid, cwd, file, open }] */
    list: () => [...files.values()].filter((f) => f.sid).map((f) => ({ sid: f.sid, cwd: f.cwd, file: f.file, open: f.open, model: f.model })),
  };
}
