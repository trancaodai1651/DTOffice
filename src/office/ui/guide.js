// The guide ("Hướng dẫn viên"): a member of staff whose job is helping you use the office. Always at hand in the
// corner (her chibi face, from the same portraits as everyone here); a word of welcome on a first visit. Her desk is a
// panel of topics, each a few steps in the office's language and a "show me" that opens the very thing (📋 Giao việc,
// the limits, the CLIs, the tour…). Ask her in your own words: the topics whose words match come first.
// She also takes work: tell her the task, she asks which project and finds the AI Agent team(s) for it (ui/guide-work.js).
import { state } from '../core/state.js';
import { $, STATIC, el } from '../core/env.js';
import { avatar } from './chat-avatars.js';
import { openTask, openTeam, toggle as toggleChat } from './group-chat-view.js';
import { togglePlan, togglePop } from './settings.js';
import { startTips } from './tips.js';
import { openSetup } from './setup.js';
import { workFlow } from './guide-work.js';
import { t as tr } from '../../i18n/index.js';

const LOOK = { shirt: '#3FA37C', hair: '#3A2418', style: 'bun', acc: null, outfit: 'shirt', skin: null };
const SEEN = 'office-guide-hello';
// her topics, in the order she offers them; `act`: what "show me" does
const TOPICS = ['start', 'team', 'task', 'run', 'memory', 'memfile', 'limits', 'approve', 'chat', 'sessions', 'cli', 'lang', 'replay', 'phone', 'tour', 'trouble'];
const ACTS = {
  team: () => openTeam(),
  task: () => openTask(),
  run: () => openTask(),
  memory: () => openTask(),
  memfile: () => openTask(),
  limits: () => { const b = $('btn-plan'); if (b && !b.hidden) togglePlan(true); },
  chat: () => toggleChat(true),
  cli: () => openSetup(),
  lang: () => togglePop(true),
  replay: () => $('btn-replay')?.click(),
  phone: () => ($('btn-phone-top') || $('btn-phone'))?.click(),
  tour: () => startTips(),
};
// her words without accents and in lower case, so "giao viec" finds "Giao việc"
const plain = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

let btn = null, panel = null, bubble = null;
function face(size) { return avatar({ key: '__guide', name: tr('guide.name'), look: LOOK }, size); }

function topicCard(k, back) {
  const box = el('div', 'gd-topic');
  const head = el('div', 'gd-topic-head'), up = el('button', 'gd-back', '‹'); up.type = 'button'; up.title = tr('guide.back'); up.setAttribute('aria-label', up.title);
  up.addEventListener('click', back);
  head.append(up, el('b', null, tr(`guide.topics.${k}.title`)));
  const steps = el('ol', 'gd-steps');
  for (const s of tr(`guide.topics.${k}.steps`, null, 'list') || []) steps.append(el('li', null, s));
  box.append(head, el('p', 'gd-lead', tr(`guide.topics.${k}.lead`)), steps);
  if (ACTS[k]) {
    const go = el('button', 'gd-go', tr('guide.showMe')); go.type = 'button';
    go.addEventListener('click', () => { close(); ACTS[k](); });
    box.append(go);
  }
  return box;
}
function home() {
  const body = el('div', 'gd-body');
  const ask = el('input', 'gd-ask'); ask.type = 'search'; ask.placeholder = tr('guide.askPh'); ask.setAttribute('aria-label', tr('guide.askPh'));
  ask.addEventListener('keydown', (e) => e.stopPropagation());
  const list = el('div', 'gd-list'), none = el('p', 'gd-none', tr('guide.noMatch'));
  const open = (k) => { body.replaceChildren(topicCard(k, () => { body.replaceChildren(...homeParts); ask.focus({ preventScroll: true }); })); };
  const items = TOPICS.map((k) => {
    const b = el('button', 'gd-item'); b.type = 'button';
    b.append(el('b', null, tr(`guide.topics.${k}.title`)), el('small', null, tr(`guide.topics.${k}.lead`)));
    b.addEventListener('click', () => open(k));
    // (a word in her title or keywords counts most, then in the line under it, then in the steps)
    return { k, b, top: plain(`${tr(`guide.topics.${k}.title`)} ${tr(`guide.topics.${k}.keys`)}`), mid: plain(tr(`guide.topics.${k}.lead`)), low: plain((tr(`guide.topics.${k}.steps`, null, 'list') || []).join(' ')) };
  });
  const filter = () => {
    const words = plain(ask.value).split(/\s+/).filter((w) => w.length > 1);
    const score = (x) => words.reduce((n, w) => n + (x.top.includes(w) ? 3 : x.mid.includes(w) ? 2 : x.low.includes(w) ? 1 : 0), 0);
    const scored = items.map((x) => ({ ...x, n: words.length ? score(x) : 1 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
    list.replaceChildren(...scored.map((x) => x.b));
    none.hidden = !!scored.length;
    if (!scored.length) list.replaceChildren(...items.slice(0, 4).map((x) => x.b));
  };
  ask.addEventListener('input', filter);
  ask.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const first = list.querySelector('.gd-item'); if (first) first.click(); } });
  // the first thing she offers: giving her a task for the AI Agent teams
  const work = el('button', 'gd-work'); work.type = 'button';
  work.append(el('b', null, tr('guide.work.title')), el('small', null, tr('guide.work.lead')));
  work.addEventListener('click', () => { body.replaceChildren(workFlow({ back: () => { body.replaceChildren(...homeParts); ask.focus({ preventScroll: true }); }, openTeam: () => { close(); openTeam(); } })); });
  const homeParts = [el('p', 'gd-hello', tr('guide.hello')), work, ask, none, list];
  filter(); body.replaceChildren(...homeParts);
  return body;
}
function close() { if (panel) panel.hidden = true; btn?.setAttribute('aria-expanded', 'false'); }
/** Open her panel; work: straight to giving her a task. */
export function openGuide(work = false) {
  open();
  if (work) panel.querySelector('.gd-work')?.click();
}
function open() {
  hideBubble();
  if (!panel) {
    panel = el('div', 'gd-panel'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', tr('guide.title'));
    document.body.append(panel);
  }
  const head = el('div', 'gd-head'), who = el('div', 'gd-who'), x = el('button', 'gd-x', '✕'); x.type = 'button'; x.title = tr('chat.close'); x.setAttribute('aria-label', x.title);
  x.addEventListener('click', close);
  who.append(el('b', null, tr('guide.name')), el('small', null, tr('guide.role')));
  head.append(face(44), who, x);
  panel.replaceChildren(head, home());
  panel.hidden = false; btn.setAttribute('aria-expanded', 'true');
  setTimeout(() => panel.querySelector('.gd-ask')?.focus({ preventScroll: true }), 30);
}
function hideBubble() { bubble?.remove(); bubble = null; }

/** Her place in the corner, and a first word of welcome once. */
export function setup() {
  if (btn) return;
  btn = el('button', 'gd-btn'); btn.type = 'button'; btn.id = 'btn-guide';
  btn.title = `${tr('guide.name')} · ${tr('guide.role')}`; btn.setAttribute('aria-label', btn.title); btn.setAttribute('aria-expanded', 'false');
  btn.append(face(46), el('span', 'gd-tag', tr('guide.tag')));
  btn.addEventListener('click', () => (panel && !panel.hidden ? close() : open()));
  document.body.append(btn);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel && !panel.hidden) close(); });
  let seen = true; try { seen = localStorage.getItem(SEEN) === '1'; } catch { /* storage blocked */ }
  if (!seen && !STATIC) {
    setTimeout(() => {
      if (state.covered || (panel && !panel.hidden)) return;
      bubble = el('button', 'gd-bubble', tr('guide.welcome')); bubble.type = 'button';
      bubble.addEventListener('click', open);
      document.body.append(bubble);
      try { localStorage.setItem(SEEN, '1'); } catch { /* storage blocked */ }
      setTimeout(hideBubble, 14000);
    }, 4000);
  }
}
