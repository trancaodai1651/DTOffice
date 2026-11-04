// The memory as a file in the project itself, for Claude Code and Codex alike: .ai-office/MEMORY.md, and a few lines in
// CLAUDE.md and AGENTS.md point to the compact index, handoff and durable memory. New automatic logs go to
// SESSION-LOG.md; old logs and handwritten memory are preserved. Only the office's instruction/log blocks are owned
// by the writer. INDEX.md and STATE.md belong to the agents and are never regenerated here.
import fs from 'node:fs';
import path from 'node:path';
import { redact } from './redact.mjs';

export const MEMORY_DIR = '.ai-office', MEMORY_FILE = 'MEMORY.md';
export const SESSION_LOG = 'SESSION-LOG.md';
const LOG_START = '<!-- office-log:start -->', LOG_END = '<!-- office-log:end -->';
const RULES_START = '<!-- my-office:memory:start -->', RULES_END = '<!-- my-office:memory:end -->';

const pad2 = (n) => String(n).padStart(2, '0');
const stamp = (t) => { const d = new Date(t); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const cliName = (a) => (a === 'codex' ? 'Codex CLI' : 'Claude Code');
const safe = (value, limit = 240) => redact(value).replace(/[\r\n]+/g, ' ').slice(0, limit);

/** Opt in only when a real compact project guide is present; older projects keep the JSON context fallback. */
export function projectContext(cwd, tr) {
  try {
    if (!['INDEX.md', 'STATE.md', MEMORY_FILE].every(name => fs.statSync(path.join(cwd, MEMORY_DIR, name)).isFile())) return '';
    return tr('server.memFile.context');
  } catch { return ''; }
}

/** Between two markers in a file's text: replaced when they are there, added at the end when not. */
export function putBlock(text, start, end, body) {
  const block = `${start}\n${body.trim()}\n${end}`;
  const i = text.indexOf(start), j = i >= 0 ? text.indexOf(end, i) : -1;
  if (i >= 0 && j > i) return `${text.slice(0, i)}${block}${text.slice(j + end.length)}`;
  return `${text.replace(/\s*$/, '')}${text.trim() ? '\n\n' : ''}${block}\n`;
}

/** One session in the log, in the office's words. */
export function logEntry(e, tr) {
  if (e.kind === 'note') return `### ${stamp(e.at)} · ${tr('server.memFile.note')}\n- ${safe(e.text, 500)}`;
  const who = [e.role, e.name && e.role ? (e.name !== e.role ? tr('server.memFile.sessionOf', { name: e.name }) : '') : e.name].filter(Boolean).join(' ') || tr('server.memFile.someone');
  const lines = [
    `### ${stamp(e.at)} · ${tr('server.memFile.who')}: ${safe(who)} · CLI: ${cliName(e.agent)}${e.model ? ` · Model: ${safe(e.model)}` : ''}${e.effort ? ` · Effort: ${safe(e.effort)}` : ''}`,
    `- ${tr('server.memFile.via')}: ${tr(e.via === 'office' ? 'server.memFile.viaOffice' : e.via === 'team' ? 'server.memFile.viaTeam' : 'server.memFile.viaUser')}`,
    ...(e.files?.length ? [`- ${tr('server.memFile.changed')}: ${e.files.map(f => safe(f)).join(', ')}${e.more ? ` (+${e.more})` : ''}`] : []),
    ...(e.cmds ? [`- ${tr('server.memFile.cmds')}: ${e.cmds}`] : []),
    `- ${tr('server.memFile.status')}: ${tr(e.failed ? 'server.memFile.stopped' : 'server.memFile.ended')}`,
  ];
  return lines.join('\n');
}

/** MEMORY.md as it should be: its rules and agents' notes as they are (or the first time, from the office's words),
 *  new logs live in SESSION-LOG.md. Legacy office-log blocks are intentionally left byte-for-byte intact. */
export function memoryText(old, { project, tr }) {
  let text = old || [
    `# ${tr('server.memFile.title', { project })}`, '',
    `> ${tr('server.memFile.about')}`, '',
    `## ${tr('server.memFile.rulesTitle')}`, '',
    ...tr('server.memFile.rules', null, 'list').map((r, i) => `${i + 1}. ${r.replace('{file}', `${MEMORY_DIR}/${MEMORY_FILE}`)}`), '',
    `## ${tr('server.memFile.notesTitle')}`, '',
    `_${tr('server.memFile.notesHint')}_`, '',
  ].join('\n');
  if (!text.includes(SESSION_LOG)) text = `${text.replace(/\s*$/, '')}\n\n${tr('server.memFile.logLink', { file: `${MEMORY_DIR}/${SESSION_LOG}` })}\n`;
  return text;
}

/** The lines for CLAUDE.md and AGENTS.md (the office's block in them). */
export const rulesBlock = (tr) => [`## ${tr('server.memFile.agentsTitle')}`, '', ...tr('server.memFile.agentsRules', null, 'list').map((r) => `- ${r.replace('{file}', `${MEMORY_DIR}/${MEMORY_FILE}`)}`)].join('\n');

/** Writes the project's memory file and the office's block in CLAUDE.md and AGENTS.md. -> the memory file's path, or
 *  null when the folder isn't there or can't be written. */
export function writeProjectMemory(cwd, entries, tr) {
  try {
    if (!cwd || !fs.statSync(cwd).isDirectory()) return null;
    const dir = path.join(cwd, MEMORY_DIR), file = path.join(dir, MEMORY_FILE);
    fs.mkdirSync(dir, { recursive: true });
    let old = ''; try { old = fs.readFileSync(file, 'utf8'); } catch { /* the first time */ }
    const next = memoryText(old, { project: path.basename(cwd), entries, tr });
    if (next !== old) fs.writeFileSync(file, next);
    const logFile = path.join(dir, SESSION_LOG);
    let oldLog = ''; try { oldLog = fs.readFileSync(logFile, 'utf8'); } catch { /* first log */ }
    const log = [`## ${tr('server.memFile.logTitle')}`, `_${tr('server.memFile.logHint')}_`,
      ...(entries.length ? entries.map(e => logEntry(e, tr)) : [`_${tr('server.memFile.logEmpty')}_`])].join('\n\n');
    const nextLog = putBlock(oldLog, LOG_START, LOG_END, log);
    if (nextLog !== oldLog) fs.writeFileSync(logFile, nextLog);
    const rules = rulesBlock(tr);
    for (const name of ['CLAUDE.md', 'AGENTS.md']) {
      const f = path.join(cwd, name);
      let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch { /* none yet */ }
      const n = putBlock(t, RULES_START, RULES_END, rules);
      if (n !== t) fs.writeFileSync(f, n);
    }
    return file;
  } catch { return null; }
}
