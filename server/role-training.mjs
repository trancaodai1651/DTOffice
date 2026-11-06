// Versioned role training shipped with the app. Personal instructions are appended separately, never replace this.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEAM_SEATS, MARKETING_ROLE_IDS, SPECIALIST_ROLE_IDS } from '../src/shared/team-roles.js';
export const TRAINED_ROLES = [...TEAM_SEATS, ...MARKETING_ROLE_IDS, ...SPECIALIST_ROLE_IDS];
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'skills');
export function defaultRoleSkill(role, marketingDir = path.join(ROOT, 'marketing')) {
  if (!TRAINED_ROLES.includes(role)) return '';
  const dir = MARKETING_ROLE_IDS.includes(role) ? marketingDir : path.join(ROOT, SPECIALIST_ROLE_IDS.includes(role) ? 'specialists' : 'dev');
  const read = name => { try { return fs.readFileSync(path.join(dir, name), 'utf8').trim(); } catch { return ''; } };
  return [read('_team.md'), read(`${role}.md`)].filter(Boolean).join('\n\n');
}
export const defaultRoleSkills = () => Object.fromEntries(TRAINED_ROLES.map(role => [role, defaultRoleSkill(role)]));
