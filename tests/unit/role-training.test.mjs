import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TRAINED_ROLES, defaultRoleSkill, defaultRoleSkills } from '../../server/role-training.mjs';
import { ROLES, MARKETING_ROLES, createTeam } from '../../server/team.mjs';
import { createSpecialists } from '../../server/specialists.mjs';

test('every Dev, Marketing and specialist position has nonempty role-specific training', () => {
  assert.equal(TRAINED_ROLES.length, 38); assert.equal(new Set(TRAINED_ROLES).size, 38);
  const skills = defaultRoleSkills();
  for (const id of [...ROLES, ...MARKETING_ROLES, { id: 'news' }, { id: 'video' }].map(r => r.id)) assert.ok(skills[id]?.length > 300, id);
  assert.equal(defaultRoleSkill('unknown'), '');
  assert.match(skills.frontend, /accessible UI/); assert.match(skills.backend, /authorization/);
  assert.match(skills.news, /primary sources/); assert.match(skills.video, /actual MP4/);
});

test('defaults and custom skills reach the actual launched role, including specialists; clearing custom keeps defaults', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-training-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const prompts = [];
  const team = createTeam({ dataDir: dir, lang: () => 'en', start: (_r, _s, prompt, role) => { prompts.push({ prompt, role }); return { ok: true, task: { id: role } }; }, stop() {} });
  team.setSkill('frontend', 'CUSTOM-FRONTEND');
  team.begin({ dir, goal: 'Build a button', role: 'frontend' });
  assert.match(prompts[0].prompt, /Default skill: frontend/); assert.match(prompts[0].prompt, /CUSTOM-FRONTEND/);
  team.setSkill('news', 'CUSTOM-NEWS'); assert.equal(createTeam({ dataDir: dir, lang: () => 'en', start() {}, stop() {} }).skills().news, 'CUSTOM-NEWS');
  const specialists = createSpecialists({ dataDir: path.join(dir, 'data'), home: dir, lang: () => 'en', start: options => { prompts.push({ prompt: options.text, role: options.role }); return { ok: true, task: { id: 'news' } }; }, stop() {}, getSkill: role => team.skills()[role] || '' });
  specialists.news({ topic: 'daily research', agent: 'codex' });
  assert.match(prompts.at(-1).prompt, /Default skill: news/); assert.match(prompts.at(-1).prompt, /CUSTOM-NEWS/);
  team.setSkill('news', ''); assert.match(defaultRoleSkill('news'), /primary sources/);
  assert.equal(team.begin({ dir, goal: 'wrong flow', role: 'news' }).code, 'badRole', 'specialists keep their own job pipeline');
});
