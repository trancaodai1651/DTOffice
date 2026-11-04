// Personnel, freshness and explicit session selection, shared by 2D and the 3D office.
import { $, el, HQ } from '../core/env.js';
import { TEAM_SEATS, TEAM_GROUPS } from '../../shared/team-roles.js';
import { getTeamPresence, liveTeamEnabled, onTeamPresence, teamSessionActivity } from '../people/ai-team.js';
import { AGENT_NAME, sessions } from '../people/workers.js';
import { t as tr } from '../../i18n/index.js';

let selectedRole = null;
let openTeamUi = null;
export function setTeamOpener(open) { openTeamUi = open; }
export const showRole = roleId => { if (liveTeamEnabled() && TEAM_SEATS.includes(roleId)) { selectedRole = roleId; openTeamUi?.({ roleId }); } };
export const presenceStatus = p => tr(`team.presence.${p.freshness === 'loading' ? 'loading' : p.freshness === 'stale' ? 'stale' : p.activity}`);
export function positionTeamEntry(lite) {
  const entry = document.querySelector('.team-presence-entry'); if (!entry) return;
  if (lite) document.querySelector('.v2-h1')?.append(entry); else $('chips').before(entry);
}

export function createTeamRoster({ roleId, onSession, onGoal, onRoom }) {
  if (roleId) selectedRole = roleId;
  const element = el('section', 'tm-roster'), summary = el('p', 'tm-presence-summary'), notice = el('p', 'tm-presence-notice'), list = el('div', 'tm-roster-groups');
  notice.setAttribute('aria-live', 'polite');
  element.append(summary, notice, list);
  let lastKey = '', missing = false;
  function draw() {
    if (!element.isConnected && lastKey) return;
    const people = getTeamPresence(), data = people.map(p => ({ ...p, sessions: p.sessionIds.map(id => sessions.get(id)).filter(Boolean), activities: p.sessionIds.map(id => sessions.has(id) ? teamSessionActivity(sessions.get(id)) : 'unknown') }));
    const key = JSON.stringify([selectedRole, missing, data]); if (key === lastKey) return; lastKey = key;
    const fresh = people[0]?.freshness || 'loading';
    summary.textContent = `${tr('team.presence.members', { n: TEAM_SEATS.length })} · ${tr('team.presence.teamSessions', { n: fresh === 'fresh' ? people.reduce((n,p) => n + p.sessionIds.length, 0) : '—' })}`;
    notice.textContent = fresh === 'stale' ? tr('team.presence.disconnected') : fresh === 'loading' ? tr('team.presence.loading') : '';
    notice.hidden = !notice.textContent;
    const focus = element.contains(document.activeElement) ? document.activeElement.dataset.focus : null;
    const scroll = element.closest('.tm-sheet'), top = scroll?.scrollTop;
    list.replaceChildren();
    for (const [group, start, end] of TEAM_GROUPS) {
      const col = el('div', `tm-group is-${group}`); col.append(el('h3', null, tr(`team.groups.${group}`)));
      for (const p of data.slice(start, end)) {
        const name = tr(`team.roles.${p.roleId}.name`), row = el('div', 'tm-person'), button = el('button', 'tm-person-button');
        button.type = 'button'; button.dataset.role = p.roleId; button.dataset.focus = `role:${p.roleId}`;
        button.setAttribute('aria-expanded', String(selectedRole === p.roleId)); button.setAttribute('aria-controls', `tm-role-${p.roleId}`);
        button.append(el('span', 'tm-person-name', name), el('span', `tm-person-status is-${p.freshness === 'fresh' ? p.activity : p.freshness}`, `${presenceStatus(p)}${p.sessionIds.length ? ` · ${tr('team.presence.sessions', { n: p.sessionIds.length })}` : ''}`));
        button.addEventListener('click', () => { selectedRole = selectedRole === p.roleId ? null : p.roleId; missing = false; draw(); });
        const detail = el('div', 'tm-person-detail'); detail.id = `tm-role-${p.roleId}`; detail.hidden = selectedRole !== p.roleId;
        detail.setAttribute('role', 'region'); detail.setAttribute('aria-label', name);
        if (!detail.hidden) {
          detail.append(el('p', null, tr(`team.roles.${p.roleId}.duty`)));
          if (missing) detail.append(el('p', 'tm-presence-notice', tr('team.presence.sessionGone')));
          if (p.freshness === 'stale') detail.append(el('p', null, tr('team.presence.beforeDisconnect', { status: tr(`team.presence.${p.activity}`) })));
          if (!p.sessions.length) detail.append(el('p', null, tr(p.freshness === 'fresh' ? 'team.presence.noSession' : 'team.presence.unknown')));
          for (const s of p.sessions) {
            const entry = el('div', 'tm-session'), project = s.git?.repo || String(s.dir || '').split(/[\\/]/).pop() || s.name;
            entry.append(el('b', null, `${project} · #${s.id.slice(0, 12)}`), el('span', null, [tr(`team.presence.${teamSessionActivity(s)}`), s.agent && AGENT_NAME[s.agent], s.model].filter(Boolean).join(' · ')));
            const path = el('details'); path.append(el('summary', null, tr('team.presence.projectPath')), el('span', null, s.dir || '—')); entry.append(path);
            const open = el('button', 'zc-task-tool', tr('team.presence.openSession')); open.type = 'button'; open.dataset.focus = `session:${s.id}`;
            open.addEventListener('click', () => { if (!sessions.has(s.id)) { missing = true; draw(); return; } onSession(s.id); }); entry.append(open); detail.append(entry);
          }
          const goal = el('button', 'zc-task-tool', tr('team.go')); goal.type = 'button'; goal.dataset.focus = `goal:${p.roleId}`; goal.addEventListener('click', onGoal); detail.append(goal);
        }
        row.append(button, detail); col.append(row);
      }
      list.append(col);
    }
    if (focus) {
      const target = [...element.querySelectorAll('[data-focus]')].find(e => e.dataset.focus === focus);
      (target || element.querySelector(`[data-role="${selectedRole}"]`))?.focus({ preventScroll: true });
      if (!target && focus.startsWith('session:')) { missing = true; notice.hidden = false; notice.textContent = tr('team.presence.sessionGone'); }
    }
    if (scroll) scroll.scrollTop = top;
  }
  const room = el('div', 'tm-room'), note = el('p', null, tr(HQ ? 'team.presence.switch3d' : 'team.presence.smallLayout'));
  const see = el('button', 'zc-task-tool', tr(HQ ? 'team.presence.viewRoom' : 'team.presence.switchHq')); see.type = 'button'; see.addEventListener('click', onRoom);
  if (!HQ || !document.body.classList.contains('is-lite')) room.append(see);
  if (!HQ || document.body.classList.contains('is-lite')) room.prepend(note);
  element.append(room); draw();
  const dispose = onTeamPresence(draw);
  return { element, dispose, focus: () => (element.querySelector(`[data-role="${selectedRole}"]`) || element.querySelector('button'))?.focus({ preventScroll: true }) };
}

export function setup() {
  const bar = el('div', 'team-presence-entry'), button = el('button', null, tr('team.presence.entry', { n: TEAM_SEATS.length }));
  button.type = 'button'; button.id = 'btn-team-presence'; button.addEventListener('click', () => openTeamUi?.());
  bar.append(button); $('chips').before(bar);
  const update = () => {
    bar.hidden = !liveTeamEnabled();
    document.body.classList.toggle('has-live-team', liveTeamEnabled());
    const empty = $('empty'); if (empty && liveTeamEnabled()) { empty.querySelector('b').textContent = tr('team.presence.empty', { n: TEAM_SEATS.length }); empty.querySelector('span').textContent = tr(HQ ? 'team.presence.noSession' : 'team.presence.smallLayout'); }
  };
  onTeamPresence(update); update();
}
