// Leisure ends on the game's result. New work and approval requests can interrupt it; idle animations cannot.
const REST_ACTIONS = new Set(['idle', 'rest', 'stop', 'interrupt', 'deploy', 'push', 'cigreen', 'release', 'testok']);
export const gameWorkPending = (session, want) => !session || session.status !== 'rest' || !!session.bg?.length || !!(want && !REST_ACTIONS.has(want.type));
export const gameHasWinner = (score, target, remaining = Infinity) => remaining === 0 || score.some((n) => n >= target);
// A scheduled court booking can end after its current match, rather than in the middle of a rally.
export const scheduledRoundFinished = (due, completed, previous = 0) => due && completed > previous;
