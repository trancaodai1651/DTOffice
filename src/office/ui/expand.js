// The office grows when it fills up: no desk left for a new session (9 in the small office, 12 on the company floor),
// or the AI team (15 agents, server/team.mjs) starting work in an office smaller than headquarters. It becomes
// headquarters: the company floor and a wing of department rooms, 52 desks (the AI team's room among them), where more rooms can be added later. A
// notice counts down first (the office is built again, so the page reloads) and can be cancelled; once cancelled it
// asks again only after a while. ?layout=… (one visit's own plan) is never changed.
import { $, LAYOUT, el } from '../core/env.js';
import { t as tr } from '../../i18n/index.js';

const KEY = 'office-layout', LATER = 'office-expand-later';
let banner = null, timer = 0;
const fixedByUrl = () => new URLSearchParams(location.search).has('layout');
const declinedRecently = () => { try { return Date.now() - Number(localStorage.getItem(LATER) || 0) < 30 * 60e3; } catch { return false; } };

function go() {
  try { localStorage.setItem(KEY, 'hq'); } catch { /* storage blocked: this visit only */ }
  const u = new URL(location.href); u.searchParams.delete('layout'); location.replace(u);
}
function cancel() {
  clearInterval(timer); banner?.remove(); banner = null;
  try { localStorage.setItem(LATER, String(Date.now())); } catch { /* storage blocked */ }
}

/** Headquarters, after a short notice: why ('desks' or 'team'). Nothing when it is headquarters already. */
export function expandOffice(why = 'desks') {
  if (LAYOUT === 'hq' || fixedByUrl() || banner || declinedRecently()) return false;
  let left = 8;
  banner = el('div', 'ex-banner'); banner.setAttribute('role', 'status');
  const text = el('span', 'ex-text'), now = el('button', 'btn btn--sm btn--confirm', tr('ui.expand.now')), no = el('button', 'btn btn--sm', tr('ui.expand.cancel'));
  now.type = no.type = 'button';
  now.addEventListener('click', go); no.addEventListener('click', cancel);
  const draw = () => { text.textContent = tr(why === 'team' ? 'ui.expand.team' : 'ui.expand.desks', { n: left }); };
  draw(); banner.append(el('b', null, '🏢'), text, now, no);
  ($('stage') || document.body).append(banner);
  timer = setInterval(() => { left--; if (left <= 0) { clearInterval(timer); go(); } else draw(); }, 1000);
  return true;
}
