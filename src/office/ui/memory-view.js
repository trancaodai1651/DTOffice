// "Bộ nhớ dự án" (server/memory.mjs): what a project remembers from its sessions, over the 📋 sheet. Each entry is
// what one session was asked, changed and answered; your own notes sit with them. Take one out, add a note, clear it
// all, or switch the memory off (every project: nothing kept, nothing read).
import { el } from '../core/env.js';
import { toast } from './activity.js';
import { TOKEN } from '../net/live.js';
import { t as tr } from '../../i18n/index.js';

const q = (more = '') => `${TOKEN ? `?k=${encodeURIComponent(TOKEN)}&` : '?'}${more}`;
const post = (body) => fetch(`/api/memory${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => ({ ok: false }));

/** The memory of the project in `dir` (as the office writes it, ~/…), over `host`. */
export async function openMemory(host, dir, name = '') {
  host.querySelector('.zc-memo')?.remove();
  const box = el('div', 'zc-memo'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', tr('chat.memory.title'));
  const close = el('button', 'zc-ib', '✕'); close.type = 'button'; close.title = tr('chat.close'); close.setAttribute('aria-label', close.title);
  close.addEventListener('click', () => box.remove());
  const head = el('div', 'zc-task-head'); head.append(el('b', null, `🧠 ${tr('chat.memory.title')}${name ? ` · ${name}` : ''}`), close);
  box.append(head, el('p', 'zc-task-note', tr('chat.memory.lead')));
  const list = el('div', 'zc-memo-list'), acts = el('div', 'zc-memo-acts');
  const field = el('input'); field.placeholder = tr('chat.memory.notePh'); field.maxLength = 500;
  field.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') add.click(); });
  const add = el('button', 'zc-task-tool', tr('chat.memory.add')); add.type = 'button';
  const form = el('div', 'zc-memo-add'); form.append(field, add);
  let on = true, files = true, filePath = '', entries = [];
  const fileLine = el('p', 'zc-task-note zc-memo-file');
  function draw() {
    list.replaceChildren(...(entries.length ? entries.map((e) => {
      const row = el('div', `zc-memo-row${e.kind === 'note' ? ' is-note' : ''}`), x = el('button', null, '✕'); x.type = 'button';
      x.title = tr('chat.memory.remove'); x.setAttribute('aria-label', x.title);
      x.addEventListener('click', async () => { const r = await post({ op: 'del', dir, id: e.id }); if (r.ok) { entries = r.entries; draw(); } });
      row.append(el('span', null, e.line), x); return row;
    }) : [el('p', 'zc-task-note', on ? tr('chat.memory.empty') : tr('chat.memory.offNote'))]));
    const sw = el('button', 'zc-task-tool', on ? tr('chat.memory.turnOff') : tr('chat.memory.turnOn')); sw.type = 'button';
    sw.addEventListener('click', async () => { const r = await post({ op: 'on', on: !on }); if (r.ok) { on = r.on; toast(tr(on ? 'chat.memory.isOn' : 'chat.memory.isOff'), 4000); draw(); } });
    const clear = el('button', 'zc-task-tool', tr('chat.memory.clear')); clear.type = 'button'; clear.hidden = !entries.length;
    let sure = false;
    clear.addEventListener('click', async () => {
      if (!sure) { sure = true; clear.textContent = tr('chat.memory.clearSure'); setTimeout(() => { sure = false; clear.textContent = tr('chat.memory.clear'); }, 4000); return; }
      const r = await post({ op: 'clear', dir }); if (r.ok) { entries = r.entries || []; draw(); }
    });
    // the project's own memory file (.ai-office/MEMORY.md, read by Claude Code and Codex through CLAUDE.md / AGENTS.md)
    const fb = el('button', 'zc-task-tool', files ? tr('chat.memory.fileOff') : tr('chat.memory.fileOn')); fb.type = 'button';
    fb.addEventListener('click', async () => { const r = await post({ op: 'files', on: !files, dir }); if (r.ok) { files = r.files; draw(); } });
    fileLine.textContent = files && filePath ? tr('chat.memory.fileAt', { file: filePath }) : tr('chat.memory.fileNone');
    acts.replaceChildren(sw, fb, clear);
    form.hidden = !on;
  }
  add.addEventListener('click', async () => {
    const text = field.value.trim(); if (!text) return;
    const r = await post({ op: 'note', dir, text });
    if (r.ok) { field.value = ''; entries = r.entries; draw(); } else toast(r.message || tr('drawer.unreachable'), 5000);
  });
  box.append(fileLine, form, list, acts);
  host.append(box);
  const r = await fetch(`/api/memory${q(`dir=${encodeURIComponent(dir)}`)}`).then((x) => x.json()).catch(() => null);
  if (!r?.ok) { list.replaceChildren(el('p', 'zc-task-note', tr('drawer.unreachable'))); return; }
  on = r.on; files = r.files !== false; filePath = r.file || ''; entries = r.entries || []; draw();
}
