// Giving work through the guide: you tell her the task; she asks which project (yours, ui/projects.js), finds the AI
// Agent team(s) it needs (/api/team/route: server/team.mjs routeTeams; a task may need more than one, worked one after
// the other), and hands it to the team's PM or CTO with the CLI, model and effort you pick. The members then come to you
// one by one to take their part (people/team-brief.js), and the team's sheet shows how it goes.
import { el } from '../core/env.js';
import { TOKEN } from '../net/live.js';
import { projectPicker } from './projects.js';
import { t as tr } from '../../i18n/index.js';
import { specialistRequest } from '../../shared/specialist-request.js';

const q = () => (TOKEN ? `?k=${encodeURIComponent(TOKEN)}` : '');
const KEEP = 'office-guide-work';
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];   // (as the team's sheet)
const effortName = (e) => (EFFORTS.includes(e) ? tr(`chat.task.effort.${e}`) : e);
function kept() { try { return JSON.parse(localStorage.getItem(KEEP) || '{}') || {}; } catch { return {}; } }
function keep(v) { try { localStorage.setItem(KEEP, JSON.stringify(v)); } catch { /* storage blocked */ } }
function select(label, items, value, onChange) {
  const wrap = el('label', 'gw-field'), s = el('select');
  wrap.append(el('small', null, label), s);
  for (const [v, text] of items) { const o = el('option', null, text); o.value = v; if (v === value) o.selected = true; s.append(o); }
  s.addEventListener('change', () => onChange(s.value));
  return wrap;
}
const say = (text) => el('p', 'gw-say', text);

/**
 * Her side of it, in the guide's panel: back() goes to her topics, openTeam() opens the team's sheet.
 * @param {{ back: () => void, openTeam: () => void, openSpecialist: (kind: string, options: object) => void }} o
 */
export function workFlow({ back, openTeam, openSpecialist }) {
  const box = el('div', 'gd-topic gw');
  const saved = kept(), pick = { goal: '', dir: saved.dir || '', teams: [], lead: saved.lead === 'cto' ? 'cto' : 'pm', agent: saved.agent || '', model: saved.model || '', effort: saved.effort || '' };
  const head = el('div', 'gd-topic-head'), up = el('button', 'gd-back', '‹'); up.type = 'button'; up.title = tr('guide.back'); up.setAttribute('aria-label', up.title);
  up.addEventListener('click', back);
  head.append(up, el('b', null, tr('guide.work.title')));
  const body = el('div', 'gw-body');
  box.append(head, body);

  // 1. the task
  function stepTask() {
    const text = el('textarea', 'gw-in'); text.rows = 4; text.maxLength = 4000; text.placeholder = tr('guide.work.taskPh'); text.value = pick.goal;
    text.setAttribute('aria-label', tr('guide.work.taskPh'));
    text.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) next.click(); });
    const next = el('button', 'gd-go', tr('guide.work.next')); next.type = 'button'; next.disabled = !text.value.trim();
    text.addEventListener('input', () => { next.disabled = !text.value.trim(); });
    next.addEventListener('click', () => { pick.goal = text.value.trim(); if (!pick.goal) return; const request = specialistRequest(pick.goal); if (request) openSpecialist(request.kind, { topic: request.topic }); else stepProject(); });
    body.replaceChildren(say(tr('guide.work.askTask')), text, next);
    setTimeout(() => text.focus({ preventScroll: true }), 30);
  }
  // 2. which project
  function stepProject() {
    const next = el('button', 'gd-go', tr('guide.work.next')); next.type = 'button'; next.disabled = !pick.dir;
    const picker = projectPicker({ value: pick.dir, onPick: (p) => { pick.dir = p?.dir || ''; next.disabled = !pick.dir; } });
    const prev = el('button', 'gw-prev', tr('guide.work.prev')); prev.type = 'button'; prev.addEventListener('click', stepTask);
    next.addEventListener('click', () => { if (pick.dir) stepTeam(); });
    const acts = el('div', 'gw-acts'); acts.append(prev, next);
    body.replaceChildren(say(tr('guide.work.askProject')), picker, acts);
  }
  // 3. the team(s) she found, who it goes to, and how it runs
  async function stepTeam() {
    body.replaceChildren(say(tr('guide.work.finding')));
    const post = (url, b) => fetch(`${url}${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((x) => x.json()).catch(() => null);
    const [route, info, tasks] = await Promise.all([post('/api/team/route', { text: pick.goal }), fetch(`/api/team${q()}`).then((x) => x.json()).catch(() => null), fetch(`/api/tasks${q()}`).then((x) => x.json()).catch(() => null)]);
    if (!route?.ok || !info?.ok || !tasks?.ok) { const retry = el('button', 'gd-go', tr('guide.work.retry')); retry.type = 'button'; retry.addEventListener('click', stepTeam); body.replaceChildren(say(tr('guide.work.unreachable')), retry); return; }
    const all = (info.teams || [{ id: 'dev' }]).map((x) => x.id);
    pick.teams = route.teams.map((x) => x.id).filter((id) => all.includes(id));
    const why = route.teams.flatMap((x) => x.words).slice(0, 5);
    const found = say(tr(pick.teams.length > 1 ? 'guide.work.foundMany' : 'guide.work.found', { teams: pick.teams.map((id) => tr(`team.teams.${id}`)).join(' → ') }));
    const whyLine = el('small', 'gw-why', why.length ? tr('guide.work.why', { words: why.join(', ') }) : tr('guide.work.whyNone'));
    // the teams: those she found ticked; more than one work it one after another, in this order
    const teamsBox = el('fieldset', 'gw-teams'); teamsBox.append(el('legend', null, tr('guide.work.teams')));
    for (const id of all) {
      const l = el('label', 'gw-team'), c = el('input'); c.type = 'checkbox'; c.checked = pick.teams.includes(id);
      c.addEventListener('change', () => { pick.teams = all.filter((x) => (x === id ? c.checked : pick.teams.includes(x))); go.disabled = !pick.teams.length; });
      l.append(c, el('span', null, tr(`team.teams.${id}`)), el('small', null, tr(`team.teams.${id}Sub`)));
      teamsBox.append(l);
    }
    const can = (a) => (a === 'codex' ? tasks.codex : tasks.claude !== false);
    if (!can(pick.agent)) pick.agent = can('claude') ? 'claude' : 'codex';
    const fields = el('div', 'gw-fields');
    function drawFields() {
      const models = tasks.models?.[pick.agent] || [], m = models.find((x) => x.id === pick.model);
      if (pick.model && !m) pick.model = '';
      const efforts = m?.efforts || (pick.agent === 'codex' ? [...new Set(models.flatMap((x) => x.efforts))] : tasks.models?.claude?.[0]?.efforts || []);
      if (pick.effort && !efforts.includes(pick.effort)) pick.effort = '';
      fields.replaceChildren(
        select(tr('team.giveTo'), [['pm', tr('team.roles.pm.name')], ['cto', tr('team.roles.cto.name')]], pick.lead, (v) => { pick.lead = v; }),
        select(tr('team.cli'), [['claude', 'Claude Code'], ['codex', 'Codex CLI']].filter(([a]) => can(a)), pick.agent, (v) => { pick.agent = v; pick.model = ''; pick.effort = ''; drawFields(); }),
        select(tr('team.model'), [['', tr('chat.task.modelDefault')], ...models.map((x) => [x.id, x.name])], pick.model, (v) => { pick.model = v; drawFields(); }),
        select(tr('team.effort'), [['', tr('chat.task.effortDefault')], ...efforts.map((e) => [e, effortName(e)])], pick.effort, (v) => { pick.effort = v; }),
      );
    }
    drawFields();
    const go = el('button', 'gd-go', tr('guide.work.go')); go.type = 'button'; go.disabled = !pick.teams.length || (!tasks.claude && !tasks.codex);
    const prev = el('button', 'gw-prev', tr('guide.work.prev')); prev.type = 'button'; prev.addEventListener('click', stepProject);
    const err = el('p', 'pj-msg'); err.hidden = true;
    go.addEventListener('click', async () => {
      go.disabled = true; go.textContent = tr('team.sending');
      const r = await post('/api/team', { dir: pick.dir, goal: pick.goal, teams: pick.teams, lead: pick.lead, agent: pick.agent, model: pick.model, effort: pick.effort });
      go.textContent = tr('guide.work.go');
      if (!r?.ok) { err.textContent = r?.message || tr('guide.work.unreachable'); err.hidden = false; go.disabled = false; return; }
      keep({ dir: pick.dir, lead: pick.lead, agent: pick.agent, model: pick.model, effort: pick.effort });
      stepDone(r.run);
    });
    const acts = el('div', 'gw-acts'); acts.append(prev, go);
    body.replaceChildren(found, whyLine, teamsBox, fields, err, acts);
  }
  // 4. given: the lead calls each member, who comes to you for their part
  function stepDone(run) {
    pick.goal = '';
    const lead = tr(`team.roles.${['cto', 'cmo'].includes(run?.lead) ? run.lead : 'pm'}.name`);
    const see = el('button', 'gd-go', tr('guide.work.openTeam')); see.type = 'button'; see.addEventListener('click', openTeam);
    const more = el('button', 'gw-prev', tr('guide.work.another')); more.type = 'button'; more.addEventListener('click', stepTask);
    const acts = el('div', 'gw-acts'); acts.append(more, see);
    body.replaceChildren(say(tr('guide.work.done', { lead })), el('small', 'gw-why', tr('guide.work.doneSub')), acts);
  }
  stepTask();
  return box;
}
