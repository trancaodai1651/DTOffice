// The AI team (server/team.mjs): every member a session of its own, doing its own job; the PM's assignment; a failed
// verification fixed; stopping it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROLES, STAGES, GROUPS, TEAMS, createTeam, membersOf, rolePrompt, rolesOf, routeTeams, verdictOf } from '../../server/team.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'office-team-'));
// a team whose sessions are stand-ins: at most `max` at once (the office's own limit), each ended by hand
function harness({ max = 3 } = {}) {
  const dir = tmp(), started = [], events = [];
  let n = 0;
  const running = () => started.filter((t) => !t.done).length;
  const team = createTeam({
    dataDir: path.join(dir, 'data'), lang: () => 'vi',
    start: (run, stage, prompt, role) => { if (running() >= max) return { ok: false, code: 'busy' }; const t = { id: `t${++n}`, stage: stage.key, prompt, role, done: false }; started.push(t); return { ok: true, task: t }; },
    stop: (id) => events.push(['stop', id]),
    onChange: (r, what) => events.push([what, r.status]),
  });
  // one member's session ends with its answer
  const finish = (role, result = 'ok', stage = null) => {
    const t = started.find((x) => !x.done && x.role === role && (!stage || x.stage === stage));
    assert.ok(t, `${role} is at work${stage ? ` in ${stage}` : ''}`);
    t.done = true; team.taskDone({ id: t.id, result });
  };
  const atWork = () => started.filter((t) => !t.done).map((t) => `${t.stage}:${t.role}`).sort();
  return { dir, team, started, events, finish, atWork };
}

test('15 roles in five groups, as the CEO laid them out', () => {
  assert.equal(ROLES.length, 15);
  assert.deepEqual(GROUPS, ['lead', 'design', 'dev', 'quality', 'ops']);
  assert.deepEqual(GROUPS.map((g) => ROLES.filter((r) => r.group === g).length), [3, 3, 4, 2, 3]);
  assert.deepEqual(STAGES.map((s) => s.roles), [['pm', 'po', 'ba'], ['architect', 'uiux'], ['frontend', 'backend', 'app', 'ai'], ['qa', 'reviewer', 'security'], ['devops', 'database']]);
});

test('every member is a session of its own, told its own job only; planning side by side', () => {
  const h = harness();
  assert.equal(h.team.begin({ dir: h.dir, goal: 'thêm trang đăng nhập', agent: 'codex', model: 'gpt-x', effort: 'high' }).ok, true);
  assert.deepEqual(h.atWork(), ['plan:ba', 'plan:pm', 'plan:po'], 'three sessions at once, one per member');
  const pm = h.started.find((t) => t.role === 'pm').prompt, ba = h.started.find((t) => t.role === 'ba').prompt;
  assert.match(pm, /^You are the PM Agent/);
  assert.match(pm, /ROLES:/, 'the PM assigns the roles');
  assert.match(pm, /PO Agent: .*\n- BA Agent:/, 'its colleagues named as others, not as itself');
  assert.match(pm, /Do not do their work/);
  assert.match(pm, /1-plan-pm\.md/);
  assert.match(ba, /^You are the BA Agent/);
  assert.doesNotMatch(ba, /ROLES:/, 'assigning is the PM\'s job');
  assert.match(pm, /GOAL: thêm trang đăng nhập/);
  assert.match(pm, /Codex CLI, model gpt-x, effort high/);
  assert.match(pm, /Vietnamese/);
});

test("the PM's assignment decides who works after it; the stages that change code run one member at a time", () => {
  const h = harness();
  h.team.begin({ dir: h.dir, goal: 'API đăng nhập' });
  h.finish('po'); h.finish('ba');
  assert.deepEqual(h.atWork(), ['plan:pm'], 'the stage waits for all its members');
  h.finish('pm', 'Kế hoạch xong.\nROLES: backend, database');
  assert.deepEqual(h.team.list()[0].named, ['backend', 'database']);
  assert.deepEqual(h.atWork(), ['design:architect'], 'UI/UX not named: no screens to design');
  h.finish('architect');
  assert.deepEqual(h.atWork(), ['build:backend'], 'only the engineer named');
  assert.match(h.started.at(-1).prompt, /1-plan-pm\.md[\s\S]*1-plan-ba\.md[\s\S]*2-design-architect\.md/, 'it reads the plan and the design');
  h.finish('backend');
  assert.deepEqual(h.atWork(), ['verify:qa'], 'QA first, the reviewer after it');
  h.finish('qa', 'VERDICT: PASS');
  assert.deepEqual(h.atWork(), ['verify:reviewer']);
  assert.match(h.started.at(-1).prompt, /4-verify-qa\.md/, 'the reviewer reads what QA found');
  h.finish('reviewer', 'ổn\nVERDICT: PASS');
  assert.deepEqual(h.atWork(), ['ship:devops']);
  h.finish('devops');
  assert.deepEqual(h.atWork(), ['ship:database'], 'Database was named: after DevOps');
  h.finish('database');
  assert.deepEqual(h.atWork(), ['report:pm']);
  h.finish('pm', 'báo cáo');
  const [run] = h.team.list();
  assert.equal(run.status, 'done');
  assert.deepEqual(run.stages.map((s) => `${s.key}:${s.jobs.map((j) => j.role).join('+')}`), ['plan:pm+po+ba', 'design:architect', 'build:backend', 'verify:qa+reviewer', 'ship:devops+database', 'report:pm']);
  assert.equal(run.stages[3].verdict, 'pass');
});

test('one FAIL is enough: the engineers fix their own parts and it is verified again; still failing twice, nothing ships', () => {
  const h = harness();
  h.team.begin({ dir: h.dir, goal: 'x' });
  h.finish('po'); h.finish('ba'); h.finish('pm', 'ROLES: frontend, backend, uiux');
  assert.deepEqual(h.atWork(), ['design:architect', 'design:uiux']);
  h.finish('architect'); h.finish('uiux');
  h.finish('frontend'); h.finish('backend');
  h.finish('qa', 'VERDICT: PASS'); h.finish('reviewer', 'VERDICT: FAIL\n- lỗi xử lý mật khẩu');
  assert.deepEqual(h.atWork(), ['fix:frontend']);
  h.finish('frontend'); h.finish('backend');
  assert.deepEqual(h.atWork(), ['verify:qa']);
  h.finish('qa', 'VERDICT: FAIL'); h.finish('reviewer', 'VERDICT: PASS');
  h.finish('frontend', 'ok', 'fix'); h.finish('backend', 'ok', 'fix');
  h.finish('qa', 'VERDICT: FAIL'); h.finish('reviewer', 'VERDICT: FAIL');
  assert.deepEqual(h.atWork(), ['report:pm'], 'two fixes used up: straight to the CEO, nothing shipped');
  h.finish('pm');
  assert.equal(h.team.list()[0].fixes, 2);
  assert.equal(h.team.list()[0].stages.some((s) => s.key === 'ship'), false);
});

test('members wait their turn when the office runs as many as it can; the CTO plans alongside when the goal went to it', () => {
  const h = harness({ max: 3 });
  h.team.begin({ dir: h.dir, goal: 'x', lead: 'cto' });
  assert.deepEqual(h.atWork(), ['plan:cto', 'plan:pm', 'plan:po'], 'four members, three places: the BA waits');
  h.finish('cto');
  assert.deepEqual(h.atWork(), ['plan:ba', 'plan:pm', 'plan:po'], 'a place free: the BA starts');
  h.finish('pm', 'ROLES: frontend'); h.finish('po'); h.finish('ba');
  h.finish('architect'); h.finish('frontend'); h.finish('qa', 'VERDICT: PASS'); h.finish('reviewer', 'VERDICT: PASS'); h.finish('devops');
  assert.deepEqual(h.atWork(), ['report:cto'], 'the CTO reports to the CEO');
});

test('the CEO stops it; a member that fails ends the run', () => {
  const h = harness();
  h.team.begin({ dir: h.dir, goal: 'x' });
  assert.equal(h.team.halt(h.team.list()[0].id), true);
  assert.deepEqual(h.events.filter((e) => e[0] === 'stop').length, 3, 'every member at work is stopped');
  assert.equal(h.team.list()[0].status, 'stopped');
  const f = harness();
  f.team.begin({ dir: f.dir, goal: 'x' });
  f.team.taskDone({ id: 't1', result: '', error: 'boom' });
  assert.equal(f.team.list()[0].status, 'fail');
});

test('the assignment, the verdict and the members of a stage', () => {
  assert.deepEqual(rolesOf('...\nROLES: Frontend, backend; UIUX, nobody, qa'), ['frontend', 'backend', 'uiux', 'qa']);
  assert.equal(rolesOf('no line'), null);
  assert.equal(verdictOf('...\nVERDICT: PASS'), 'pass');
  assert.equal(verdictOf('verdict: fail - 2 bugs'), 'fail');
  assert.equal(verdictOf('no verdict'), '');
  const run = { lead: 'pm', named: null };
  assert.deepEqual(membersOf(run, STAGES[2]), ['frontend', 'backend', 'app', 'ai'], 'nobody named: everyone');
  assert.deepEqual(membersOf({ ...run, named: ['database'] }, STAGES[2]), ['frontend', 'backend'], 'no engineer named: the two who build most things');
  assert.deepEqual(membersOf({ ...run, named: ['security'] }, STAGES[3]), ['qa', 'reviewer', 'security']);
  const p = rolePrompt({ run: { id: 'r1', goal: 'g', lead: 'pm', agent: 'claude' }, stage: STAGES[4], n: 5, role: 'devops', mates: ['devops'], lang: 'en', earlier: [] });
  assert.match(p, /Do not push, publish or deploy/);
  assert.match(p, /\.ai-office\/team\/r1\/5-ship-devops\.md/);
  assert.doesNotMatch(p, /colleagues/, 'alone in its stage');
});

test("the team room's desks are laid out in the server's own order of roles", async () => {
  const { TEAM_SEATS } = await import('../../src/shared/team-roles.js');
  assert.deepEqual(TEAM_SEATS, ROLES.map((r) => r.id));
});

test('a run stopped partway carries on where it was: the members who had finished keep their work', () => {
  const h = harness();
  h.team.begin({ dir: h.dir, goal: 'x' });
  h.finish('pm', 'ROLES: backend'); h.finish('po');
  const id = h.team.list()[0].id;
  h.team.halt(id);
  for (const x of h.started) x.done = true;   // (the stopped session is gone)
  assert.equal(h.team.list()[0].status, 'stopped');
  assert.equal(h.team.resume(id), true);
  assert.deepEqual(h.atWork(), ['plan:ba'], 'only the BA, who had not finished, starts again');
  assert.equal(h.started.filter((t) => t.role === 'pm').length, 1, 'the PM is not asked again');
  h.finish('ba');
  assert.deepEqual(h.atWork(), ['design:architect']);
  assert.equal(h.team.resume(id), false, 'a run at work is not resumed');
});

test('a member at work on one task is called for another only once done; code is changed by one task at a time', () => {
  const h = harness({ max: 10 });
  h.team.begin({ dir: h.dir, goal: 'first' });
  assert.equal(h.team.begin({ dir: h.dir, goal: 'second' }).ok, true, 'a second task is taken, not refused');
  assert.deepEqual(h.atWork(), ['plan:ba', 'plan:pm', 'plan:po'], 'the same three people: the second task waits for them');
  const second = h.team.list()[0];
  assert.deepEqual(second.stages[0].jobs.map((j) => j.held?.why), ['member', 'member', 'member']);
  assert.ok(h.events.some((e) => e[0] === 'held'));
  h.finish('pm', 'ROLES: frontend'); h.finish('po'); h.finish('ba');
  assert.deepEqual(h.atWork(), ['design:architect', 'plan:ba', 'plan:pm', 'plan:po'], 'freed: the first task goes on, the second one starts its plan');
  assert.equal(h.team.list()[0].stages[0].jobs[0].held, null);
  h.finish('architect');
  h.finish('pm', 'ROLES: frontend'); h.finish('po'); h.finish('ba');
  assert.deepEqual(h.atWork(), ['build:frontend', 'design:architect'], 'the architect of the second task starts once the first one is free');
  h.finish('architect');
  assert.deepEqual(h.atWork(), ['build:frontend'], "the second task's frontend waits: the same person, and the same code");
  h.finish('frontend');
  assert.deepEqual(h.atWork(), ['build:frontend', 'verify:qa']);
});

test('the guide picks the team(s); a task for two teams goes from one to the next', () => {
  assert.deepEqual(routeTeams('sửa lỗi trang đăng nhập').map((x) => x.id), ['dev']);
  assert.deepEqual(routeTeams('???'), [{ id: 'dev', words: [] }], 'nothing matched: the dev team');
  assert.equal(routeTeams('fix the api').find((x) => x.id === 'dev').words.includes('api'), true);
  assert.equal(routeTeams('rapid').length, 1);
  TEAMS.push({ id: 'other', roles: ROLES.map((r) => r.id), stages: () => STAGES, words: ['zzz'] });
  try {
    assert.deepEqual(routeTeams('zzz api code').map((x) => x.id), ['dev', 'other']);
    const h = harness({ max: 10 });
    h.team.begin({ dir: h.dir, goal: 'x', teams: ['dev', 'other', 'nope'] });
    assert.deepEqual(h.team.list()[0].teams, ['dev', 'other']);
    h.finish('pm', 'ROLES: frontend'); h.finish('po'); h.finish('ba'); h.finish('architect');
    h.finish('frontend'); h.finish('qa', 'VERDICT: PASS'); h.finish('reviewer', 'VERDICT: PASS'); h.finish('devops'); h.finish('pm');
    assert.ok(h.events.some((e) => e[0] === 'team'));
    assert.deepEqual(h.atWork(), ['plan:ba', 'plan:pm', 'plan:po'], 'the second team plans, reading what the first one left');
    const r = h.team.list()[0];
    assert.equal(r.ti, 1); assert.equal(r.stages.at(-1).team, 'other');
    assert.match(h.started.at(-1).prompt, /5-report-pm.md|report/);
  } finally { TEAMS.pop(); }
});
