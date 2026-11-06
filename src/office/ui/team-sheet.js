// "Đội AI Agent Dev" (server/team.mjs): you are the CEO. A sheet over the group chat: the 15 agents in their five groups, how a
// goal goes through them (CEO → PM + PO + BA → Architect + UI/UX → Frontend + Backend + App + AI → QA + Reviewer +
// Security → DevOps + Database), a goal to give (which project, to the PM or the CTO, which CLI, model and effort), and
// each run's stages as they go ({ k: 'team' }).
import { $, el, HQ } from '../core/env.js';
import { liveTeamEnabled } from '../people/ai-team.js';
import { createTeamRoster } from './team-roster.js';
import { openSession } from './session-drawer.js';
import { goView } from './camera-bar.js';
import { openLayoutSettings } from './settings.js';
import { toast } from './activity.js';
import { expandOffice } from './expand.js';
import { TOKEN } from '../net/live.js';
import { projectPicker } from './projects.js';
import { t as tr } from '../../i18n/index.js';

const q = () => (TOKEN ? `?k=${encodeURIComponent(TOKEN)}` : '');
const KEY = 'office-team-run';
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
let sheet = null, runsBox = null, lastRuns = [];
let disposeRoster = null, restoreModal = null, returnFocus = null, dismissOnClose = null;
const effortName = (e) => (EFFORTS.includes(e) ? tr(`chat.task.effort.${e}`) : e);
const keep = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ } };
const kept = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };

function select(label, items, value, onChange) {
  const wrap = el('label', 'tm-field'), s = el('select');
  wrap.append(el('small', null, label), s);
  for (const [v, text] of items) { const o = el('option', null, text); o.value = v; if (v === value) o.selected = true; s.append(o); }
  s.addEventListener('change', () => onChange(s.value));
  return wrap;
}
function flow(stages) {
  const box = el('ol', 'tm-flow');
  const ceo = el('li', 'tm-step is-ceo'); ceo.append(el('b', null, tr('team.ceo')), el('small', null, tr('team.ceoSub'))); box.append(ceo);
  for (const s of stages) {
    const li = el('li', 'tm-step');
    li.append(el('b', null, s.roles.map((id) => tr(`team.roles.${id}.name`).replace(/ Agent$/, '')).join(' + ')), el('small', null, tr(`team.stages.${s.key}`)));
    box.append(li);
  }
  return box;
}
// the marketing department: its 18 positions by group, each with what it does; the manager first, who takes your task
function marketingOrg(mk) {
  const box = el('div', 'tm-mk-org');
  for (const g of mk.groups) {
    const col = el('div', `tm-group is-${g}`); col.append(el('h3', null, tr(`team.marketing.groups.${g}`)));
    const ul = el('ul', 'tm-mk-list');
    for (const r of mk.roles.filter((x) => x.group === g)) { const li = el('li'); li.append(el('b', null, tr(`team.roles.${r.id}.name`)), el('small', null, ` · ${tr(`team.roles.${r.id}.duty`)}`)); ul.append(li); }
    col.append(ul); box.append(col);
  }
  return box;
}
function drawRuns() {
  if (!runsBox) return;
  if (!lastRuns.length) { runsBox.replaceChildren(el('p', 'zc-task-note', tr('team.noRuns'))); return; }
  runsBox.replaceChildren(...lastRuns.slice(0, 5).map((r) => {
    const card = el('div', `tm-run is-${r.status}`), head = el('div', 'tm-run-head');
    head.append(el('b', null, `${tr(`team.roles.${r.lead}.name`)} · ${r.dir.split(/[\\/]/).pop()}`), el('em', `tm-badge is-${r.status}`, tr(`team.status.${r.status}`)));
    card.append(head, el('p', 'tm-goal', r.goal));
    const meta = [(r.teams || []).length > 1 ? tr('team.teamOf', { teams: r.teams.map((id, i) => `${i === r.ti ? '▸ ' : ''}${tr(`team.teams.${id}`)}`).join(' → ') }) : '', r.agent === 'codex' ? 'Codex' : 'Claude Code', r.model, r.effort && effortName(r.effort), r.fixes ? tr('team.fixes', { n: r.fixes }) : ''].filter(Boolean).join(' · ');
    card.append(el('small', 'tm-meta', meta));
    const list = el('ol', 'tm-stages');
    for (const s of r.stages) {
      const li = el('li', `tm-st is-${s.state}`);
      li.append(el('i', 'tm-dot'), el('span', null, `${tr(`team.stages.${s.key}`)}${s.verdict ? ` · ${tr(`team.verdict.${s.verdict}`)}` : ''}`));
      // each member: a session of its own, with its own state, verdict and last words
      const jobs = el('div', 'tm-jobs');
      for (const j of s.jobs || []) {
        const held = j.state === 'wait' && j.held ? (j.held.why === 'code' ? tr('team.heldCode') : tr('team.held', { name: tr(`team.roles.${j.held.role}.name`) })) : '';
        const c = el('span', `tm-job is-${j.state}${held ? ' is-held' : ''}`), name = tr(`team.roles.${j.role}.name`);
        c.append(el('i', 'tm-dot'), el('span', null, `${name.replace(/ Agent$/, '')}${j.verdict ? ` · ${tr(`team.verdict.${j.verdict}`)}` : ''}`));
        if (held) c.append(el('small', 'tm-held', '⏳'));
        c.title = `${name}: ${held || tr(`team.job.${j.state}`)}${j.summary ? `

${j.summary}` : ''}`;
        jobs.append(c);
      }
      li.append(jobs);
      list.append(li);
    }
    card.append(list);
    // stopped (by you, or the office closing under it) or failed: carried on where it was
    if (r.status === 'stopped' || r.status === 'fail') {
      const go = el('button', 'zc-task-tool', tr('team.resume')); go.type = 'button';
      go.addEventListener('click', async () => { go.disabled = true; const res = await fetch(`/api/team/resume${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id }) }).then((x) => x.json()).catch(() => null); if (!res?.ok) { toast(res?.message || tr('drawer.unreachable'), 6000); go.disabled = false; } });
      card.append(go);
    }
    if (r.status === 'run') {
      const stop = el('button', 'zc-task-tool', tr('team.stop')); stop.type = 'button';
      stop.addEventListener('click', async () => { stop.disabled = true; await fetch(`/api/team/stop${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id }) }).catch(() => null); });
      card.append(stop);
    }
    return card;
  }));
}
/** The team's runs changed ({ k: 'team' } and the sheet's first read). */
export function setTeamRuns(runs) {
  lastRuns = runs || []; drawRuns();
  if (lastRuns.some((r) => r.status === 'run')) expandOffice('team');   // (15 agents: headquarters' desks and rooms)
}

/** Opens the sheet inside the chat window. */
export function closeTeamSheet(focus = true) {
  const dismiss = dismissOnClose; dismissOnClose = null;
  disposeRoster?.(); disposeRoster = null; restoreModal?.(); restoreModal = null;
  sheet?.remove(); sheet = runsBox = null;
  if (focus) { dismiss?.(); (returnFocus?.isConnected ? returnFocus : $('btn-team-presence'))?.focus({ preventScroll: true }); }
}
export async function openTeamSheet(host, options = {}) {
  if (!liveTeamEnabled()) return;
  closeTeamSheet(false); returnFocus = document.activeElement; dismissOnClose = options.onClose;
  sheet = el('div', 'zc-task tm-sheet'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', tr('team.title'));
  sheet.setAttribute('aria-modal', 'true');
  const current = sheet;
  const head = el('div', 'zc-task-head'), close = el('button', 'zc-ib', '✕'); close.type = 'button'; close.title = tr('chat.close'); close.setAttribute('aria-label', close.title);
  close.addEventListener('click', () => closeTeamSheet());
  const title = el('b', null, `👥 ${tr('team.title')}`); title.tabIndex = -1;
  head.append(title, close);
  sheet.append(head);
  const info = el('div', 'tm-task-info');
  const roster = createTeamRoster({ roleId: options.roleId, onSession: id => { closeTeamSheet(false); options.onDismiss?.(); openSession(id); const heading = $('ds-name'); heading.tabIndex = -1; heading.focus(); },
    onGoal: () => { const goal = current.querySelector('textarea'); if (goal) { goal.scrollIntoView({ block: 'center' }); goal.focus(); } else info.scrollIntoView({ block: 'center' }); },
    onRoom: event => { event.stopPropagation(); closeTeamSheet(false); options.onDismiss?.(); if (HQ) goView('team'); else openLayoutSettings(); } });
  disposeRoster = roster.dispose; sheet.append(roster.element, info); host.append(sheet);
  const disabled = [];
  for (let node = sheet; node.parentElement && node.parentElement !== document.body; node = node.parentElement) {
    for (const sibling of node.parentElement.children) if (sibling !== node) { disabled.push([sibling, sibling.inert]); sibling.inert = true; }
  }
  restoreModal = () => { for (const [node, inert] of disabled) node.inert = inert; };
  sheet.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); closeTeamSheet(); return; }
    if (e.key !== 'Tab') return;
    const controls = [...current.querySelectorAll('button, textarea, select, input, summary, [tabindex="0"]')].filter(n => !n.disabled && !n.closest('[hidden]') && n.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (e.shiftKey && (document.activeElement === first || document.activeElement === title)) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  });
  if (options.roleId) roster.focus(); else title.focus({ preventScroll: true });
  async function loadInfo() {
    info.replaceChildren(el('p', 'zc-task-note', tr('team.presence.loadingTasks')));
    const [t, r] = await Promise.all([fetch(`/api/team${q()}`).then((x) => x.ok ? x.json() : null).catch(() => null), fetch(`/api/tasks${q()}`).then((x) => x.ok ? x.json() : null).catch(() => null)]);
    if (sheet !== current) return;
    info.replaceChildren();
    if (!t?.ok || !r?.ok) {
      const retry = el('button', 'zc-task-tool', tr('team.presence.retry')); retry.type = 'button'; retry.addEventListener('click', loadInfo);
      info.append(el('p', 'zc-task-note', tr('team.presence.tasksError')), retry); return;
    }
    buildTaskInfo(info, t, r);
  }
  await loadInfo();
}
function buildTaskInfo(sheet, t, r) {
  sheet.append(el('p', 'zc-task-note', tr('team.sub')));
  const about = el('details', 'tm-about');
  about.append(el('summary', null, tr('team.flowTitle')), flow(t.stages));
  sheet.append(about);
  const mkTeam = (t.teams || []).find((x) => x.id === 'marketing');
  if (mkTeam && t.marketing) {
    const mk = el('details', 'tm-about');
    mk.append(el('summary', null, `📣 ${tr('team.marketing.title', { n: t.marketing.roles.length })}`), el('p', 'zc-task-note', tr('team.marketing.sub')), marketingOrg(t.marketing), flow(mkTeam.stages));
    sheet.append(mk);
  }
  // the goal
  const saved = kept(), dirs = [...r.projects.map((p) => [p.dir, p.name]), ...r.sessions.filter((s) => !r.projects.some((p) => p.dir === s.dir)).map((s) => [s.dir, s.dir.split(/[\\/]/).pop()])].filter((x, i, a) => a.findIndex((y) => y[0] === x[0]) === i);
  const can = (a) => (a === 'codex' ? r.codex : r.claude !== false);
  const pick = { dir: dirs.some((d) => d[0] === saved.dir) ? saved.dir : dirs[0]?.[0] || '', lead: ['cto', 'cmo'].includes(saved.lead) ? saved.lead : 'pm', agent: can(saved.agent) ? saved.agent : can('claude') ? 'claude' : 'codex', model: saved.model || '', effort: saved.effort || '' };
  const form = el('div', 'tm-form');
  const goal = el('textarea', 'zc-task-in'); goal.rows = 3; goal.maxLength = 4000; goal.placeholder = tr('team.goalPh');
  const fields = el('div', 'tm-fields'), go = el('button', 'zc-task-go', tr('team.go')); go.type = 'button';
  function drawFields() {
    const models = r.models?.[pick.agent] || [], m = models.find((x) => x.id === pick.model);
    if (pick.model && !m) pick.model = '';
    const efforts = m?.efforts || (pick.agent === 'codex' ? [...new Set(models.flatMap((x) => x.efforts))] : r.models?.claude?.[0]?.efforts || []);
    if (pick.effort && !efforts.includes(pick.effort)) pick.effort = '';
    fields.replaceChildren(
      select(tr('team.project'), dirs.map(([d, n]) => [d, `${n} · ${d}`]), pick.dir, (v) => { pick.dir = v; }),
      select(tr('team.giveTo'), [['pm', `${tr('team.roles.pm.name')} · ${tr('team.teams.dev')}`], ['cto', `${tr('team.roles.cto.name')} · ${tr('team.teams.dev')}`], ...((t.teams || []).some((x) => x.id === 'marketing') ? [['cmo', `${tr('team.roles.cmo.name')} · ${tr('team.teams.marketing')}`]] : [])], pick.lead, (v) => { pick.lead = v; }),
      select(tr('team.cli'), [['claude', 'Claude Code'], ['codex', 'Codex CLI']].filter(([a]) => can(a)), pick.agent, (v) => { pick.agent = v; pick.model = ''; pick.effort = ''; drawFields(); }),
      select(tr('team.model'), [['', tr('chat.task.modelDefault')], ...models.map((x) => [x.id, x.name])], pick.model, (v) => { pick.model = v; drawFields(); }),
      select(tr('team.effort'), [['', tr('chat.task.effortDefault')], ...efforts.map((e) => [e, effortName(e)])], pick.effort, (v) => { pick.effort = v; }),
    );
    go.disabled = !pick.dir || !goal.value.trim();
  }
  goal.addEventListener('input', () => { go.disabled = !pick.dir || !goal.value.trim(); });
  go.addEventListener('click', async () => {
    go.disabled = true; go.textContent = tr('team.sending');
    const res = await fetch(`/api/team${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pick, goal: goal.value }) }).then((x) => x.json()).catch(() => null);
    go.textContent = tr('team.go');
    if (res?.ok) { keep(pick); goal.value = ''; toast(tr('team.started'), 6000); } else toast(res?.message || tr('drawer.unreachable'), 7000);
    go.disabled = !pick.dir || !goal.value.trim();
  });
  if (!dirs.length) form.append(el('p', 'zc-task-note', tr('team.noProject')));
  else { drawFields(); form.append(goal, fields, el('p', 'zc-task-note', tr('team.note')), go); }
  // your projects, added or taken off right here: the form is drawn again with the new list
  const manage = el('details', 'zc-task-manage'); manage.append(el('summary', null, `📁 ${tr('team.manageProjects')}`));
  manage.addEventListener('toggle', () => {
    if (!manage.open || manage.querySelector('.pj-box')) return;
    let first = true;
    manage.append(projectPicker({ value: pick.dir, onPick: (p) => { if (p && dirs.some((d) => d[0] === p.dir)) { pick.dir = p.dir; drawFields(); } }, onList: (l) => {
      if (first) { first = false; return; }
      dirs.splice(0, dirs.length, ...l.filter((p) => p.here).map((p) => [p.dir, p.name]));
      if (!dirs.some((d) => d[0] === pick.dir)) pick.dir = dirs[0]?.[0] || '';
      if (dirs.length && !form.contains(goal)) form.replaceChildren(goal, fields, el('p', 'zc-task-note', tr('team.note')), go);
      if (!dirs.length) form.replaceChildren(el('p', 'zc-task-note', tr('team.noProject')));
      drawFields();
    } }));
  });
  form.append(manage);
  runsBox = el('div', 'tm-runs');
  sheet.append(form, el('small', 'zc-task-h', tr('team.runs')), runsBox);
  setTeamRuns(t.runs);
}
