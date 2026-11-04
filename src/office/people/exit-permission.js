// Employees visit the director before each departure. Waiting, a hidden tab and elapsed time never grant permission.
import { createExitQueue } from '../../shared/exit-requests.js';
import { $, PRO, el, replay } from '../core/env.js';
import { state } from '../core/state.js';
import { allocate } from './navigation.js';
import { director } from './director.js';
import { exitHooks, sessions } from './workers.js';
import { goView } from '../ui/camera-bar.js';
import { addHook } from '../ui/ticks.js';
import { t as tr } from '../../i18n/index.js';

const queue = createExitQueue();
let panel, signature = '';
const reason = w => w.leaving ? 'finished' : w.outing && w.outing.kind !== 'home' ? 'errand' : w.joyride ? 'ride' : 'home';
function clear(w) {
  const entry = queue.cancel(w);
  if (!entry) return null;
  w.exitRequest = null;
  if (director) director.holdUntil = state.sim + 1;
  signature = ''; return entry;
}
function stay(w, entry, denied) {
  w.outing?.drop?.(w);
  w.homeBound = false; w.leavingNow = false; w.joyride = false;
  w.chore = null; w.after = null; w.path = []; w.onArrive = null; w.phase = 'idle';
  w.exitApproved = false;
  if (denied) w.exitDeniedUntil = state.sim + 300;
  const home = sessions.has(w.id) || w.personnelRole ? w.homeSpot() : entry.data.home;
  w.goTo(home, () => { w.station = 'desk'; w.anim = 'read'; w.restAt = state.sim + 300; });
}
export function cancelExit(w) {
  const entry = clear(w);
  if (entry) stay(w, entry, false);
}
export function requestExit(w, proceed) {
  if (w.exitRequest) return w.exitRequest;
  const data = { proceed, home: w.spot || w.homeSpot(), reason: reason(w) };
  if (state.sim < (w.exitDeniedUntil || 0)) { stay(w, { data }, false); return null; }
  w.exitApproved = false; w.after = null;
  const entry = queue.request(w, data);
  w.exitRequest = entry; signature = '';
  return entry;
}
function decide(id, allowed) {
  const entry = queue.decide(id, allowed);
  if (!entry) return;
  const w = entry.actor;
  w.exitRequest = null;
  if (director) director.holdUntil = state.sim + 1;
  signature = '';
  if (entry.allowed) { w.hush(); entry.data.proceed(); }
  else { stay(w, entry, true); w.say('idle', tr('people.exit.denied')); }
  render();
}
function render() {
  if (!panel) return;
  const entries = queue.list(), entry = entries[0];
  panel.hidden = !entry || replay.on;
  if (!entry) { panel.replaceChildren(); signature = ''; return; }
  const name = entry.actor.cfg.name;
  const key = `${entry.id}:${entry.stage}:${entries.length}:${name}`;
  if (key === signature) return;
  signature = key;
  const heading = el('b', null, tr('people.exit.title'));
  const who = el('p', null, tr('people.exit.request', { name, reason: tr(`people.exit.reason.${entry.data.reason}`) }));
  const status = el('p', 'exit-status', tr(`people.exit.${entry.stage}`)); status.setAttribute('role', 'status');
  const actions = el('div', 'exit-actions');
  const allow = el('button', 'btn btn--confirm', tr('people.exit.allow'));
  const deny = el('button', 'btn', tr('people.exit.deny'));
  const view = el('button', 'btn', tr('people.exit.view'));
  for (const button of [allow, deny, view]) button.type = 'button';
  allow.dataset.exit = 'allow'; deny.dataset.exit = 'deny';
  allow.disabled = deny.disabled = entry.stage !== 'ready';
  allow.addEventListener('click', () => decide(entry.id, true)); deny.addEventListener('click', () => decide(entry.id, false));
  view.addEventListener('click', () => goView(PRO ? 'director' : 'meeting'));
  actions.append(allow, deny, view);
  panel.dataset.stage = entry.stage;
  panel.replaceChildren(heading, who, status, actions, el('small', null, tr('people.exit.queue', { n: entries.length })));
}
export function updateExitRequests() {
  for (const entry of queue.list()) {
    const w = entry.actor, s = sessions.get(w.id);
    if (replay.on || !w.root.parent || w.want || (!w.leaving && s && (s.status !== 'rest' || s.bg?.length))) cancelExit(w);
  }
  const entry = queue.first();
  if (entry) {
    const w = entry.actor;
    if (director) director.holdUntil = Infinity;
    if (entry.stage === 'queued') {
      const spot = allocate(PRO ? 'director' : 'meeting', w, true);
      if (spot && queue.visit(entry.id)) {
        w.goTo(spot, () => { w.exitAtDirector = entry.id; w.station = 'exit-wait'; w.anim = 'hand'; w.say('idle', tr('people.exit.say')); });
      }
    }
    if (entry.stage === 'visiting' && w.exitAtDirector === entry.id && (!director || director.station === 'home' && director.phase !== 'walk')) queue.arrive(entry.id);
  }
  render();
}
export function setup() {
  panel = el('aside', 'exit-permission'); panel.hidden = true; panel.id = 'exit-permission';
  panel.setAttribute('aria-label', tr('people.exit.title')); panel.setAttribute('aria-live', 'polite');
  ($('stage') || document.body).append(panel);
  exitHooks.request = requestExit;
  exitHooks.cancel = cancelExit;
  if (new URLSearchParams(location.search).has('debug')) addHook({
    get exitRequests() { return queue.list().map(entry => ({ id: entry.id, worker: entry.actor.id, stage: entry.stage, reason: entry.data.reason })); },
  });
}
