// "Giao việc": giving Claude work from the group chat (server/tasks.mjs runs it on the Mac). A sheet over the chat: who
// it goes to (a conversation, carried on with its whole context as a branch of it, or a new conversation in a folder
// sessions have worked in), what to do (typed, or spoken: 🎤 in the office's language), photos (from the camera or the
// gallery, made smaller here before they go). From a phone only once the Mac allows it (the phone window).
import { el } from '../core/env.js';
import { icon } from './icons.js';
import { toast } from './activity.js';
import { avatar } from './chat-avatars.js';
import { who } from './group-chat.js';
import { TOKEN } from '../net/live.js';
import { openMemory } from './memory-view.js';
import { projectPicker } from './projects.js';
import { t as tr, locale } from '../../i18n/index.js';

const q = () => (TOKEN ? `?k=${encodeURIComponent(TOKEN)}` : '');
let sheet = null;

/* ---------- speaking instead of typing: the browser's speech recognition, in the office's language ---------- */
const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const canDictate = () => !!SR && window.isSecureContext;
/** 🎤 on a button: speak, and the words go into the field as they come; again to stop. -> stop() */
export function dictate(btn, field, onChange) {
  if (!canDictate()) { toast(tr('chat.task.noMic'), 6000); return null; }
  const rec = new SR(), start = field.value, sep = start && !/\s$/.test(start) ? ' ' : '';
  rec.lang = locale() === 'vi-VN' ? 'vi-VN' : 'en-US'; rec.interimResults = true; rec.continuous = true;
  let done = '';
  rec.onresult = (e) => {
    let live = '';
    for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) done += e.results[i][0].transcript; else live += e.results[i][0].transcript; }
    field.value = `${start}${sep}${done}${live}`.slice(0, 4000); onChange?.();
  };
  const end = () => { btn.classList.remove('is-rec'); btn.setAttribute('aria-pressed', 'false'); };
  rec.onend = end; rec.onerror = (e) => { end(); if (e.error === 'not-allowed') toast(tr('chat.task.micBlocked'), 6000); };
  try { rec.start(); } catch { end(); return null; }
  btn.classList.add('is-rec'); btn.setAttribute('aria-pressed', 'true');
  return () => { try { rec.stop(); } catch { /* stopped */ } end(); };
}

/* ---------- photos: made smaller here (1600 px, JPEG) so they go quickly over a phone's connection ---------- */
export async function shrink(file) {
  const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  let url = c.toDataURL('image/jpeg', 0.82);
  if (url.length > 480_000) url = c.toDataURL('image/jpeg', 0.6);   // (under what the group chat shows too)
  return url;
}

/** Opens the sheet inside the chat window; to: { sid } (a conversation) or { dir } (a folder) to start with; text. */
export async function openTaskSheet(host, { to = null, text = '' } = {}) {
  sheet?.remove();
  let stopMic = null;
  const r = await fetch(`/api/tasks${q()}`).then((x) => x.json()).catch(() => null);
  sheet = el('div', 'zc-task'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', tr('chat.task.title'));
  const head = el('div', 'zc-task-head'), close = el('button', 'zc-ib'); close.type = 'button'; close.title = tr('chat.close'); close.append(icon('x'));
  close.addEventListener('click', () => { stopMic?.(); sheet.remove(); sheet = null; });
  head.append(el('b', null, `📋 ${tr('chat.task.title')}`), close);
  sheet.append(head);
  if (!r?.ok) { sheet.append(el('p', 'zc-task-note', tr('drawer.unreachable'))); host.append(sheet); return; }
  if (!r.allowed) { sheet.append(el('p', 'zc-task-note', tr('chat.task.notAllowed'))); host.append(sheet); return; }
  // who it goes to: the conversations (their folder), then "a new one in…" each folder
  const toSid = to?.id ? r.sessions.find((s) => s.id === to.id)?.sid : to?.sid;
  let pick = toSid ? { sid: toSid } : to?.dir ? { dir: to.dir } : r.sessions[0] ? { sid: r.sessions[0].sid } : r.projects[0] ? { dir: r.projects[0].dir } : null;
  const list = el('div', 'zc-task-list');
  const option = (key, label, sub, face, sel) => {
    const b = el('button', `zc-task-o${sel ? ' is-on' : ''}`); b.type = 'button';
    const t = el('span', 'zc-men-t'); t.append(el('b', null, label), el('small', null, sub)); b.append(face, t);
    b.addEventListener('click', () => { pick = key; for (const x of list.querySelectorAll('.zc-task-o')) x.classList.toggle('is-on', x === b); sync(); });
    return b;
  };
  if (r.sessions.length) list.append(el('small', 'zc-task-h', tr('chat.task.conversations')));
  for (const s of r.sessions) list.append(option({ sid: s.sid }, s.name, `${s.agent === 'codex' ? 'Codex · ' : ''}📁 ${s.dir}`, avatar({ ...(who(s.id) || {}), key: s.id, name: s.name }, 30), pick?.sid === s.sid));
  // "a new one in…" your projects; added or taken off the list right here (ui/projects.js)
  const projBox = el('div', 'zc-task-projects');
  const drawProjects = () => {
    projBox.replaceChildren();
    if (r.projects.length) projBox.append(el('small', 'zc-task-h', tr('chat.task.newIn')));
    for (const p of r.projects) { const f = el('span', 'zc-task-folder', '📁'); projBox.append(option({ dir: p.dir }, p.name, p.dir, f, pick?.dir === p.dir && !pick.sid)); }
  };
  drawProjects();
  const manage = el('details', 'zc-task-manage');
  manage.append(el('summary', null, `📁 ${tr('chat.task.manageProjects')}`));
  manage.addEventListener('toggle', () => {
    if (!manage.open || manage.querySelector('.pj-box')) return;
    let first = true;
    manage.append(projectPicker({ value: pick?.dir || '', onPick: (p) => { if (p) { pick = { dir: p.dir }; drawProjects(); sync(); } }, onList: (l) => {
      if (first) { first = false; return; }   // (its first reading: the list as it was)
      r.projects = l.filter((p) => p.here).map((p) => ({ dir: p.dir, name: p.name, memory: r.projects.find((x) => x.dir === p.dir)?.memory || 0 }));
      if (pick?.dir && !r.projects.some((p) => p.dir === pick.dir)) pick = null;
      drawProjects(); sync();
    } }));
  });
  list.append(projBox, manage);
  // what to do: typed or spoken, and photos
  const field = el('textarea', 'zc-task-in'); field.rows = 4; field.maxLength = 4000; field.placeholder = tr('chat.task.placeholder'); field.value = text;
  field.addEventListener('keydown', (e) => e.stopPropagation());
  const photos = [], thumbs = el('div', 'zc-task-thumbs');
  const drawThumbs = () => thumbs.replaceChildren(...photos.map((u, i) => { const t = el('span', 'zc-task-thumb'), img = el('img'), x = el('button', null, '✕'); img.src = u; x.type = 'button'; x.addEventListener('click', () => { photos.splice(i, 1); drawThumbs(); sync(); }); t.append(img, x); return t; }));
  const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.multiple = true; file.hidden = true;
  file.addEventListener('change', async () => { for (const f of [...file.files].slice(0, 4 - photos.length)) { try { photos.push(await shrink(f)); } catch { /* not an image it can read */ } } file.value = ''; drawThumbs(); sync(); });
  const mic = el('button', 'zc-task-tool'); mic.type = 'button'; mic.title = tr('chat.task.mic'); mic.append(icon('mic'), el('span', null, tr('chat.task.mic')));
  mic.addEventListener('click', () => { if (stopMic) { stopMic(); stopMic = null; } else stopMic = dictate(mic, field, sync); });
  const cam = el('button', 'zc-task-tool'); cam.type = 'button'; cam.title = tr('chat.task.photo'); cam.append(icon('image'), el('span', null, tr('chat.task.photo')));
  cam.addEventListener('click', () => file.click());
  const tools = el('div', 'zc-task-tools'); tools.append(mic, cam, file);
  // what the place picked remembers (server/memory.mjs): read by the session first; opens the memory window
  const memLine = el('button', 'zc-task-mem'); memLine.type = 'button';
  memLine.addEventListener('click', () => { const t = target(); if (t?.dir) openMemory(sheet.parentElement || sheet, t.dir, t.name); });   // (over the whole chat window, not inside the sheet's scroll)
  const target = () => (pick?.sid ? r.sessions.find((s) => s.sid === pick.sid) : pick?.dir ? r.projects.find((p) => p.dir === pick.dir) : null);
  const next = el('button', 'zc-task-go', tr('chat.task.next')); next.type = 'button';
  const step1 = el('div', 'zc-task-step');
  step1.append(list, field, thumbs, tools, memLine, el('p', 'zc-task-note', tr('chat.task.note')), next);
  if (r.running.length) step1.append(el('p', 'zc-task-note', tr('chat.task.running', { n: r.running.length })));
  const step2 = el('div', 'zc-task-step'); step2.hidden = true;
  const sync = () => {
    next.disabled = !pick || !field.value.trim();
    const t = target(), n = t?.memory || 0;
    memLine.hidden = !t || r.memoryOn === false;
    memLine.textContent = `🧠 ${n ? tr('chat.task.memory', { n }) : tr('chat.task.memoryNone')} · ${tr('chat.task.memoryOpen')}`;
  };
  field.addEventListener('input', sync);
  next.addEventListener('click', () => { stopMic?.(); stopMic = null; step1.hidden = true; step2.hidden = false; drawRun(step2, r, pick, target(), () => { step2.hidden = true; step1.hidden = false; }, send); offerTeam(step2, r, field.value, target()); });
  async function send(run, go) {
    go.disabled = true; go.textContent = tr('chat.task.sending');
    const res = await fetch(`/api/tasks${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pick, text: field.value, images: photos, fresh: !!pick.dir, ...run }) }).then((x) => x.json()).catch(() => null);
    if (res?.ok) { toast(tr('chat.task.started'), 5000); sheet.remove(); sheet = null; return; }
    toast(res?.message || tr('drawer.unreachable'), 6000); go.textContent = tr('chat.task.send'); go.disabled = false;
  }
  sheet.append(step1, step2);
  host.append(sheet);
  sync(); setTimeout(() => field.focus({ preventScroll: true }), 50);
}

/* ---------- the second step: which CLI, which model, how much effort ----------
   A conversation goes on with the CLI it is in; a folder may take either one that is set up. The models are each CLI's
   own (Codex's from its list, with the efforts each takes); "Mặc định" leaves it to the CLI. The last choice of each CLI
   comes back next time (this browser). */
const RUN_KEY = 'office-task-run';
const lastRun = () => { try { return JSON.parse(localStorage.getItem(RUN_KEY) || '{}') || {}; } catch { return {}; } };
const keepRun = (agent, run) => { try { localStorage.setItem(RUN_KEY, JSON.stringify({ ...lastRun(), agent, [agent]: run })); } catch { /* private mode */ } };
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
/* ---------- a task for the AI Agent Dev team's work (routeTeams, server/team.mjs): the staff in those positions take it ----------
   Offered, never done on its own: "give it to the team" starts the team's run in the same folder (its PM plans, each
   position comes to the boss to take its part and then works at its own desk); "one session" keeps the plain task. */
async function offerTeam(box, r, text, t) {
  const dir = t?.dir; if (!dir || !String(text || '').trim()) return;
  const route = await fetch(`/api/team/route${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }).then((x) => x.json()).catch(() => null);
  const hit = route?.ok && route.teams.find((x) => x.words?.length);
  if (!hit) return;
  const box2 = el('div', 'zc-task-team');
  const say = el('p', 'zc-task-note', tr('chat.task.teamOffer', { team: tr(`team.teams.${hit.id}`), words: hit.words.slice(0, 4).join(', ') }));
  const give = el('button', 'zc-task-go', tr('chat.task.teamGive')); give.type = 'button';
  const msg = el('p', 'zc-task-note');
  give.addEventListener('click', async () => {
    give.disabled = true; give.textContent = tr('team.sending');
    const agent = r.claude !== false ? 'claude' : 'codex';
    const res = await fetch(`/api/team${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dir, goal: text, teams: [hit.id], lead: 'pm', agent }) }).then((x) => x.json()).catch(() => null);
    if (res?.ok) { toast(tr('team.started'), 6000); sheet?.remove(); sheet = null; return; }
    msg.textContent = res?.message || tr('drawer.unreachable'); give.disabled = false; give.textContent = tr('chat.task.teamGive');
  });
  box2.append(say, give, msg);
  box.prepend(box2);
}
function drawRun(box, r, pick, t, back, send) {
  const models = r.models || { claude: [], codex: [] }, saved = lastRun();
  const fixed = pick?.sid ? (t?.agent === 'codex' ? 'codex' : 'claude') : null;   // (a conversation: its own CLI)
  const can = (a) => (a === 'codex' ? r.codex : r.claude !== false);
  let agent = fixed || (can(saved.agent) ? saved.agent : can('claude') ? 'claude' : 'codex');
  let model = saved[agent]?.model || '', effort = saved[agent]?.effort || '';
  const chips = (cls, items, on, pickOne) => {
    const row = el('div', `zc-run-chips ${cls}`);
    for (const [k, label, sub] of items) {
      const b = el('button', `zc-run-chip${k === on ? ' is-on' : ''}`); b.type = 'button'; b.setAttribute('aria-pressed', String(k === on));
      b.append(el('b', null, label)); if (sub) b.append(el('small', null, sub));
      b.addEventListener('click', () => pickOne(k));
      row.append(b);
    }
    return row;
  };
  const effortName = (e) => (EFFORTS.includes(e) ? tr(`chat.task.effort.${e}`) : e);
  function draw() {
    const list = models[agent] || [], m = list.find((x) => x.id === model);
    if (model && !m) model = '';
    const efforts = m?.efforts || (agent === 'codex' ? [...new Set(list.flatMap((x) => x.efforts))] : models.claude[0]?.efforts || []);
    if (effort && !efforts.includes(effort)) effort = '';
    const head = el('div', 'zc-run-head'), backBtn = el('button', 'zc-ib'); backBtn.type = 'button'; backBtn.title = tr('chat.task.back'); backBtn.setAttribute('aria-label', backBtn.title); backBtn.textContent = '‹';
    backBtn.addEventListener('click', back);
    head.append(backBtn, el('b', null, tr('chat.task.runTitle')));
    const where = el('p', 'zc-task-note', t ? tr('chat.task.runFor', { name: t.name }) : '');
    const cli = chips('is-cli', [['claude', 'Claude Code', can('claude') ? '' : tr('ai.tab.noCli')], ['codex', 'Codex CLI', can('codex') ? '' : tr('ai.tab.noCli')]], agent, (a) => {
      if (fixed || !can(a) || a === agent) return;
      agent = a; model = lastRun()[a]?.model || ''; effort = lastRun()[a]?.effort || ''; draw();
    });
    for (const b of cli.querySelectorAll('button')) b.disabled = !!fixed && !b.classList.contains('is-on');
    const def = agent === 'codex' && m?.def ? tr('chat.task.effortDef', { effort: effortName(m.def) }) : '';
    const modelRow = chips('is-model', [['', tr('chat.task.modelDefault'), tr('chat.task.modelDefaultSub')], ...list.map((x) => [x.id, x.name, x.id === x.name ? '' : x.id])], model, (k) => { model = k; draw(); });
    const effortRow = chips('is-effort', [['', tr('chat.task.effortDefault'), def], ...efforts.map((e) => [e, effortName(e)])], effort, (k) => { effort = k; draw(); });
    const go = el('button', 'zc-task-go', tr('chat.task.send')); go.type = 'button';
    go.addEventListener('click', () => { keepRun(agent, { model, effort }); send({ agent, model, effort }, go); });
    const sum = el('p', 'zc-run-sum', `${agent === 'codex' ? 'Codex' : 'Claude Code'} · ${m ? m.name : tr('chat.task.modelDefault')} · ${effort ? effortName(effort) : tr('chat.task.effortDefault')}`);
    box.replaceChildren(head, where, el('small', 'zc-task-h', tr('chat.task.runWith')), cli,
      ...(fixed ? [el('p', 'zc-task-note', tr('chat.task.fixedCli', { cli: fixed === 'codex' ? 'Codex' : 'Claude Code' }))] : []),
      el('small', 'zc-task-h', tr('chat.task.model')), modelRow,
      ...(agent === 'codex' && !list.length ? [el('p', 'zc-task-note', tr('chat.task.noCodexModels'))] : []),
      el('small', 'zc-task-h', tr('chat.task.effortH')), effortRow, sum, go);
  }
  draw();
}
