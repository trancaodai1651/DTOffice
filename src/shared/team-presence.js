import { TEAM_SEATS } from './team-roles.js';

export function sessionActivity(session, permissions = []) {
  if ([...permissions].some(p => p.sess === session.id) || session.status === 'wait') return 'wait';
  return ['work', 'rest'].includes(session.status) ? session.status : 'unknown';
}

// A projection of real sessions, never a source of synthetic sessions or usage.
export function deriveTeamPresence(sessions, permissions = [], freshness = 'loading', seats = TEAM_SEATS) {
  const list = [...sessions], pending = [...permissions], rank = { wait: 0, work: 1, rest: 2, unknown: 3 };
  return seats.map((roleId, seatIndex) => {
    const own = list.filter(s => s.role === roleId).sort((a, b) =>
      rank[sessionActivity(a, pending)] - rank[sessionActivity(b, pending)] ||
      (b.lastAt || 0) - (a.lastAt || 0) || String(a.id).localeCompare(String(b.id)));
    return { roleId, seatIndex, sessionIds: own.map(s => s.id), primarySessionId: own[0]?.id || null,
      activity: freshness === 'loading' ? 'unknown' : own.length ? sessionActivity(own[0], pending) : 'idle', freshness };
  });
}
