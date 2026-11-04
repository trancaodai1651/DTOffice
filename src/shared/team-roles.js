// The AI team's roles in the order their desks are laid out in the team's room (world/pro/wing.js, net/live.js) and
// listed by the server (server/team.mjs): management, analysis and design, engineering, quality, operations. The
// room's 16th desk is the CEO's.
export const TEAM_SEATS = ['cto', 'pm', 'po', 'ba', 'architect', 'uiux', 'frontend', 'backend', 'app', 'ai', 'qa', 'reviewer', 'security', 'devops', 'database'];
// Group boundaries in the same ordered catalog; the roster is available before API metadata loads.
export const TEAM_GROUPS = [ ['lead', 0, 3], ['design', 3, 6], ['dev', 6, 10], ['quality', 10, 12], ['ops', 12, 15] ];
