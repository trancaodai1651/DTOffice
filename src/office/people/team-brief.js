// The AI staff (the team room's residents, people/ai-team.js, and the specialists, people/specialists.js) are always in
// the office, and nobody starts work without a meeting:
//  - work starting (a stage of the AI Agent Dev team, server/team.mjs; a specialist's job): everyone taking part goes to
//    the meeting table, the director (you) comes too and opens it, each in turn takes their part (a sheet of paper
//    changes hands), and then they go to their desks and work there;
//  - with nothing to do for a while, some go to the break room (a sofa, the pantry, the library) and come back the moment
//    they have work or are called. They never leave the building: going out is asked of the director (exit-permission).
import { PRO, rand, reduceMotion, replay, short } from '../core/env.js';
import { state } from '../core/state.js';
import { MEET } from '../world/furniture/meeting.js';
import { allocate } from './navigation.js';
import { director } from './director.js';
import { nearBoss, residents } from './workers.js';
import { getTeamPresence, reconcileTeamPresence } from './ai-team.js';
import { addHook } from '../ui/ticks.js';
import { t as tr } from '../../i18n/index.js';

const seen = new Set();   // `${run}:${stage n}:${role}`: the jobs whose members were already called
let nextLook = 0;
const meetings = [];      // { roles, task, parts: { role: what }, after: { role: (w) => void } } waiting their turn
let current = null;       // the meeting under way: { ...m, members, phase: 'gather' | 'talk' | 'close', deadline, next, turn }

/** A meeting before work: these people (role ids of residents), about this task; after it, each goes where `after[role]`
 *  sends them (their own desk by default). */
export function callMeeting(roles, task, { parts = {}, after = {} } = {}) {
  const m = meetings.find((x) => x.task === task);
  if (m) { for (const r of roles) if (!m.roles.includes(r)) m.roles.push(r); Object.assign(m.parts, parts); Object.assign(m.after, after); return; }
  meetings.push({ roles: [...roles], task, parts: { ...parts }, after: { ...after } });
}
/** The team's runs, as the server sends them: the members of a stage who have just started (the last 90 s) meet first;
 *  one at work for longer (the page opened since) is at their desk already. */
export function briefFromRuns(runs) {
  for (const r of runs || []) {
    if (r.status !== 'run') continue;
    const s = r.stages?.at(-1); if (!s) continue;
    const n = r.stages.length, fresh = [];
    for (const j of s.jobs || []) {
      const key = `${r.id}:${n}:${j.role}`;
      if (j.state !== 'run' || seen.has(key)) continue;
      seen.add(key);
      if (Date.now() - (j.at || 0) < 90e3 && residents.has(j.role)) fresh.push(j.role);   // (only those with a desk in the AI room come to the meeting)
    }
    if (fresh.length) callMeeting(fresh, `${tr(`team.stages.${s.key}`)}: ${short(r.goal || '', 60)}`);
  }
}

// back to the desk, seated, and the projection's own look again
export function home(w) {
  const spot = w.homeSpot(); w.roaming = true;   // (residents walk only while roaming)
  w.goTo(spot, () => { w.station = 'desk'; w.pose = 'sit'; w.face = w.faceTarget = spot.face; w.roaming = false; w.lounging = false; w.hush(); reconcileTeamPresence(); w.onHome?.(); });
}
const faceTable = (w) => { w.faceTarget = Math.atan2(MEET.x - w.pos.x, MEET.z - w.pos.y); };
function free(spot) { if (spot && 'by' in spot) spot.by = null; }

function begin(m) {
  const members = m.roles.map((r) => residents.get(r)).filter(Boolean);
  current = { ...m, members, phase: 'gather', deadline: state.sim + 35, next: 0, turn: 0, spots: new Map() };
  for (const w of members) {
    // A real assignment takes control from leisure, including a game holding an infinite errand.
    w.chore = null;
    w.roaming = true; w.lounging = false; w.after = null; w.met = false;
    w.say('meet', tr('people.brief.toMeeting'));
    const spot = allocate('meeting', w, true) || nearBoss(director, w);
    if ('by' in spot) spot.by = w;
    current.spots.set(w, spot);
    w.goTo(spot, () => { w.station = 'meeting'; w.anim = 'idle'; faceTable(w); w.met = true; });
  }
  // the director comes too (the place at the end of the table), unless already busy carrying something
  if (director && !director.job) {
    director.job = { stage: 'meeting' }; director.hush(); director.station = 'out';
    const spot = allocate('brief', director, true) || nearBoss(members[0] || director, director);
    director.goTo(spot, () => { director.anim = 'idle'; director.faceTarget = Math.atan2(MEET.x - director.pos.x, MEET.z - director.pos.y); director.met = true; });
    current.director = true;
  }
}
function end() {
  const m = current; current = null;
  for (const w of m.members) {
    free(m.spots.get(w));
    w.say('prompt', tr('people.brief.onIt'), '');
    (m.after[w.roleId] || home)(w);
  }
  if (m.director && director) { director.job = null; director.met = false; director.hush(); }   // (back to the desk: its own tick)
}
// the meeting under way: everyone there (or long enough), the director opens it, each takes their part, then to work
function run() {
  const m = current;
  if (m.phase === 'gather') {
    const all = m.members.every((w) => w.met) && (!m.director || director.met);
    if (!all && state.sim < m.deadline) return;
    m.phase = 'talk'; m.next = state.sim + 1.6;
    if (m.director) director.say('meet', tr('people.brief.open', { task: state.streamer ? tr('people.newTask') : short(m.task, 60) }));
    return;
  }
  if (state.sim < m.next) return;
  if (m.phase === 'talk' && m.turn < m.members.length) {
    const w = m.members[m.turn++];
    faceTable(w);
    w.say('prompt', tr('people.brief.myPart', { role: tr(`team.roles.${w.roleId}.name`), part: m.parts[w.roleId] || tr('people.brief.partDefault') }));
    if (m.director && director.met) director.handTo?.(w, m.task, true);
    m.next = state.sim + (reduceMotion ? 1.2 : 2.2);
    return;
  }
  if (m.phase === 'talk') { m.phase = 'close'; if (m.director) director.say('meet', tr('people.brief.close')); m.next = state.sim + 1.8; return; }
  end();
}
function lounge(w) {
  const spot = allocate(Math.random() < 0.7 ? 'coffee' : 'library', w, true);
  if (!spot) return;
  w.roaming = true; w.hush();
  w.goTo(spot, () => { w.station = 'lounge'; w.lounging = true; w.anim = Math.random() < 0.6 ? 'phone' : 'read'; w.backAt = state.sim + rand(150, 420); });
}

/** Every frame: meetings one after another; those resting come back for work or after a while. */
export function updateBriefs() {
  if (!PRO || replay.on || !residents.size) { meetings.length = 0; if (current) end(); return; }
  const can = director && !reduceMotion && !document.hidden;
  if (!current && meetings.length) {
    const m = meetings.shift();
    if (can) begin(m);
    else for (const w of m.roles.map((r) => residents.get(r)).filter(Boolean)) (m.after[w.roleId] || home)(w);   // (no meeting room, motion reduced, the tab hidden: straight to work)
  }
  if (current) run();
  const p = new Map(getTeamPresence().map((x) => [x.roleId, x]));
  for (const w of residents.values()) {
    if (!w.lounging || w.phase === 'walk' || w.specialist) continue;
    if (p.get(w.roleId)?.sessionIds?.length || state.sim > (w.backAt || 0)) home(w);   // (work, or long enough)
  }
  // now and then, one who has had nothing to do for a while goes for a break
  if (!can || state.sim < nextLook) return;
  nextLook = state.sim + rand(20, 40);
  const idle = [...residents.values()].filter((w) => !w.roaming && !w.specialist && w.station === 'desk' && p.get(w.roleId)?.freshness === 'fresh' && !p.get(w.roleId)?.sessionIds?.length);
  if (idle.length && Math.random() < 0.5) lounge(idle[Math.floor(Math.random() * idle.length)]);
}
export function resetBriefs() { meetings.length = 0; seen.clear(); if (current) end(); }
export function setup() {
  if (new URLSearchParams(location.search).has('debug')) addHook({ briefFromRuns, callMeeting, get meeting() { return current && { phase: current.phase, turn: current.turn, members: current.members.map((w) => w.roleId), task: current.task }; }, get meetingQueue() { return meetings.map((m) => m.roles); } });
}
