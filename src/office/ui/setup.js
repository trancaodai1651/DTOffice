// The first run (server/setup.mjs): which CLIs the office connects to, Claude Code, Codex or both. Shown on this
// computer only, until a choice is made; Settings opens it again. Starting installs what is missing and wires Claude
// Code's hooks, step by step ({ k: 'setup' }), then offers to sign in to each CLI that isn't yet.
import { state } from '../core/state.js';
import { $, el } from '../core/env.js';
import { t as tr, lang } from '../../i18n/index.js';
import { setLang } from './settings.js';
import { renderLimits } from './mac-drawer.js';

let cur = null, box = null, choice = null, open = false, dismissed = false;
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => ({ ok: false }));
const NAMES = { claude: 'Claude Code', codex: 'Codex' };

function card(key, title, sub, badges) {
  const b = el('button', `su-card${choice === key ? ' is-sel' : ''}`); b.type = 'button'; b.dataset.k = key;
  b.setAttribute('aria-pressed', String(choice === key));
  const tags = el('span', 'su-tags');
  for (const [text, ok] of badges) tags.append(el('em', ok ? 'su-tag is-ok' : 'su-tag', text));
  b.append(el('b', null, title), el('span', 'su-sub', sub), tags);
  b.addEventListener('click', () => { choice = key; render(); });
  return b;
}
const pickOf = (c) => (c === 'both' ? ['claude', 'codex'] : c ? [c] : []);

function render() {
  if (!box) return;
  const s = cur || {}, job = s.job, pane = el('div', 'su-pane');
  pane.setAttribute('role', 'dialog'); pane.setAttribute('aria-modal', 'true'); pane.setAttribute('aria-label', tr('setup.title'));
  // the office's language, right here (the app starts in the computer's own; the choice reloads the page)
  const langs = el('div', 'su-langs');
  for (const [l, name] of [['vi', 'Tiếng Việt'], ['en', 'English']]) {
    const b = el('button', `su-lang${lang() === l ? ' is-sel' : ''}`, name); b.type = 'button';
    b.addEventListener('click', () => setLang(l));
    langs.append(b);
  }
  const top = el('div', 'su-top'); top.append(el('h2', null, tr('setup.title')), langs);
  pane.append(top);
  if (!job || (!job.running && !job.steps?.length)) {
    const tag = (a) => [s[a]?.cli ? tr('setup.installed') : tr('setup.willInstall'), !!s[a]?.cli];
    choice ??= s.agents ? (s.agents.length > 1 ? 'both' : s.agents[0]) : s.claude?.cli && s.codex?.cli ? 'both' : s.codex?.cli && !s.claude?.cli ? 'codex' : 'claude';
    const cards = el('div', 'su-cards');
    cards.append(card('claude', tr('setup.claude'), tr('setup.claudeSub'), [tag('claude')]),
      card('codex', tr('setup.codex'), tr('setup.codexSub'), [tag('codex')]),
      card('both', tr('setup.both'), tr('setup.bothSub'), [[`Claude: ${tag('claude')[0]}`, !!s.claude?.cli], [`Codex: ${tag('codex')[0]}`, !!s.codex?.cli]]));
    const acts = el('div', 'su-acts'), go = el('button', 'btn btn--confirm', tr('setup.start')), later = el('button', 'btn', tr('setup.later'));
    go.type = later.type = 'button';
    go.addEventListener('click', async () => { go.disabled = true; const r = await post('/api/setup', { agents: pickOf(choice) }); if (!r.ok) go.disabled = false; });
    later.addEventListener('click', () => { dismissed = true; hide(); });
    acts.append(later, go);
    pane.append(el('p', 'su-lead', tr('setup.lead')), cards, acts);
  } else {
    const list = el('ul', 'su-steps');
    for (const st of job.steps) {
      const li = el('li', `su-step is-${st.state}`);
      li.append(el('i', 'su-dot'), el('span', null, tr(`setup.step.${st.key}`)));
      if (st.note) li.append(el('small', 'su-note', st.note));
      list.append(li);
    }
    pane.append(el('p', 'su-lead', job.running ? tr('setup.working') : job.ok ? tr('setup.doneOk') : tr('setup.doneFail')), list);
    if (!job.running) {
      const signs = el('div', 'su-signs');
      for (const a of job.agents) {
        if (!s[a]?.cli) continue;
        if (s[a].signedIn) { signs.append(el('span', 'su-tag is-ok', tr('setup.signedIn', { name: NAMES[a] }))); continue; }
        const b = el('button', 'btn btn--sm', tr('setup.signIn', { name: NAMES[a] })); b.type = 'button';
        b.addEventListener('click', () => post('/api/setup/login', { agent: a }));
        signs.append(b);
      }
      if (signs.childElementCount) pane.append(signs);
      if (signs.querySelector('button')) pane.append(el('small', 'su-hint', tr('setup.signHint')));
      const acts = el('div', 'su-acts');
      if (!job.ok) { const again = el('button', 'btn', tr('setup.retry')); again.type = 'button'; again.addEventListener('click', () => post('/api/setup', { agents: job.agents })); acts.append(again); }
      const done = el('button', 'btn btn--confirm', tr('setup.close')); done.type = 'button';
      done.addEventListener('click', () => { dismissed = true; hide(); });
      acts.append(done); pane.append(acts);
    }
  }
  box.replaceChildren(pane);
}
function show() {
  if (!box) { box = el('div', 'su-overlay'); document.body.append(box); box.addEventListener('click', (e) => { if (e.target === box && cur?.agents) hide(); }); }
  box.hidden = false; open = true; render();
}
function hide() { if (box) box.hidden = true; open = false; }
/** Settings' button: the choice again. */
export function openSetup() { dismissed = false; choice = null; if (cur) cur = { ...cur, job: null }; show(); }

/** The setup's state, from the snapshot and { k: 'setup' } (null on a phone: it is the computer's to choose). */
export function setSetup(s) {
  if (!s || !state.isLocal) return;
  cur = s; state.setupInfo = s;
  renderLimits();   // (Claude Code CLI signed in or not: the limits card's sign-in button)
  addSettingsButton();
  if (open) render();
  else if (!s.agents && !dismissed) show();
}
function addSettingsButton() {
  const pop = $('pop-look');
  if (!pop || pop.querySelector('.su-open')) return;
  const b = el('button', 'btn btn--sm su-open', tr('setup.reopen')); b.type = 'button';
  b.addEventListener('click', openSetup);
  pop.append(b);
}
