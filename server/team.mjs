// "Đội AI": a software team of 15 agents, run by you, the CEO. You give a goal to the PM or the CTO; the team works it
// through five stages, one after the other. Every member is a session of its own (Claude Code or Codex, the model and
// effort you chose) that does its own job and nobody else's, and writes its own report:
//   1. plan    PM, Product Owner, BA (and the CTO when the goal went to the CTO), side by side. The PM also says which
//              of the other roles this goal needs (a "ROLES:" line): only those are called after.
//   2. design  Solution Architect, and UI/UX when there are screens, side by side
//   3. build   the engineers the PM named (Frontend, Backend, Desktop/Mobile, AI Engineer), one after another, each in
//              its own part of the code and reading what the one before it did
//   4. verify  QA Tester and Code Reviewer (and Security when named), one after another, each with its own verdict, PASS
//              or FAIL; one FAIL is enough: the engineers fix what was found, each in its own part, and it is verified
//              again, twice at most
//   5. ship    DevOps (and Database when named), one after another: build, packaging, migrations, how to deploy and
//              watch it; nothing published unless the goal asks for it
//   then       the PM (or the CTO) reports to the CEO.
// Reports: .ai-office/team/<run>/<n>-<stage>-<role>.md, each reading the ones before it. The stages that change the code
// run their members one at a time, so two of them never edit the same file at once; the others side by side, as many as
// the office runs at a time (server/tasks.mjs), the rest waiting their turn.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** The 15 roles, by group, and what each does (said to the model in English; their names on screen are the page's). */
export const ROLES = [
  { id: 'cto', group: 'lead', duty: 'Owns the technical direction: the stack, the architecture decisions and their trade-offs, technical risk, and the final technical sign-off.' },
  { id: 'pm', group: 'lead', duty: 'Owns delivery: breaks the goal into a plan with milestones and tasks, assigns them to the right roles, tracks progress and reports to the CEO.' },
  { id: 'po', group: 'lead', duty: 'Owns the product: the user value, the scope (what is in and out), priorities, and acceptance criteria for each feature.' },
  { id: 'ba', group: 'design', duty: 'Analyses the requirements: user stories, business rules, edge cases, data needed, and questions that must be settled.' },
  { id: 'architect', group: 'design', duty: 'Designs the solution: components and their boundaries, data model, APIs, folder structure, and how it fits the existing code.' },
  { id: 'uiux', group: 'design', duty: 'Designs the user experience: screens, flows, states (empty, loading, error), accessibility and the look, consistent with what exists.' },
  { id: 'frontend', group: 'dev', duty: 'Builds the user interface and its client-side logic, following the UI/UX design and the existing conventions.' },
  { id: 'backend', group: 'dev', duty: 'Builds the server side: APIs, business logic, validation, integrations and their error handling.' },
  { id: 'app', group: 'dev', duty: 'Builds the desktop and mobile parts (app shells, native integration, packaging specifics) when the goal needs them.' },
  { id: 'ai', group: 'dev', duty: 'Builds the AI parts: model calls, prompts, agents, evaluation, and keeps them safe and cheap.' },
  { id: 'qa', group: 'quality', duty: 'Tests: writes and runs automated tests for the acceptance criteria, tries edge cases, and reports each bug with steps to reproduce.' },
  { id: 'reviewer', group: 'quality', duty: 'Reviews the code: correctness, readability, consistency with the codebase, performance, and things that will hurt later.' },
  { id: 'security', group: 'ops', duty: 'Checks security: secrets, input validation, auth, dependencies, data exposure; anything that must be fixed before shipping.' },
  { id: 'devops', group: 'ops', duty: 'Ships it: build and packaging, CI, configuration, how to deploy, monitor and roll back. Never publishes or deploys unless the goal asks.' },
  { id: 'database', group: 'ops', duty: 'Owns the data: schema and migrations, indexes, backups, data integrity and how the data is kept over time.' },
];
export const GROUPS = ['lead', 'design', 'dev', 'quality', 'ops'];
/** The stages, in order: their members (always: who is there whatever the goal; maybe: only when the PM named them),
 *  whether they work side by side, and what each must leave behind. */
export const STAGES = [
  { key: 'plan', roles: ['pm', 'po', 'ba'], always: ['pm', 'po', 'ba'], parallel: true, task: 'Plan the goal, each from your own role: read the code that exists first. Do not write product code in this stage.' },
  { key: 'design', roles: ['architect', 'uiux'], always: ['architect'], parallel: true, task: 'Design the solution from the plan, each from your own role. Fit what exists; keep it as simple as the goal allows. Do not write product code in this stage.' },
  { key: 'build', roles: ['frontend', 'backend', 'app', 'ai'], always: [], parallel: false, task: 'Build it: implement your own part of the plan and the design in the code, following the codebase\'s conventions; run the build and the existing tests, and fix what you break.' },
  { key: 'verify', roles: ['qa', 'reviewer', 'security'], always: ['qa', 'reviewer'], parallel: false, task: 'Verify the work from your own role. Fix only small, certain problems in your own field; list the rest. End your report and your answer with a line that is exactly "VERDICT: PASS" when it can ship, or "VERDICT: FAIL" followed by the problems that must be fixed.' },
  { key: 'ship', roles: ['devops', 'database'], always: ['devops'], parallel: false, task: 'Prepare it to ship from your own role. Do not push, publish or deploy anywhere unless the CEO\'s goal explicitly asks for it.' },
];
const FIX = { key: 'fix', roles: ['frontend', 'backend', 'app', 'ai'], always: [], parallel: false, task: 'Fix every problem the verification found in your own part of the code (read its reports), then run the build and the tests again.' };
const REPORT = { key: 'report', roles: [], always: [], parallel: false, task: 'Report to the CEO: read every report of this run and write a short summary: what was delivered, who did what, how it was verified, what is left, risks, and what the CEO should decide next.' };
const MAX_FIXES = 2;
// what each role does in each stage, beyond its duty
const FOCUS = {
  pm: 'Restate the goal and the scope, break it into tasks and assign each to a role. End your report with a line "ROLES: …" naming, from architect, uiux, frontend, backend, app, ai, security, database, only the roles this goal needs (QA, Code Reviewer and DevOps always take part).',
  po: 'Say what value it brings, what is in and out of scope, the priorities, and acceptance criteria for each part.',
  ba: 'Write the user stories, business rules, edge cases and the data needed; answer open questions with the most sensible choice and say so.',
  cto: 'Settle the technical direction: the stack, the main decisions and their trade-offs, the technical risks.',
  architect: 'Give the components and their boundaries, the data model, the APIs and the files to add or change.',
  uiux: 'Give the screens, the flows and their states (empty, loading, error), consistent with what exists.',
  qa: 'Run the tests and add tests for the acceptance criteria; try the edge cases; report each bug with steps to reproduce.',
  reviewer: 'Review the changes: correctness, readability, consistency with the codebase, performance.',
  security: 'Check secrets, input validation, auth, dependencies and data exposure.',
  devops: 'Build and package it, check the configuration and CI, write how to deploy, monitor and roll back.',
  database: 'Check the schema and migrations, indexes, backups and data integrity.',
};
const roleOf = (id) => ROLES.find((r) => r.id === id);
const fileOf = (run, n, key, role) => path.posix.join('.ai-office', 'team', run.id, `${n}-${key}-${role}.md`);

/** The roles the PM named in its plan ("ROLES: frontend, backend"), or null when it named none. */
export function rolesOf(text) {
  const m = /^\s*ROLES?\s*:\s*(.+)$/im.exec(String(text || '')); if (!m) return null;
  const ids = ROLES.map((r) => r.id), got = m[1].toLowerCase().split(/[\s,;/]+/).map((w) => w.replace(/[^a-z]/g, '')).filter((w) => ids.includes(w));
  return got.length ? [...new Set(got)] : null;
}
/** Who works in a stage of this run: its members always there, and those the PM named (all of them when it named none). */
export function membersOf(run, stage) {
  if (stage.key === 'report') return [run.lead];
  const named = run.named, pick = stage.roles.filter((r) => stage.always.includes(r) || !named || named.includes(r));
  if (stage.key === 'plan' && run.lead === 'cto') pick.unshift('cto');
  if ((stage.key === 'build' || stage.key === 'fix') && !pick.length) return stage.roles.filter((r) => r === 'frontend' || r === 'backend');   // (the PM named no engineer: the two who build most things)
  return pick;
}

/** What one member's session is told: the team, its own role and only that, the goal, what to read, where to write. */
export function rolePrompt({ run, stage, n, role, mates, lang, earlier }) {
  const R = roleOf(role), others = mates.filter((m) => m !== role);
  return [
    `You are the ${role.toUpperCase()} Agent of an AI software team in "DT Office". The CEO (the user) gave this goal to the ${run.lead === 'cto' ? 'CTO' : 'PM'}:`,
    '', `GOAL: ${run.goal}`, '',
    `This session is yours alone: stage ${n} (${stage.key}), running on ${run.agent === 'codex' ? 'Codex CLI' : 'Claude Code'}${run.model ? `, model ${run.model}` : ''}${run.effort ? `, effort ${run.effort}` : ''} (write exactly that in your notes).`,
    `Your role: ${R.duty}`,
    ...(FOCUS[role] ? [`In this stage: ${FOCUS[role]}`] : []),
    `The stage's task: ${stage.task}`,
    ...(others.length ? ['', 'Your colleagues in this stage are separate agents, each in its own session. Do not do their work:', ...others.map((m) => `- ${m.toUpperCase()} Agent: ${roleOf(m).duty}`)] : []),
    '',
    ...(earlier.length ? ['Read these reports first (the stages before you, and the colleagues before you in this one):', ...earlier.map((f) => `- ${f}`), ''] : []),
    'Before anything, read the project memory as its CLAUDE.md / AGENTS.md rules say (.ai-office/).',
    `Write your own report to ${fileOf(run, n, stage.key, role)} (create the folders): what you did, decisions, files changed, what the next ones must know. When you are done, add your entry to the project memory as its rules say.`,
    `Write the report and your final answer in ${lang === 'vi' ? 'Vietnamese' : 'English'}. End with a short summary (3–6 lines) of what you did.`,
  ].join('\n');
}
/** The verification's verdict, from its answer or its report: 'pass', 'fail', or '' when it gave none. */
export function verdictOf(text) {
  const m = /VERDICT:\s*(PASS|FAIL)/i.exec(String(text || ''));
  return m ? m[1].toLowerCase() : '';
}

/**
 * @param {{ dataDir: string, lang: () => string, start: (run: object, stage: object, prompt: string, role: string) => { ok: boolean, task?: object, code?: string }, stop: (taskId: string) => void, onChange?: (run: object, what: string, extra?: object) => void, now?: () => number }} o
 * start: one member's session; { ok: false, code: 'busy' } when the office runs as many as it can: it waits its turn.
 */
export function createTeam({ dataDir, lang, start, stop, onChange = () => {}, now = Date.now }) {
  const file = path.join(dataDir, 'team.json');
  let runs = [];
  try { runs = JSON.parse(fs.readFileSync(file, 'utf8')).runs || []; } catch { /* none yet */ }
  // an office that stopped while a run was going: that run is over
  for (const r of runs) if (r.status === 'run') { r.status = 'stopped'; for (const s of r.stages) { if (s.state === 'run') s.state = 'stopped'; for (const j of s.jobs || []) if (j.state === 'run' || j.state === 'wait') j.state = 'stopped'; } }
  const save = () => { try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ runs: runs.slice(0, 20) }, null, 1)); } catch { /* best effort */ } };
  const pub = (r) => ({ id: r.id, dir: r.dir, goal: r.goal, lead: r.lead, agent: r.agent, model: r.model, effort: r.effort, status: r.status, at: r.at, end: r.end || 0, fixes: r.fixes, named: r.named || null,
    stages: r.stages.map(({ key, roles, state, verdict, jobs = [] }) => ({ key, roles, state, verdict, jobs: jobs.map(({ role, state: js, verdict: v, summary }) => ({ role, state: js, verdict: v, summary })) })) });
  const end = (r, status, what, extra) => { r.status = status; r.end = now(); save(); onChange(r, what, extra); };

  // the next stage of a run, once the one before it is done
  function nextStage(r) {
    if (r.status !== 'run') return;
    const last = r.stages.at(-1);
    let stage;
    if (!last) stage = STAGES[0];
    else if (last.key === 'verify' && last.verdict !== 'pass' && r.fixes < MAX_FIXES) { r.fixes++; stage = FIX; }
    else if (last.key === 'fix') stage = STAGES.find((s) => s.key === 'verify');
    else if (last.key === 'verify' && last.verdict !== 'pass') stage = REPORT;   // (still failing after the fixes: nothing shipped, the CEO is told)
    else if (last.key === 'report') { end(r, 'done', 'done'); return; }
    else if (last.key === 'ship') stage = REPORT;
    else { const i = STAGES.findIndex((s) => s.key === last.key); stage = STAGES[i + 1] || REPORT; }
    const n = r.stages.length + 1, roles = membersOf(r, stage);
    const s = { key: stage.key, n, roles, parallel: stage.parallel, state: 'run', verdict: '', jobs: roles.map((role) => ({ role, state: 'wait', task: null, file: fileOf(r, n, stage.key, role), summary: '', verdict: '' })) };
    r.stages.push(s); save(); onChange(r, 'stage', { stage: s });
    launch(r);
  }
  // start whoever may start now: in a stage side by side, everyone (as the office allows); one after another, the next
  function launch(r) {
    const s = r.stages.at(-1); if (!s || r.status !== 'run') return;
    const stage = [...STAGES, FIX, REPORT].find((x) => x.key === s.key);
    for (const j of s.jobs) {
      if (j.state !== 'wait') continue;
      if (!s.parallel && s.jobs.some((x) => x.state === 'run')) return;
      const before = [...r.stages.slice(0, -1).flatMap((x) => (x.jobs || []).filter((y) => y.state === 'done').map((y) => y.file)), ...(s.parallel ? [] : s.jobs.filter((x) => x.state === 'done').map((x) => x.file))];
      const got = start(r, s, rolePrompt({ run: r, stage, n: s.n, role: j.role, mates: s.roles, lang: lang(), earlier: before }), j.role);
      if (!got?.ok && got?.code === 'busy') return;   // (the office is running as many as it can: when one ends)
      if (!got?.ok) { j.state = 'fail'; j.summary = got?.code || 'error'; s.state = 'fail'; end(r, 'fail', 'fail', { code: got?.code }); return; }
      j.task = got.task.id; j.state = 'run'; save(); onChange(r, 'job', { stage: s, job: j });
      if (!s.parallel) return;
    }
  }
  // every member of a stage done: its verdict, then the next stage
  function stageDone(r, s) {
    s.state = 'done';
    if (s.key === 'verify') s.verdict = s.jobs.some((x) => x.verdict === 'fail') ? 'fail' : s.jobs.some((x) => x.verdict === 'pass') ? 'pass' : 'fail';   // (one FAIL is enough; nobody saying PASS is no pass)
    save(); onChange(r, 'stageDone', { stage: s });
    nextStage(r);
  }
  return {
    ROLES, STAGES,
    list: () => runs.map(pub),
    get: (id) => { const r = runs.find((x) => x.id === id); return r ? pub(r) : null; },
    /** A goal from the CEO: { dir, goal, lead: 'pm' | 'cto', agent, model, effort } -> { ok, run } | { ok: false, code } */
    begin({ dir, goal, lead = 'pm', agent = 'claude', model = '', effort = '' }) {
      goal = String(goal || '').trim().slice(0, 4000);
      if (!goal) return { ok: false, code: 'empty' };
      if (runs.some((r) => r.status === 'run' && r.dir === dir)) return { ok: false, code: 'teamBusy' };
      const r = { id: `${new Date(now()).toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 6)}`, dir, goal, lead: lead === 'cto' ? 'cto' : 'pm', agent: agent === 'codex' ? 'codex' : 'claude', model, effort, status: 'run', at: now(), fixes: 0, named: null, stages: [] };
      runs.unshift(r); runs = runs.slice(0, 20);
      onChange(r, 'begin');
      nextStage(r);
      return r.status === 'fail' ? { ok: false, code: r.stages[0]?.jobs?.[0]?.summary || 'error' } : { ok: true, run: pub(r) };
    },
    /** A task ended: if it was a member's, its stage goes on; the next stage once all of its members are done. */
    taskDone(t) {
      const r = runs.find((x) => x.stages.some((s) => (s.jobs || []).some((j) => j.task === t.id)));
      if (!r) { for (const x of runs) if (x.status === 'run') launch(x); return false; }   // (someone else's task ended: room for a member waiting)
      const s = r.stages.find((x) => (x.jobs || []).some((j) => j.task === t.id)), j = s.jobs.find((x) => x.task === t.id);
      let report = ''; try { report = fs.readFileSync(path.join(r.dir, j.file), 'utf8'); } catch { /* it wrote none */ }
      j.summary = String(t.result || t.error || '').trim().slice(-1200);
      if (s.key === 'verify') j.verdict = verdictOf(t.result) || verdictOf(report) || (t.error ? 'fail' : '');
      if (j.role === 'pm' && s.key === 'plan') r.named = rolesOf(report) || rolesOf(t.result);   // (the PM's assignment: who works after)
      if (t.stopped || r.status !== 'run') { j.state = 'stopped'; if (r.status === 'run') end(r, 'stopped', 'stopped'); else save(); return true; }
      if (t.error && !t.result) { j.state = 'fail'; s.state = 'fail'; end(r, 'fail', 'fail', { stage: s, job: j }); return true; }
      j.state = 'done'; save(); onChange(r, 'jobDone', { stage: s, job: j });
      if (s.jobs.some((x) => x.state !== 'done')) { launch(r); for (const x of runs) if (x !== r && x.status === 'run') launch(x); return true; }
      stageDone(r, s);
      return true;
    },
    /** A run stopped (by the CEO, the office closing under it) or failed, carried on where it was: the members of its
     *  stage who hadn't finished start again; those who had keep their work. false when it can't be. */
    resume(id) {
      const r = runs.find((x) => x.id === id && (x.status === 'stopped' || x.status === 'fail')); if (!r) return false;
      if (runs.some((x) => x !== r && x.status === 'run' && x.dir === r.dir)) return false;
      r.status = 'run'; r.end = 0;
      const s = r.stages.at(-1);
      if (!s) { save(); onChange(r, 'resume'); nextStage(r); return true; }
      s.state = 'run';
      for (const j of s.jobs || []) if (j.state !== 'done') { j.state = 'wait'; j.task = null; }
      save(); onChange(r, 'resume', { stage: s });
      if (!(s.jobs || []).some((j) => j.state === 'wait')) stageDone(r, s); else launch(r);
      return true;
    },
    /** Stopped by the CEO: every member at work is stopped too. */
    halt(id) {
      const r = runs.find((x) => x.id === id && x.status === 'run'); if (!r) return false;
      const s = r.stages.at(-1);
      if (s) { s.state = 'stopped'; for (const j of s.jobs || []) { if (j.state === 'run' && j.task) stop(j.task); if (j.state === 'run' || j.state === 'wait') j.state = 'stopped'; } }
      end(r, 'stopped', 'stopped'); return true;
    },
  };
}
