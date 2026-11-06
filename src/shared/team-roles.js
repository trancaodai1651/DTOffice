// The AI team's roles in the order their desks are laid out in the team's room (world/pro/wing.js, net/live.js) and
// listed by the server (server/team.mjs): management, analysis and design, engineering, quality, operations. The
// room's 16th desk is the CEO's.
export const TEAM_SEATS = ['cto', 'pm', 'po', 'ba', 'architect', 'uiux', 'frontend', 'backend', 'app', 'ai', 'qa', 'reviewer', 'security', 'devops', 'database'];
// Group boundaries in the same ordered catalog; the roster is available before API metadata loads.
export const TEAM_GROUPS = [ ['lead', 0, 3], ['design', 3, 6], ['dev', 6, 10], ['quality', 10, 12], ['ops', 12, 15] ];
// The marketing department's desks (server/team.mjs MARKETING_ROLES), in the order of the department's desks on the HQ
// wing: the back room (world/layout.js DEPTS[0]) holds the manager, research and strategy, the review; the front room
// (DEPTS[2]) content and the channels. null: a desk left free (the CEO's, by the manager).
export const MARKETING_SEATS = ['cmo', 'research', 'strategist', 'brand', 'product', 'editor', 'analytics', null,
  'content', 'creator', 'copywriter', 'designer', 'motion', 'seo', 'ads', 'social', 'email', 'pr', 'kol', 'events'];
// "Phòng Kho dữ liệu" (world/layout.js DEPTS[1], kho): the asset manager and the product photo designer, by the shelves
export const KHO_SEATS = ['librarian', 'photo'];
export const MARKETING_ROLE_IDS = [...MARKETING_SEATS, ...KHO_SEATS].filter(Boolean);
// the marketing department in the roster, by group (server/team.mjs MARKETING_ROLES / MARKETING_GROUPS)
export const MARKETING_ROSTER = [
  ['mlead', ['cmo']], ['mstrategy', ['research', 'strategist', 'brand', 'product']], ['mcontent', ['content', 'creator', 'copywriter', 'designer', 'motion']],
  ['mchannel', ['seo', 'ads', 'social', 'email', 'pr', 'kol', 'events']], ['massets', ['librarian', 'photo']], ['mquality', ['editor', 'analytics']],
];
