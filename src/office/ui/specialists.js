// Talking to the specialists (server/specialists.mjs): a panel like the guide's, with their face.
//   the news reader asks the topic (and, if you like, where to save), then reads; when the summary is ready (a PDF) it
//   opens by itself with the PDF and the question "a video of it?": yes passes it to the video editor.
//   the video editor asks what the video is about, its footage (found on the web, or a folder of yours), where to save
//   it and its format; it says which skills it learnt and offers to install ffmpeg when the computer has none.
// The CLI, model and effort are asked as everywhere else (📋 Giao việc), and remembered.
import { el } from '../core/env.js';
import { TOKEN } from '../net/live.js';
import { avatar } from './chat-avatars.js';
import { toast } from './activity.js';
import { t as tr } from '../../i18n/index.js';

const q = () => (TOKEN ? `?k=${encodeURIComponent(TOKEN)}` : '');
const KEEP = 'office-specialists';
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
const LOOK = {
  news: { shirt: '#C8553D', hair: '#2B1B12', style: 'bob', acc: 'glasses', outfit: 'shirt', skin: null },
  video: { shirt: '#2E86AB', hair: '#1C1C22', style: 'spiky', acc: null, outfit: 'shirt', skin: null },
};
let panel = null, open = '', info = null, jobs = [], seenDone = new Set(), primed = false, prefill = null;
let newsDraft = '';
function kept() { try { return JSON.parse(localStorage.getItem(KEEP) || '{}') || {}; } catch { return {}; } }
function keep(v) { try { localStorage.setItem(KEEP, JSON.stringify({ ...kept(), ...v })); } catch { /* storage blocked */ } }
const post = (url, b) => fetch(`${url}${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((x) => x.json()).catch(() => ({ ok: false, message: tr('specialists.unreachable') }));
function select(label, items, value, onChange) {
  const wrap = el('label', 'gw-field'), s = el('select');
  wrap.append(el('small', null, label), s);
  for (const [v, text] of items) { const o = el('option', null, text); o.value = v; if (v === value) o.selected = true; s.append(o); }
  s.addEventListener('change', () => onChange(s.value));
  return wrap;
}
function input(label, value, ph) {
  const wrap = el('label', 'gw-field gw-wide'), i = el('input', 'pj-in'); i.type = 'text'; i.value = value || ''; i.placeholder = ph || ''; i.spellcheck = false;
  i.addEventListener('keydown', (e) => e.stopPropagation());
  wrap.append(el('small', null, label), i); return [wrap, i];
}
// the CLI, model and effort (as 📋 Giao việc), remembered per specialist
function runFields(kind, pick) {
  const box = el('div', 'gw-fields');
  const can = (a) => (a === 'codex' ? info?.codex : info?.claude !== false);
  if (!can(pick.agent)) pick.agent = can('claude') ? 'claude' : 'codex';
  const draw = () => {
    const models = info?.models?.[pick.agent] || [], m = models.find((x) => x.id === pick.model);
    if (pick.model && !m) pick.model = '';
    const efforts = m?.efforts || (pick.agent === 'codex' ? [...new Set(models.flatMap((x) => x.efforts))] : info?.models?.claude?.[0]?.efforts || []);
    if (pick.effort && !efforts.includes(pick.effort)) pick.effort = '';
    box.replaceChildren(
      select(tr('specialists.cli'), [['claude', 'Claude Code'], ['codex', 'Codex CLI']].filter(([a]) => can(a)), pick.agent, (v) => { pick.agent = v; pick.model = ''; pick.effort = ''; draw(); }),
      select(tr('specialists.model'), [['', tr('chat.task.modelDefault')], ...models.map((x) => [x.id, x.name])], pick.model, (v) => { pick.model = v; draw(); }),
      select(tr('specialists.effort'), [['', tr('chat.task.effortDefault')], ...efforts.map((e) => [e, EFFORTS.includes(e) ? tr(`chat.task.effort.${e}`) : e])], pick.effort, (v) => { pick.effort = v; }),
    );
  };
  draw();
  return box;
}
const say = (text) => el('p', 'gw-say', text);
function jobCard(j) {
  const card = el('div', `sp-job is-${j.status}`), head = el('div', 'sp-job-head');
  head.append(el('b', null, j.topic || j.brief || ''), el('em', `tm-badge is-${j.status === 'print' ? 'run' : j.status}`, tr(`specialists.status.${j.status}`)));
  card.append(head);
  const acts = el('div', 'sp-acts');
  const openBtn = (what, label) => { const b = el('button', 'gw-prev', label); b.type = 'button'; b.addEventListener('click', async () => { const r = await post('/api/specialists/open', { id: j.id, what }); if (!r.ok) toast(r.message || tr('specialists.unreachable'), 5000); }); return b; };
  if (j.kind === 'news' && j.status === 'done') {
    if (j.pdf) acts.append(openBtn('pdf', tr('specialists.news.openPdf'))); else card.append(el('small', 'gw-why', tr('specialists.news.noPdf')));
    acts.append(openBtn('dir', tr('specialists.news.openDir')));
  }
  if (j.kind === 'video' && j.status === 'done') {
    if (j.video) acts.append(openBtn('video', tr('specialists.video.openVideo'))); else card.append(el('small', 'gw-why', tr('specialists.video.plan')));
    acts.append(openBtn('dir', tr('specialists.video.openDir')));
  }
  if (j.status === 'run') { const b = el('button', 'gw-prev', tr('specialists.stop')); b.type = 'button'; b.addEventListener('click', () => post('/api/specialists/stop', { id: j.id })); acts.append(b); }
  if (acts.childElementCount) card.append(acts);
  if (j.status === 'done' && j.summary) { const d = el('details', 'sp-sum'); d.append(el('summary', null, '…'), el('p', null, j.summary)); card.append(d); }
  return card;
}

/* ---------- the news reader ---------- */
function newsBody(body) {
  const pick = { agent: '', model: '', effort: '', ...kept().news };
  const topic = el('textarea', 'gw-in'); topic.rows = 3; topic.maxLength = 500; topic.value = newsDraft; topic.placeholder = tr('specialists.news.topicPh'); topic.setAttribute('aria-label', tr('specialists.news.topicPh'));
  topic.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) go.click(); });
  const [whereBox, where] = input(tr('specialists.news.where'), pick.dir || '', '');
  const go = el('button', 'gd-go', tr('specialists.news.go')); go.type = 'button'; go.disabled = !topic.value.trim();
  topic.addEventListener('input', () => { newsDraft = topic.value; go.disabled = !topic.value.trim(); });
  go.addEventListener('click', async () => {
    go.disabled = true; go.textContent = tr('specialists.sending');
    const r = await post('/api/specialists/news', { topic: topic.value, dir: where.value.trim(), agent: pick.agent, model: pick.model, effort: pick.effort });
    go.textContent = tr('specialists.news.go');
    if (!r.ok) { toast(r.message || tr('specialists.unreachable'), 6000); go.disabled = false; return; }
    keep({ news: { agent: pick.agent, model: pick.model, effort: pick.effort, dir: where.value.trim() } }); newsDraft = ''; topic.value = ''; draw();
  });
  // the report just finished, waiting for an answer: a video of it?
  const ready = jobs.find((j) => j.kind === 'news' && j.status === 'done' && !j.asked && !seenDone.has(`asked:${j.id}`));
  const parts = [say(tr('specialists.news.hello')), topic, whereBox, runFields('news', pick), go];
  if (ready) {
    const yes = el('button', 'gd-go', tr('specialists.news.yesVideo')), no = el('button', 'gw-prev', tr('specialists.news.noVideo')); yes.type = no.type = 'button';
    yes.addEventListener('click', () => { seenDone.add(`asked:${ready.id}`); prefill = { from: ready.id, topic: ready.topic }; openSpecialist('video'); });
    no.addEventListener('click', () => { seenDone.add(`asked:${ready.id}`); draw(); });
    const acts = el('div', 'gw-acts'); acts.append(no, yes);
    const box = el('div', 'sp-ready'); box.append(say(tr('specialists.news.done', { topic: ready.topic })), jobCard(ready), say(tr('specialists.news.askVideo')), acts);
    parts.unshift(box);
  }
  body.replaceChildren(...parts, recent('news'));
}
/* ---------- the video editor ---------- */
function videoBody(body) {
  const pick = { agent: '', model: '', effort: '', source: 'web', format: 'short', ...kept().video }, from = prefill; prefill = null;
  const brief = el('textarea', 'gw-in'); brief.rows = 3; brief.maxLength = 2000; brief.placeholder = tr('specialists.video.briefPh'); brief.setAttribute('aria-label', tr('specialists.video.briefPh'));
  brief.addEventListener('keydown', (e) => e.stopPropagation());
  const fromLine = from ? el('p', 'sp-from', `📰 ${tr('specialists.video.fromNews', { topic: from.topic })}`) : null;
  // the footage: found on the web, or a folder of yours
  const src = el('fieldset', 'gw-teams'); src.append(el('legend', null, tr('specialists.video.source')));
  const [inBox, inp] = input('', pick.input || '', tr('specialists.video.inputPh')); inBox.hidden = pick.source !== 'folder';
  for (const [v, label] of [['web', tr('specialists.video.sourceWeb')], ['folder', tr('specialists.video.sourceFolder')]]) {
    const l = el('label', 'gw-team'), r = el('input'); r.type = 'radio'; r.name = 'sp-src'; r.value = v; r.checked = pick.source === v;
    r.addEventListener('change', () => { pick.source = v; inBox.hidden = v !== 'folder'; sync(); });
    l.append(r, el('span', null, label)); src.append(l);
  }
  src.append(inBox);
  const [outBox, out] = input(tr('specialists.video.out'), pick.out || '', tr('specialists.video.outPh'));
  const fmt = select(tr('specialists.video.format'), [['short', tr('specialists.video.short9')], ['long', tr('specialists.video.long16')]], pick.format, (v) => { pick.format = v; });
  fmt.classList.add('gw-wide');
  const go = el('button', 'gd-go', tr('specialists.video.go')); go.type = 'button';
  const sync = () => { go.disabled = (!brief.value.trim() && !from) || (pick.source === 'folder' && !inp.value.trim()); };
  brief.addEventListener('input', sync); inp.addEventListener('input', sync); sync();
  go.addEventListener('click', async () => {
    go.disabled = true; go.textContent = tr('specialists.sending');
    const r = await post('/api/specialists/video', { brief: brief.value, source: pick.source, input: inp.value.trim(), from: from?.from || '', out: out.value.trim(), format: pick.format, agent: pick.agent, model: pick.model, effort: pick.effort });
    go.textContent = tr('specialists.video.go');
    if (!r.ok) { toast(r.message || tr('specialists.unreachable'), 6000); sync(); return; }
    keep({ video: { agent: pick.agent, model: pick.model, effort: pick.effort, source: pick.source, input: inp.value.trim(), out: out.value.trim(), format: pick.format } }); brief.value = '';
  });
  const fields = el('div', 'gw-fields'); fields.append(outBox, fmt);
  const parts = [say(tr('specialists.video.hello')), ...(fromLine ? [fromLine] : []), brief, src, fields, runFields('video', pick)];
  // ffmpeg and the skills
  if (info && !info.tools?.ffmpeg) {
    const warn = el('div', 'sp-warn'), b = el('button', 'gw-prev', tr('specialists.video.installFfmpeg')); b.type = 'button';
    b.addEventListener('click', async () => { const r = await post('/api/specialists/ffmpeg', {}); toast(r.ok ? tr('specialists.video.installing') : r.message || tr('specialists.unreachable'), 7000); });
    warn.append(el('small', null, tr('specialists.video.noFfmpeg')), b); parts.push(warn);
  }
  const sk = info?.tools?.skills || [];
  if (sk.length) parts.push(el('small', 'gw-why', tr('specialists.video.skills', { n: sk.length, names: sk.join(', ') })));
  parts.push(go, recent('video'));
  body.replaceChildren(...parts);
  setTimeout(() => brief.focus({ preventScroll: true }), 30);
}
function recent(kind) {
  const box = el('div', 'sp-recent'), mine = jobs.filter((j) => j.kind === kind).slice(0, 5);
  box.append(el('small', 'zc-task-h', tr('specialists.recent')), ...(mine.length ? mine.map(jobCard) : [el('p', 'gw-why', tr('specialists.none'))]));
  return box;
}

function draw() {
  if (!panel || !open) return;
  const body = panel.querySelector('.gd-body');
  if (open === 'news') newsBody(body); else videoBody(body);
}
async function load() {
  info = await fetch(`/api/specialists${q()}`).then((x) => x.json()).catch(() => null);
  if (info?.ok) setJobs(info.jobs);
}
/** Open one of them: 'news' or 'video'. */
export function openSpecialist(kind, options = {}) {
  if (kind === 'news' && typeof options.topic === 'string') newsDraft = options.topic.slice(0, 500);
  if (!panel) {
    panel = el('div', 'gd-panel sp-panel'); panel.setAttribute('role', 'dialog');
    document.body.append(panel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel && !panel.hidden) closeSpecialist(); });
  }
  open = kind;
  panel.setAttribute('aria-label', tr(`specialists.${kind}.name`));
  const head = el('div', 'gd-head'), who = el('div', 'gd-who'), x = el('button', 'gd-x', '✕'); x.type = 'button'; x.title = tr('specialists.close'); x.setAttribute('aria-label', x.title);
  x.addEventListener('click', closeSpecialist);
  who.append(el('b', null, tr(`specialists.${kind}.name`)), el('small', null, tr('specialists.title')));
  head.append(avatar({ key: `__${kind}`, name: tr(`specialists.${kind}.name`), look: LOOK[kind] }, 44), who, x);
  const body = el('div', 'gd-body');
  panel.replaceChildren(head, body);
  panel.hidden = false;
  draw();
  load().then(draw);
}
export function closeSpecialist() { if (panel) panel.hidden = true; open = ''; }
/** The jobs changed ({ k: 'specialists' }): the panel drawn again; a news report just done opens the reader's question. */
export function setJobs(list) {
  jobs = Array.isArray(list) ? list : [];
  const done = jobs.filter((j) => j.kind === 'news' && j.status === 'done' && !j.asked);
  for (const j of done) {
    if (seenDone.has(j.id)) continue;
    seenDone.add(j.id);
    if (primed && open !== 'news') openSpecialist('news');   // (one that ended while you were here, not one from before)
  }
  primed = true;
  draw();
}
export function setup() {
  fetch(`/api/specialists${q()}`).then((x) => x.json()).then((r) => { if (r?.ok) { info = r; setJobs(r.jobs); } }).catch(() => {});
}
