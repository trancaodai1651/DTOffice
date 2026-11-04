// A valid explicit choice always wins; headquarters is only the fallback.
export function officeLayout(query, saved) {
  if (['cozy', 'pro', 'hq'].includes(query)) return query;
  return ['cozy', 'pro', 'hq'].includes(saved) ? saved : 'hq';
}
