import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { test, expect } from '@playwright/test';

test.use(process.platform === 'win32' ? { channel: 'msedge' } : {});
test.describe.configure({ mode: 'serial' });
const PORT = (Number(process.env.E2E_PORT) || 4399) + 54, BASE = `http://127.0.0.1:${PORT}`;
let server: ChildProcess | null = null, workspace = '';
test.beforeAll(async () => {
  const out = path.resolve(process.env.E2E_OUT || 'test-results', `departments-${Date.now()}`), home = path.join(out, 'home'), data = path.join(out, 'data');
  workspace = path.join(out, 'project');
  for (const dir of [home, data, workspace]) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(data, 'prefs.json'), JSON.stringify({ agents: ['claude', 'codex'], lang: 'en', tunnel: false, memory: false }));
  const log = fs.openSync(path.join(out, 'server.log'), 'a');
  server = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), CODEX_HOME: path.join(home, '.codex'), OFFICE_CLAUDE_BIN: path.resolve('tests/e2e/fake-employee.mjs'), OFFICE_CODEX_BIN: path.resolve('tests/e2e/fake-employee.mjs'), NODE_ENV: 'production', OFFICE_PORT: String(PORT), OFFICE_DATA_DIR: data, OFFICE_USAGE: '0', OFFICE_CI: '0', OFFICE_AI_ACCOUNTS: '0', OFFICE_CODEX_SESSIONS: '0', OFFICE_TRANSLATE: '0', OFFICE_OPEN_URL: '0', OFFICE_MEMORY: '0' }, stdio: ['ignore', log, log], windowsHide: true });
  fs.closeSync(log);
  await expect.poll(async () => { try { return (await fetch(`${BASE}/health`)).ok; } catch { return false; } }, { timeout: 60000 }).toBe(true);
  await fetch(`${BASE}/api/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'add', dir: workspace }) });
});
test.afterAll(() => server?.kill());

for (const agent of ['claude', 'codex']) test(`${agent}: a manager starts the right employee sessions and projects their actual roles`, async ({ request }) => {
  const sid = `original-${agent}`;
  await request.post(`${BASE}/event`, { data: { hook_event_name: 'SessionStart', session_id: sid, cwd: workspace, agent } });
  for (const department of ['dev', 'marketing']) {
    const res = await request.post(`${BASE}/api/tasks`, { data: { sid, agent: agent === 'claude' ? 'codex' : 'claude', assignment: department, text: 'Prepare the requested department deliverable' } });
    expect(res.ok()).toBe(true); const body = await res.json(); expect(body.delegated).toBe(true);
    expect(body.run.agent).toBe(agent); expect(body.run.teams).toEqual([department]);
    await expect.poll(async () => { const { runs } = await (await fetch(`${BASE}/api/team`)).json(); return runs.find((r: { id: string }) => r.id === body.run.id)?.status; }, { timeout: 45000 }).toBe('done');
    const { runs } = await (await fetch(`${BASE}/api/team`)).json(), run = runs.find((r: { id: string }) => r.id === body.run.id);
    const jobs = run.stages.flatMap((s: { jobs: { role: string; state: string }[] }) => s.jobs);
    expect(jobs.some((j: { role: string }) => j.role === (department === 'dev' ? 'frontend' : 'copywriter'))).toBe(true);
    expect(jobs.every((j: { state: string }) => j.state === 'done')).toBe(true);
    const { sessions } = await (await fetch(`${BASE}/api/tasks`)).json();
    expect(sessions.some((s: { role?: string }) => s.role === (department === 'dev' ? 'frontend' : 'copywriter'))).toBe(true);
  }
});

test('the actual task UI offers both managers and single session; selecting a manager does not run a direct job', async ({ page, request }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('office-tips', 'seen'); localStorage.setItem('office-quality', 'low'); });
  await page.goto(`${BASE}/?debug&view=2d`);
  await page.waitForFunction('window.__office');
  await page.locator('#btn-team-presence').click();
  await expect(page.locator('[data-department-manager="pm"]')).toBeVisible();
  await page.locator('[data-department-manager="cmo"]').click();
  await expect(page.locator('[data-assignment-role]')).toHaveValue('cmo');
  await page.screenshot({ path: path.resolve(process.env.E2E_OUT || 'test-results', 'department-managers.png'), fullPage: true });
  const r = await request.post(`${BASE}/api/team`, { data: { role: 'cmo', goal: 'Prepare product captions', agent: 'codex' } });
  expect(r.ok()).toBe(true); const body = await r.json(); expect(body.run.directRole).toBe('');
  expect(body.run.stages[0].key).toBe('mplan');
  await expect.poll(async () => { const info = await (await fetch(`${BASE}/api/team`)).json(); return info.runs.find((x: { id: string }) => x.id === body.run.id)?.status; }, { timeout: 45000 }).toBe('done');
  await page.locator('.tm-sheet .zc-task-head button').click();
  await page.locator('#btn-chat').click();
  await page.locator('.zc-task-btn').click();
  await page.locator('.zc-task textarea').fill('Prepare a marketing campaign');
  await page.locator('.zc-task .zc-task-go').click();
  const choices = page.locator('[data-task-assignment]');
  await expect(choices.getByRole('button')).toHaveCount(3);
  await expect(choices.getByRole('button', { name: 'Marketing department manager' })).toHaveAttribute('aria-pressed', 'true');
  await choices.getByRole('button', { name: 'This CLI session only' }).click();
  await expect(choices.getByRole('button', { name: 'This CLI session only' })).toHaveAttribute('aria-pressed', 'true');
  await choices.getByRole('button', { name: 'Marketing department manager' }).click();
  await page.screenshot({ path: path.resolve(process.env.E2E_OUT || 'test-results', 'department-task-routing.png'), fullPage: true });
  const response = page.waitForResponse(r => r.request().method() === 'POST' && r.url() === `${BASE}/api/tasks`);
  await page.locator('.zc-task-step:visible .zc-task-go').click();
  const actual = await (await response).json(); expect(actual.delegated).toBe(true);
  expect(actual.run.teams).toEqual(['marketing']);
  await expect.poll(async () => { const info = await (await fetch(`${BASE}/api/team`)).json(); return info.runs.find((x: { id: string }) => x.id === actual.run.id)?.status; }, { timeout: 45000 }).toBe('done');
  expect(errors).toEqual([]);
});
