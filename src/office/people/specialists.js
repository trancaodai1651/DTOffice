// The specialists in the office: the news reader and the video editor (server/specialists.mjs), always there, resting
// in an armchair of the library corner. Given a job, they first meet at the meeting table with the director (the video
// editor with the news reader too when the video is made from a report: it hands the report over), then sit at a desk to
// work (the desk the office gave their session, else a free one), and go back to the library once done. Click one and
// they ask what you want (ui/specialists.js). Their sessions are theirs: a CLI session the office started for one of
// them is drawn as that person (sessions' role 'news' / 'video'), not as someone new at a desk.
import { STATIC, replay, short } from '../core/env.js';
import { DESK_SPOTS, STATIONS } from './navigation.js';
import { PALETTE, Worker, residents, sessions } from './workers.js';
import { callMeeting, home } from './team-brief.js';
import { openSpecialist } from '../ui/specialists.js';
import { TOKEN } from '../net/live.js';
import { addHook } from '../ui/ticks.js';
import { t as tr } from '../../i18n/index.js';

export const SPECIALIST_ROLES = ['news', 'video'];
const LOOK = {
  news: { shirt: '#C8553D', hair: '#2B1B12', style: 'bob', acc: 'glasses', pants: '#3B4252' },
  video: { shirt: '#2E86AB', hair: '#1C1C22', style: 'spiky', acc: null, pants: '#2E3440' },
};
let jobs = [];
const met = new Set();   // the jobs whose meeting was called (or that were already going when the page opened)
const busy = (kind) => jobs.find((j) => j.kind === kind && ['run', 'print', 'render'].includes(j.status));

// their armchairs (the library's first two seats), kept for them
function seat(kind) { const l = STATIONS?.library || []; return l[SPECIALIST_ROLES.indexOf(kind)] || null; }
// where they work: their session's desk, else a desk nobody has
function desk(w) {
  const s = [...sessions.values()].find((x) => x.role === w.specialist && x.desk >= 0);
  if (s) return s.desk;
  if (w.workDesk >= 0 && DESK_SPOTS[w.workDesk]) return w.workDesk;
  const used = new Set([...sessions.values()].map((x) => x.desk).filter((d) => d >= 0));
  for (const r of residents.values()) { if (r.personnelDesk >= 0) used.add(r.personnelDesk); if (r !== w && r.workDesk >= 0) used.add(r.workDesk); }
  const d = (DESK_SPOTS || []).findIndex((_, i) => !used.has(i));
  return d;
}
function make(kind) {
  const spot = seat(kind); if (!spot) return null;
  const w = new Worker({ name: tr(`specialists.${kind}.name`), ...LOOK[kind] || { shirt: PALETTE[0] } }, { id: `specialist:${kind}`, kind: 'team-resident', roleId: kind });
  w.specialist = kind; w.workDesk = -1;
  // home: the desk while working, the armchair otherwise (people/team-brief.js sends them there)
  w.homeSpot = () => { if (w.working) { const d = desk(w); if (d >= 0) { w.workDesk = d; return DESK_SPOTS[d]; } } return seat(kind); };
  spot.by = w; w.spot = spot; w.pos.set(spot.x, spot.z); w.face = w.faceTarget = spot.face;
  w.pose = spot.sit ? 'sit' : 'stand'; w.station = 'library'; w.anim = 'read';
  w.onPick = () => openSpecialist(kind);
  w.onHome = () => syncSpecialists();   // (at the desk: at work; in the armchair: resting)
  w.tagEl.dataset.specialist = kind;
  residents.set(kind, w);
  return w;
}
const partOf = (j) => (j.kind === 'news' ? tr('people.brief.partNews', { topic: short(j.topic, 40) }) : tr('people.brief.partVideo', { about: short(j.brief || '', 40) || tr('people.brief.partDefault') }));
/** Make sure both are there (the world built, live or demo, not a replay); a new job: the meeting, then the desk. */
export function syncSpecialists() {
  if (!STATIONS || STATIC || replay.on) { for (const k of SPECIALIST_ROLES) { const w = residents.get(k); if (w) { w.remove(); residents.delete(k); } } return; }
  for (const k of SPECIALIST_ROLES) {
    const w = residents.get(k) || make(k); if (!w) continue;
    const j = busy(k);
    if (j && !met.has(j.id)) {
      met.add(j.id); w.working = true;
      if (Date.now() - (j.at || 0) < 90e3) {   // (just given: everyone taking part meets first; the reader hands its report to the editor)
        const from = j.from && jobs.find((x) => x.id === j.from), roles = from ? ['news', k] : [k];
        callMeeting(roles, j.topic || j.brief || from?.topic || '', { parts: { [k]: partOf(j), ...(from ? { news: tr('people.brief.partHandover', { topic: short(from.topic, 40) }) } : {}) } });
      } else home(w);   // (already at work when the page opened: straight to the desk)
    } else if (!j && w.working) { w.working = false; w.workDesk = -1; if (!w.roaming || w.phase !== 'walk') home(w); }   // (done: back to the library)
    if (w.roaming) continue;
    if (j && w.station === 'desk') {
      w.anim = 'type';
      w.say(k === 'news' ? 'search' : 'edit', tr(k === 'news' ? 'specialists.news.reading' : 'specialists.video.working', { topic: short(j.topic, 40), about: short(j.brief || j.topic || '', 40) }));
    } else if (!j) { w.anim = k === 'news' ? 'read' : 'phone'; w.hush(); }
  }
}
/** The jobs, as the server sends them ({ k: 'specialists' } and the first read). */
let fresher = false;   // (the stream already said newer: the first read, slower, is not taken)
export function setSpecialistJobs(list, first = false) { if (first && fresher) return; if (!first) fresher = true; jobs = Array.isArray(list) ? list : []; syncSpecialists(); }
export function setupWorld() {
  syncSpecialists();
  if (new URLSearchParams(location.search).has('debug')) addHook({ specialistJobs: setSpecialistJobs });
  if (!STATIC) fetch(`/api/specialists${TOKEN ? `?k=${encodeURIComponent(TOKEN)}` : ''}`).then((x) => x.json()).then((r) => { if (r?.ok) setSpecialistJobs(r.jobs, true); }).catch(() => {});
}
export function setup() {}
