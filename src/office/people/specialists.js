// The specialists in the office: the news reader and the video editor (server/specialists.mjs), each in an armchair of
// the library corner, always there. At work they show it (reading the papers, typing away, a bubble with the topic);
// click one and they ask what you want (ui/specialists.js). Their sessions are theirs: a CLI session the office started
// for one of them is drawn as that person (sessions' role 'news' / 'video'), not as someone new at a desk.
import { STATIC, replay } from '../core/env.js';
import { STATIONS } from './navigation.js';
import { PALETTE, Worker, residents } from './workers.js';
import { openSpecialist } from '../ui/specialists.js';
import { short } from '../core/env.js';
import { TOKEN } from '../net/live.js';
import { t as tr } from '../../i18n/index.js';

export const SPECIALIST_ROLES = ['news', 'video'];
const LOOK = {
  news: { shirt: '#C8553D', hair: '#2B1B12', style: 'bob', acc: 'glasses', pants: '#3B4252' },
  video: { shirt: '#2E86AB', hair: '#1C1C22', style: 'spiky', acc: null, pants: '#2E3440' },
};
let jobs = [];
const busy = (kind) => jobs.find((j) => j.kind === kind && (j.status === 'run' || j.status === 'print'));

// their armchairs (the library's first two seats), kept for them
function seat(kind) { const l = STATIONS?.library || []; return l[SPECIALIST_ROLES.indexOf(kind)] || null; }
function make(kind) {
  const spot = seat(kind); if (!spot) return null;
  const w = new Worker({ name: tr(`specialists.${kind}.name`), ...LOOK[kind] || { shirt: PALETTE[0] } }, { id: `specialist:${kind}`, kind: 'team-resident', roleId: kind });
  w.specialist = kind; w.homeSpot = () => spot;
  spot.by = w; w.spot = spot; w.pos.set(spot.x, spot.z); w.face = w.faceTarget = spot.face;
  w.pose = spot.sit ? 'sit' : 'stand'; w.station = 'library'; w.anim = 'read';
  w.onPick = () => openSpecialist(kind);
  w.tagEl.dataset.specialist = kind;
  residents.set(kind, w);
  return w;
}
/** Make sure both are there (the world built, live or demo, not a replay) and show what they are doing. */
export function syncSpecialists() {
  if (!STATIONS || STATIC || replay.on) { for (const k of SPECIALIST_ROLES) { const w = residents.get(k); if (w) { w.remove(); residents.delete(k); } } return; }
  for (const k of SPECIALIST_ROLES) {
    const w = residents.get(k) || make(k); if (!w) continue;
    const j = busy(k);
    if (j) {
      w.anim = k === 'news' ? 'read' : 'type';
      w.say(k === 'news' ? 'search' : 'edit', tr(k === 'news' ? 'specialists.news.reading' : 'specialists.video.working', { topic: short(j.topic, 40), about: short(j.brief || j.topic || '', 40) }));
    } else { w.anim = k === 'news' ? 'read' : 'phone'; w.hush(); }
  }
}
/** The jobs, as the server sends them ({ k: 'specialists' } and the first read). */
export function setSpecialistJobs(list) { jobs = Array.isArray(list) ? list : []; syncSpecialists(); }
export function setupWorld() {
  syncSpecialists();
  if (!STATIC) fetch(`/api/specialists${TOKEN ? `?k=${encodeURIComponent(TOKEN)}` : ''}`).then((x) => x.json()).then((r) => { if (r?.ok) setSpecialistJobs(r.jobs); }).catch(() => {});
}
export function setup() {}
