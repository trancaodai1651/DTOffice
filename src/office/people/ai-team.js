// Live personnel have stable role identities, independent of CLI sessions and office life.
import { HQ, STATIC, replay } from '../core/env.js';
import { state } from '../core/state.js';
import { UNITS, chairs, deskKit } from '../world/desks.js';
import { MARKETING_ROLE_IDS, MARKETING_SEATS, TEAM_SEATS } from '../../shared/team-roles.js';
import { deriveTeamPresence, sessionActivity } from '../../shared/team-presence.js';
import { PALETTE, Worker, residents, sessions } from './workers.js';
import { addHook } from '../ui/ticks.js';
import { t as tr } from '../../i18n/index.js';

export { residents as teamRoster } from './workers.js';
const listeners = new Set();
let ready = false, freshness = 'loading', hasSnapshot = false, permissions = [];
let projection = deriveTeamPresence([]);
export const liveTeamEnabled = () => !STATIC && !new URLSearchParams(location.search).has('demo') && !replay.on;
export const getTeamPresence = () => projection;
export const teamSessionActivity = session => sessionActivity(session, permissions);
export const onTeamPresence = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const mkDesk = role => UNITS.filter(u => u.mk).flatMap(u => u.desks)[MARKETING_SEATS.indexOf(role)] ?? -1;
export const teamDesk = role => !HQ || !liveTeamEnabled() ? -1 : TEAM_SEATS.includes(role) ? UNITS.find(u => u.team)?.desks[TEAM_SEATS.indexOf(role)] ?? -1 : MARKETING_ROLE_IDS.includes(role) ? mkDesk(role) : -1;
const STAFF = new Set([...TEAM_SEATS, ...MARKETING_ROLE_IDS]);
export const residentForDesk = desk => [...residents.values()].find(w => w.personnelDesk === desk);

export function clearWorld() {
  for (const [k, w] of residents) { if (!STAFF.has(k)) continue; if (state.hovered === w) state.hovered = null; w.remove(); residents.delete(k); }   // (the specialists are theirs: people/specialists.js)
}
export function reconcileTeamPresence() {
  if (!liveTeamEnabled()) { clearWorld(); projection = []; }
  else {
    projection = deriveTeamPresence(sessions.values(), permissions, freshness);
    // the dev team's projection (the roster), then the marketing department's own residents (not in the dev roster)
    const marketing = deriveTeamPresence(sessions.values(), permissions, freshness, MARKETING_ROLE_IDS).map(p => ({ ...p, seatIndex: p.seatIndex + 5 }));
    if (ready && HQ) for (const p of [...projection, ...marketing]) {
      let w = residents.get(p.roleId);
      if (!w) {
        const d = teamDesk(p.roleId); if (d < 0) continue;
        w = new Worker({ name: tr(`team.roles.${p.roleId}.name`), shirt: PALETTE[p.seatIndex % PALETTE.length], hair: '#3B2618', style: ['plain', 'bob', 'spiky', 'ponytail'][p.seatIndex % 4], acc: p.seatIndex % 3 === 0 ? 'glasses' : null },
          { id: `team-role:${p.roleId}`, kind: 'team-resident', roleId: p.roleId, personnelDesk: d });
        const home = w.homeSpot(); w.pos.set(home.x, home.z); w.spot = home; w.face = w.faceTarget = home.face;
        w.pose = 'sit'; w.station = 'desk'; w.tagEl.dataset[TEAM_SEATS.includes(p.roleId) ? 'devRole' : 'mkRole'] = p.roleId;   // (the marketing department's own mark)
        residents.set(p.roleId, w); chairs[d].color.set(w.cfg.shirt); deskKit[d] = w;
      }
      const s = sessions.get(p.primarySessionId), confirmed = p.freshness === 'fresh';
      w.primarySessionId = p.primarySessionId;
      w.leisureSession = { status: confirmed && ['idle', 'rest'].includes(p.activity) ? 'rest' : 'work', bg: p.sessionIds.flatMap(id => sessions.get(id)?.bg || []) };
      if (!w.roaming) w.anim = confirmed && p.activity === 'work' ? 'type' : confirmed && p.activity === 'wait' ? 'hand' : 'read';   // (away from the desk: people/team-brief.js)
      w.tagEl.dataset.devState = confirmed ? p.sessionIds.length ? 'session' : 'idle' : p.freshness;
      w.tagEl.classList.toggle('tag--wait', confirmed && p.activity === 'wait');
      w.setAcct(s?.acct); w.setStuck(confirmed ? s?.stuck : null);
      w.setTeam(p.sessionIds.reduce((n, id) => n + (sessions.get(id)?.subs?.length || 0), 0));
      if ((!confirmed || !s) && !w.roaming) w.hush();
    }
  }
  for (const fn of listeners) fn();
}
export function syncTeamPresence(perms, synced = false) {
  permissions = [...perms];
  if (synced && liveTeamEnabled()) { hasSnapshot = true; freshness = 'fresh'; }
  reconcileTeamPresence();
}
export function teamConnection(on, caughtUp = false) {
  if (!on) freshness = hasSnapshot ? 'stale' : 'loading';
  else if (caughtUp && hasSnapshot) freshness = 'fresh';
  reconcileTeamPresence();
}
export function resetTeamPresence() {
  hasSnapshot = false; freshness = 'loading'; permissions = [];
  reconcileTeamPresence();
}
export function setupWorld() { ready = true; reconcileTeamPresence(); }
export function setup() {
  resetTeamPresence();
  if (new URLSearchParams(location.search).has('debug')) addHook({ get teamRoster() { return new Map([...residents].filter(([k]) => TEAM_SEATS.includes(k))); }, get marketingRoster() { return new Map([...residents].filter(([k]) => MARKETING_ROLE_IDS.includes(k))); }, get teamPresence() { return projection; }, teamConnection });
}
