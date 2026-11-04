// Your projects: the folders work is given in (the guide, 📋 Giao việc, the AI Agent teams). Sessions working somewhere
// add their folder on their own; here you add any folder of yours by its path, or take one off the list (the folder on
// disk is left alone, and a session working there doesn't bring it back: only adding it again does). server/index.mjs
// keeps the list (/api/projects); adding and removing is for this computer only.
import { el } from '../core/env.js';
import { TOKEN } from '../net/live.js';
import { t as tr } from '../../i18n/index.js';

const q = () => (TOKEN ? `?k=${encodeURIComponent(TOKEN)}` : '');

/** The list: [{ dir (with ~), path, name, here }], or null when the office can't be reached. */
export async function fetchProjects() {
  const r = await fetch(`/api/projects${q()}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
  return r?.ok ? r.projects : null;
}
async function edit(op, dir) {
  return fetch(`/api/projects${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op, dir }) })
    .then((x) => x.json()).catch(() => ({ ok: false, message: tr('projects.unreachable') }));
}

/**
 * A pick-one list of your projects with ✕ to take one off and a field to add one.
 * @param {{ value?: string, onPick?: (p: object | null) => void, onList?: (list: object[]) => void }} o value: the folder picked (its `dir`)
 */
export function projectPicker({ value = '', onPick = () => {}, onList = () => {} } = {}) {
  const box = el('div', 'pj-box'), list = el('div', 'pj-list'), msg = el('p', 'pj-msg'); msg.hidden = true;
  list.setAttribute('role', 'radiogroup'); list.setAttribute('aria-label', tr('projects.title'));
  let projects = [], picked = value;
  const say = (text) => { msg.textContent = text || ''; msg.hidden = !text; };
  function draw() {
    list.replaceChildren();
    if (!projects.length) list.append(el('p', 'pj-empty', tr('projects.empty')));
    for (const p of projects) {
      const row = el('div', 'pj-row'), b = el('button', 'pj-pick'); b.type = 'button';
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(p.dir === picked));
      b.append(el('b', null, p.name), el('small', null, p.here ? p.dir : `${p.dir} · ${tr('projects.gone')}`));
      b.disabled = !p.here;
      b.addEventListener('click', () => { picked = p.dir; draw(); onPick(p); });
      const x = el('button', 'pj-del', '✕'); x.type = 'button'; x.title = tr('projects.remove', { name: p.name }); x.setAttribute('aria-label', x.title);
      x.addEventListener('click', async () => {
        if (!confirm(tr('projects.removeAsk', { name: p.name }))) return;
        const r = await edit('del', p.path);
        if (!r.ok) { say(r.message || tr('projects.unreachable')); return; }
        say(''); set(r.projects);
        if (picked === p.dir) { picked = ''; onPick(null); }
      });
      row.append(b, x); list.append(row);
    }
  }
  function set(l) { projects = l || []; draw(); onList(projects); }
  // adding one: its full path (copied from the file explorer's address bar)
  const add = el('form', 'pj-add'), input = el('input', 'pj-in'), go = el('button', 'pj-go', tr('projects.add'));
  input.type = 'text'; input.placeholder = tr('projects.addPh'); input.setAttribute('aria-label', tr('projects.addPh')); input.spellcheck = false; go.type = 'submit';
  input.addEventListener('keydown', (e) => e.stopPropagation());
  add.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dir = input.value.trim(); if (!dir) { input.focus(); return; }
    go.disabled = true;
    const r = await edit('add', dir);
    go.disabled = false;
    if (!r.ok) { say(r.message || tr('projects.unreachable')); return; }
    input.value = ''; say('');
    set(r.projects);
    const p = projects.find((x) => x.path === r.dir) || projects[0];
    if (p) { picked = p.dir; draw(); onPick(p); }
  });
  add.append(input, go);
  box.append(list, add, el('small', 'pj-hint', tr('projects.hint')), msg);
  list.append(el('p', 'pj-empty', tr('projects.loading')));
  fetchProjects().then((l) => { if (l) { set(l); const p = projects.find((x) => x.dir === picked && x.here); if (p) onPick(p); else if (picked) { picked = ''; onPick(null); } } else say(tr('projects.unreachable')); });
  return box;
}
