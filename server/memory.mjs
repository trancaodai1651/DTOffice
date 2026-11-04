// "Bộ nhớ phiên": what each session did in a project, kept when it ends and told to the next one as it starts.
// While a session runs, the office notes what it was asked (its prompts), the files it changed, how many commands it
// ran and its last answer; when it ends (SessionEnd, or the office no longer sees it), that becomes one entry in the
// project's memory (<data>/memory/<project>.json, 40 entries, newest first). A new session there reads it first:
// Claude Code through its SessionStart hook (additionalContext), Codex in the words the office gives it with work.
// Your own notes ("remember: …") sit in the same list. Kept as data and written out in the office's language when read.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeProjectMemory, projectContext } from './memory-file.mjs';

const MAX_ENTRIES = 40, MAX_PROMPTS = 5, MAX_FILES = 12, CONTEXT_CHARS = 4000;
const EDITS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
// the memory as the office adds it to what a CLI is told (wrap()): taken out of a prompt again before it is kept
const BLOCK = /<office-memory>[\s\S]*?(<\/office-memory>|$)/g;
/** The memory, marked, for the end of what a CLI is given to do. */
export const wrap = (text) => (text ? `\n\n<office-memory>\n${text}\n</office-memory>` : '');
const pad2 = (n) => String(n).padStart(2, '0');

/** a project's folder as a key: the same folder whatever its spelling (case on Windows, a trailing slash) */
export function projectKey(dir) {
  let d = path.resolve(String(dir || '')).replace(/[\\/]+$/, '');
  if (process.platform === 'win32') d = d.toLowerCase();
  return d;
}
const fileName = (dir) => `${path.basename(projectKey(dir)).replace(/[^\w.-]+/g, '_').slice(0, 40) || 'project'}-${crypto.createHash('sha1').update(projectKey(dir)).digest('hex').slice(0, 10)}.json`;

/**
 * @param {{ dir: string, tr: Function, clean?: (s: string, n: number) => string, now?: () => number, onSaved?: Function, on?: () => boolean, files?: () => boolean, about?: (s: object) => object|null }} o
 * files: also write the project's own memory file (.ai-office/MEMORY.md, server/memory-file.mjs); about(session): what
 * the office knows of who it is ({ role, via, model, effort }: a member of the team, work given from the office).
 */
export function createMemory({ dir, tr, clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n), now = Date.now, onSaved = () => {}, on = () => true, files = () => false, about = () => null }) {
  const journals = new Map();   // a session's key -> what it has done so far
  const fileOf = (cwd) => path.join(dir, fileName(cwd));
  function load(cwd) {
    try { const j = JSON.parse(fs.readFileSync(fileOf(cwd), 'utf8')); return Array.isArray(j?.entries) ? j : { cwd, entries: [] }; } catch { return { cwd, entries: [] }; }
  }
  function save(cwd, mem) {
    fs.mkdirSync(dir, { recursive: true });
    mem.entries = mem.entries.slice(0, MAX_ENTRIES);
    const f = fileOf(cwd), tmp = `${f}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify({ cwd: mem.cwd || cwd, entries: mem.entries }, null, 1)); fs.renameSync(tmp, f);
  }

  /** One hook event of a session (Claude Code's, or Codex's as server/codex-sessions.mjs sends them). */
  function observe(s, ev, p) {
    if (!s?.key || p?.agent_id) return;   // (a subagent's steps are its session's)
    const cwd = s.cwd || p?.cwd; if (!cwd) return;
    let j = journals.get(s.key);
    if (!j) { j = { cwd, agent: s.agent === 'codex' ? 'codex' : 'claude', name: s.title || s.name || '', at: now(), prompts: [], files: [], cmds: 0, reply: '', failed: false, model: '' }; journals.set(s.key, j); }
    j.name = s.title || s.name || j.name;
    j.sid ||= s.sid || '';
    const m = typeof p?.model === 'string' ? p.model : typeof p?.model?.id === 'string' ? p.model.id : p?.codex_model || s.model; if (m && typeof m === 'string') j.model = m;
    if (ev === 'UserPromptSubmit') { const t = clean(String(p.prompt ?? '').replace(BLOCK, ''), 240); if (t && j.prompts.length < MAX_PROMPTS && !j.prompts.includes(t)) j.prompts.push(t); }
    else if (ev === 'PostToolUse' && EDITS.has(p.tool_name)) {
      const f = String(p.tool_input?.file_path || p.tool_input?.notebook_path || ''); if (!f) return;
      const rel = path.relative(cwd, f); const shown = rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel.replace(/\\/g, '/') : path.basename(f);
      if (!j.files.includes(shown)) j.files.push(shown);
    } else if ((ev === 'PostToolUse' || ev === 'PostToolUseFailure') && p.tool_name === 'Bash') j.cmds++;
    else if (ev === 'Stop') { const t = clean(p.last_assistant_message, 500); if (t) { j.reply = t; j.failed = false; } }
    else if (ev === 'StopFailure') { j.failed = true; const t = clean(p.last_assistant_message || p.error, 300); if (t) j.reply = t; }
    else if (ev === 'SessionEnd') end(s.key, s);
  }
  // the project's own memory file, written again from the entries (when switched on)
  const sync = (cwd, entries = load(cwd).entries) => { if (files() && on()) writeProjectMemory(cwd, entries, tr); };
  /** The session is over: what it did, into its project's memory (nothing when it was never asked anything). s: its
   *  session, for its last answer when no Stop carried it (the office read it from the transcript: s.lastReply). */
  function end(key, s = null) {
    const j = journals.get(key); journals.delete(key);
    if (!j || !j.prompts.length || !on()) return null;
    if (!j.reply && s?.lastReply) j.reply = clean(s.lastReply, 500);
    const who = { ...(about({ sid: j.sid || s?.sid, key }) || {}), ...(j.who || {}) };
    const mem = load(j.cwd);
    const entry = { id: crypto.randomUUID().slice(0, 8), kind: 'session', at: now(), started: j.at, agent: j.agent, name: j.name, role: who.role || '', via: who.via || 'user', model: who.model || j.model || '', effort: who.effort || '', prompts: who.ask ? [clean(who.ask, 240)] : j.prompts, files: j.files.slice(0, MAX_FILES), more: Math.max(0, j.files.length - MAX_FILES), cmds: j.cmds, reply: j.reply, failed: j.failed };
    mem.cwd = j.cwd; mem.entries.unshift(entry);
    try { save(j.cwd, mem); } catch { return null; }
    sync(j.cwd, mem.entries);
    onSaved({ cwd: j.cwd, entry, name: entry.role || j.name });
    return entry;
  }
  /** Work the office gave ended (its CLI has exited): its session is over, whatever its file says yet. What the run
   *  itself knows fills in what the session's events didn't bring (Codex's file read a moment late, say). */
  function finish({ key, cwd, agent = 'claude', name = '', prompt = '', reply = '', failed = false, who = null }) {
    const k = key || `run:${cwd}:${now()}`;
    let j = journals.get(k);
    if (!j) { j = { cwd, agent, name, at: now(), prompts: [], files: [], cmds: 0, reply: '', failed: false }; journals.set(k, j); }
    const p = clean(String(prompt ?? '').replace(BLOCK, ''), 240); if (p && !j.prompts.length) j.prompts.push(p);
    const r = clean(reply, 500); if (r && !j.reply) { j.reply = r; j.failed = failed; }
    if (who) j.who = who;
    return end(k);
  }
  // (day/month hour:minute, the way both languages here write it)
  const when = (t) => { const d = new Date(t); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const line = (e) => {
    if (e.kind === 'note') return `- ${when(e.at)} · ${tr('server.memory.yourNote')}: ${e.text}`;
    const bits = [
      e.prompts?.length && tr('server.memory.asked', { list: e.prompts.map((x) => `“${x}”`).join('; ') }),
      e.files?.length && tr('server.memory.changed', { list: `${e.files.join(', ')}${e.more ? ` (+${e.more})` : ''}` }),
      e.cmds && tr('server.memory.cmds', { n: e.cmds }),
      e.reply && tr(e.failed ? 'server.memory.failed' : 'server.memory.result', { text: e.reply }),
    ].filter(Boolean);
    return `- ${when(e.at)} · ${e.agent === 'codex' ? 'Codex' : 'Claude Code'}${e.model ? ` (${e.model})` : ''}${e.role ? ` · ${e.role}` : ''}${e.name ? ` · ${e.name}` : ''}: ${bits.join(' ')}`;
  };
  /** The memory as words for a new session there ('' when there is none, or it is off). */
  function context(cwd) {
    if (!cwd || !on()) return '';
    // A prepared project has durable context on disk: avoid injecting its session history a second time.
    const guide = files() && projectContext(cwd, tr);
    const { entries } = load(cwd); if (!guide && !entries.length) return '';
    let out = `${guide || tr('server.memory.head')}\n`;
    // Pinned user notes must still reach the next session even when history is lookup-only.
    for (const e of guide ? entries.filter(e => e.kind === 'note') : entries) { const l = `${line(e)}\n`; if (out.length + l.length > CONTEXT_CHARS) break; out += l; }
    return out.trim();
  }
  return {
    observe, end, finish, context,
    count: (cwd) => (cwd ? load(cwd).entries.length : 0),
    entries: (cwd) => load(cwd).entries.map((e) => ({ ...e, line: line(e).slice(2) })),
    note(cwd, text) {
      const t = clean(text, 500); if (!t) return false;
      const mem = load(cwd); mem.cwd = cwd; mem.entries.unshift({ id: crypto.randomUUID().slice(0, 8), kind: 'note', at: now(), text: t }); save(cwd, mem); sync(cwd, mem.entries); return true;
    },
    remove(cwd, id) { const mem = load(cwd), n = mem.entries.length; mem.entries = mem.entries.filter((e) => e.id !== id); if (mem.entries.length === n) return false; save(cwd, mem); sync(cwd, mem.entries); return true; },
    clear(cwd) { try { fs.rmSync(fileOf(cwd), { force: true }); sync(cwd, []); return true; } catch { return false; } },
    /** the project's memory file (and CLAUDE.md / AGENTS.md's lines) written now: before a session there starts */
    sync: (cwd) => sync(cwd),
    /** the sessions being followed (the tests) */
    open: () => journals.size,
  };
}
