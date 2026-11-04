// The AI Agent Dev team's members (the residents of the team room, people/ai-team.js) are always in the office:
//  - called for a task (a member's job starting, server/team.mjs), they walk to the director (you) to take it, a sheet
//    of paper changes hands, and they go back to their own desk to work on it: you don't carry tasks to their desks;
//  - with nothing to do for a while, some go to the break room (a sofa, the pantry, the library) and come back the moment
//    they have work or are called. They never leave the building: going out is asked of the director (exit-permission).
import { HQ, PRO, rand, reduceMotion, replay, short } from '../core/env.js';
import { state } from '../core/state.js';
import { allocate } from './navigation.js';
import { director } from './director.js';
import { nearBoss, residents } from './workers.js';
import { getTeamPresence, reconcileTeamPresence } from './ai-team.js';
import { addHook } from '../ui/ticks.js';
import { t as tr } from '../../i18n/index.js';

const seen = new Set();   // `${run}:${stage n}:${role}`: the jobs whose members were already called
let nextLook = 0;
const queue = [];         // { role, task } waiting for their member to be free to walk over

/** The team's runs, as the server sends them: each member who has just started (the last 90 s) comes to the director for
 *  the task; one at work for longer (the page opened since) is at their desk already. */
export function briefFromRuns(runs) {
  for (const r of runs || []) {
    if (r.status !== 'run') continue;
    const s = r.stages?.at(-1); if (!s) continue;
    const n = r.stages.length;
    for (const j of s.jobs || []) {
      const key = `${r.id}:${n}:${j.role}`;
      if (j.state !== 'run' || seen.has(key)) continue;
      seen.add(key);
      if (Date.now() - (j.at || 0) < 90e3) queue.push({ role: j.role, task: tr(`team.stages.${s.key}`) + ': ' + short(r.goal || '', 60) });
    }
  }
}

// back to the desk, seated, and the projection's own look again
function home(w) {
  const spot = w.homeSpot();
  w.goTo(spot, () => { w.station = 'desk'; w.pose = 'sit'; w.face = w.faceTarget = spot.face; w.roaming = false; w.lounging = false; w.hush(); reconcileTeamPresence(); });
}
// to the director's desk (where reports are made), waiting there a little if the director is out on the floor
function brief(w, task) {
  w.roaming = true; w.lounging = false; w.after = null;
  w.say('prompt', tr('incident.takeTaskHidden'));
  const spot = allocate('director', w, true) || nearBoss(director, w);
  w.goTo(spot, () => { w.station = 'brief'; w.anim = 'idle'; w.briefTask = task; w.briefUntil = state.sim + 25; });
}
function take(w) {
  const task = w.briefTask; w.briefTask = null; w.briefUntil = 0;
  w.faceTarget = Math.atan2(director.pos.x - w.pos.x, director.pos.y - w.pos.y);
  w.say('prompt', tr('people.brief.take', { task }));
  director.handTo?.(w, task);
  w.afterAt = state.sim + (reduceMotion ? 1.2 : 2.4);
  w.after = () => { w.say('prompt', tr('people.brief.onIt'), ''); home(w); };
}
function lounge(w) {
  const spot = allocate(Math.random() < 0.7 ? 'coffee' : 'library', w, true);
  if (!spot) return;
  w.roaming = true; w.hush();
  w.goTo(spot, () => { w.station = 'lounge'; w.lounging = true; w.anim = Math.random() < 0.6 ? 'phone' : 'read'; w.backAt = state.sim + rand(150, 420); });
}

/** Every frame: the members called walk over; those resting come back for work or after a while. */
export function updateBriefs() {
  if (!HQ || replay.on || !residents.size) { queue.length = 0; return; }
  const can = PRO && director && !reduceMotion && !document.hidden;
  for (let i = queue.length - 1; i >= 0; i--) {
    const q = queue[i], w = residents.get(q.role);
    if (!w) { queue.splice(i, 1); continue; }
    if (w.station === 'brief' || w.briefTask || (w.roaming && w.phase === 'walk' && !w.lounging)) continue;   // (still on the way to an earlier one)
    queue.splice(i, 1);
    if (can) brief(w, q.task); else if (w.roaming) home(w);
  }
  // at the director's desk: the task changes hands once the director is there (or after a while: left on the desk)
  for (const w of residents.values()) if (w.briefTask && w.station === 'brief' && w.phase !== 'walk' && (state.sim > w.briefUntil || (director?.station === 'home' && director.phase !== 'walk'))) take(w);
  const p = new Map(getTeamPresence().map((x) => [x.roleId, x]));
  for (const w of residents.values()) {
    if (!w.lounging || w.phase === 'walk') continue;
    if (p.get(w.roleId)?.sessionIds?.length || state.sim > (w.backAt || 0)) home(w);   // (work, or long enough)
  }
  // now and then, one who has had nothing to do for a while goes for a break
  if (!can || state.sim < nextLook) return;
  nextLook = state.sim + rand(20, 40);
  const idle = [...residents.values()].filter((w) => !w.roaming && w.station === 'desk' && p.get(w.roleId)?.freshness === 'fresh' && !p.get(w.roleId)?.sessionIds?.length);
  if (idle.length && Math.random() < 0.5) lounge(idle[Math.floor(Math.random() * idle.length)]);
}
export function resetBriefs() { queue.length = 0; seen.clear(); }
export function setup() {
  if (new URLSearchParams(location.search).has('debug')) addHook({ briefFromRuns, get briefQueue() { return queue.map((q) => q.role); } });
}
