// "Đội AI" (server/team.mjs): you are the CEO. A sheet over the group chat: the 15 agents in their five groups, how a
// goal goes through them (CEO → PM + PO + BA → Architect + UI/UX → Frontend + Backend + App + AI → QA + Reviewer +
// Security → DevOps + Database), a goal to give (which project, to the PM or the CTO, which CLI, model and effort), and
// each run's stages as they go ({ k: 'team' }).
import { el } from '../core/env.js';
import { toast } from './activity.js';
import { expandOffice } from './expand.js';
import { TOKEN } from '../net/live.js';
import { t as tr } from '../../i18n/index.js';

const q = () => (TOKEN ? `?k=${encodeURIComponent(TOKEN)}` : '');
const KEY = 'office-team-run';
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
let sheet = null, runsBox = null, lastRuns = [];
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
function org(roles, groups) {
  const box = el('div', 'tm-org');
  for (const g of groups) {
    const col = el('div', `tm-group is-${g}`);
    col.append(el('b', null, tr(`team.groups.${g}`)));
    for (const r of roles.filter((x) => x.group === g)) { const c = el('span', 'tm-role', tr(`team.roles.${r.id}.name`)); c.title = tr(`team.roles.${r.id}.duty`); col.append(c); }
    box.append(col);
  }
  return box;
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
function drawRuns() {
  if (!runsBox) return;
  if (!lastRuns.length) { runsBox.replaceChildren(el('p', 'zc-task-note', tr('team.noRuns'))); return; }
  runsBox.replaceChildren(...lastRuns.slice(0, 5).map((r) => {
    const card = el('div', `tm-run is-${r.status}`), head = el('div', 'tm-run-head');
    head.append(el('b', null, `${tr(`team.roles.${r.lead}.name`)} · ${r.dir.split(/[\\/]/).pop()}`), el('em', `tm-badge is-${r.status}`, tr(`team.status.${r.status}`)));
    card.append(head, el('p', 'tm-goal', r.goal));
    const meta = [r.agent === 'codex' ? 'Codex' : 'Claude Code', r.model, r.effort && effortName(r.effort), r.fixes ? tr('team.fixes', { n: r.fixes }) : ''].filter(Boolean).join(' · ');
    card.append(el('small', 'tm-meta', meta));
    const list = el('ol', 'tm-stages');
    for (const s of r.stages) {
      const li = el('li', `tm-st is-${s.state}`);
      li.append(el('i', 'tm-dot'), el('span', null, `${tr(`team.stages.${s.key}`)}${s.verdict ? ` · ${tr(`team.verdict.${s.verdict}`)}` : ''}`));
      // each member: a session of its own, with its own state, verdict and last words
      const jobs = el('div', 'tm-jobs');
      for (const j of s.jobs || []) {
        const c = el('span', `tm-job is-${j.state}`), name = tr(`team.roles.${j.role}.name`);
        c.append(el('i', 'tm-dot'), el('span', null, `${name.replace(/ Agent$/, '')}${j.verdict ? ` · ${tr(`team.verdict.${j.verdict}`)}` : ''}`));
        c.title = `${name}: ${tr(`team.job.${j.state}`)}${j.summary ? `

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
export async function openTeamSheet(host) {
  sheet?.remove();
  const [t, r] = await Promise.all([fetch(`/api/team${q()}`).then((x) => x.json()).catch(() => null), fetch(`/api/tasks${q()}`).then((x) => x.json()).catch(() => null)]);
  sheet = el('div', 'zc-task tm-sheet'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', tr('team.title'));
  const head = el('div', 'zc-task-head'), close = el('button', 'zc-ib', '✕'); close.type = 'button'; close.title = tr('chat.close'); close.setAttribute('aria-label', close.title);
  close.addEventListener('click', () => { sheet.remove(); sheet = null; runsBox = null; });
  head.append(el('b', null, `👥 ${tr('team.title')}`), close);
  sheet.append(head);
  if (!t?.ok || !r?.ok) { sheet.append(el('p', 'zc-task-note', tr('drawer.unreachable'))); host.append(sheet); return; }
  sheet.append(el('p', 'zc-task-note', tr('team.sub')));
  const about = el('details', 'tm-about'); about.open = !t.runs.length;
  about.append(el('summary', null, `${tr('team.orgTitle')} · ${tr('team.flowTitle')}`), org(t.roles, t.groups), flow(t.stages));
  sheet.append(about);
  // the goal
  const saved = kept(), dirs = [...r.projects.map((p) => [p.dir, p.name]), ...r.sessions.filter((s) => !r.projects.some((p) => p.dir === s.dir)).map((s) => [s.dir, s.dir.split(/[\\/]/).pop()])].filter((x, i, a) => a.findIndex((y) => y[0] === x[0]) === i);
  const can = (a) => (a === 'codex' ? r.codex : r.claude !== false);
  const pick = { dir: dirs.some((d) => d[0] === saved.dir) ? saved.dir : dirs[0]?.[0] || '', lead: saved.lead === 'cto' ? 'cto' : 'pm', agent: can(saved.agent) ? saved.agent : can('claude') ? 'claude' : 'codex', model: saved.model || '', effort: saved.effort || '' };
  const form = el('div', 'tm-form');
  const goal = el('textarea', 'zc-task-in'); goal.rows = 3; goal.maxLength = 4000; goal.placeholder = tr('team.goalPh');
  goal.addEventListener('keydown', (e) => e.stopPropagation());
  const fields = el('div', 'tm-fields'), go = el('button', 'zc-task-go', tr('team.go')); go.type = 'button';
  function drawFields() {
    const models = r.models?.[pick.agent] || [], m = models.find((x) => x.id === pick.model);
    if (pick.model && !m) pick.model = '';
    const efforts = m?.efforts || (pick.agent === 'codex' ? [...new Set(models.flatMap((x) => x.efforts))] : r.models?.claude?.[0]?.efforts || []);
    if (pick.effort && !efforts.includes(pick.effort)) pick.effort = '';
    fields.replaceChildren(
      select(tr('team.project'), dirs.map(([d, n]) => [d, `${n} · ${d}`]), pick.dir, (v) => { pick.dir = v; }),
      select(tr('team.giveTo'), [['pm', tr('team.roles.pm.name')], ['cto', tr('team.roles.cto.name')]], pick.lead, (v) => { pick.lead = v; }),
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
  runsBox = el('div', 'tm-runs');
  sheet.append(form, el('small', 'zc-task-h', tr('team.runs')), runsBox);
  host.append(sheet);
  setTeamRuns(t.runs);
  setTimeout(() => goal.focus({ preventScroll: true }), 50);
}
