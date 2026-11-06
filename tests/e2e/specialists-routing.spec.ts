import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { test, expect } from '@playwright/test';

// A standalone Node fake CLI keeps this flow portable on Windows and never invokes a real AI account.
const PORT = (Number(process.env.E2E_PORT) || 4399) + 43, BASE = `http://127.0.0.1:${PORT}`;
let server: ChildProcess | null = null, out = '';
type Job = { id: string; sid: string; dir: string; kind: string; status: string };
async function finished() {
  let job: Job | undefined;
  await expect.poll(async () => { const r = await (await fetch(`${BASE}/api/specialists`)).json(); job = r.jobs[0]; return job?.status; }).toBe('done');
  return job!;
}
async function snapshot() {
  const controller = new AbortController(), response = await fetch(`${BASE}/stream`, { signal: controller.signal }), reader = response.body!.getReader();
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) throw new Error('No session snapshot');
      text += new TextDecoder().decode(chunk.value);
      for (const line of text.split('\n').slice(0, -1)) {
        if (!line.startsWith('data:')) continue;
        const msg = JSON.parse(line.slice(5)); if (msg.k === 'snap') return msg;
      }
    }
  } finally { controller.abort(); }
}

test.beforeAll(async () => {
  const root = path.resolve(process.env.E2E_OUT || 'test-results'); fs.mkdirSync(root, { recursive: true });
  out = fs.mkdtempSync(path.join(root, 'specialists-routing-'));
  const home = path.join(out, 'home'), data = path.join(out, 'data'), fake = path.join(out, 'fake-codex.mjs');
  fs.mkdirSync(home, { recursive: true }); fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(data, 'prefs.json'), JSON.stringify({ agents: ['codex'], lang: 'en', tunnel: false, memory: false }));
  fs.writeFileSync(fake, `import fs from 'node:fs';
const sid = 'test-news-' + process.pid;
fs.writeFileSync('assignment.json', JSON.stringify({ sid, news: process.argv.at(-1).includes('You are the NEWS READER'), argv: process.argv.slice(2, -1) }));
console.log(JSON.stringify({ type: 'thread.started', thread_id: sid }));
setTimeout(() => { console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Finished by the news reader.' } })); }, 150);
`);
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), CODEX_HOME: path.join(home, '.codex'), OFFICE_CODEX_BIN: fake, OFFICE_CLAUDE_BIN: process.execPath,
    NODE_ENV: 'production', OFFICE_PORT: String(PORT), OFFICE_DATA_DIR: data, OFFICE_LANG: 'en', OFFICE_TRANSLATE: '0', OFFICE_USAGE: '0', OFFICE_CI: '0', OFFICE_AI_ACCOUNTS: '0', OFFICE_CODEX_SESSIONS: '0', OFFICE_MEMORY: '0', OFFICE_OPEN_URL: '0' };
  const log = fs.openSync(path.join(out, 'server.log'), 'a');
  server = spawn(process.execPath, ['server/index.mjs'], { env, stdio: ['ignore', log, log], windowsHide: true }); fs.closeSync(log);
  await expect.poll(async () => { try { return (await fetch(`${BASE}/health`)).ok; } catch { return false; } }, { timeout: 60_000 }).toBe(true);
});
test.afterAll(() => server?.kill());

test('ordinary task, chat and team news assignments use the news reader, including delayed session events', async ({ request }) => {
  const route = await (await request.post(`${BASE}/api/team/route`, { data: { text: 'Đọc báo về AI hôm nay' } })).json();
  expect(route.specialist.kind).toBe('news'); expect(route.teams).toEqual([]);
  const dev = await (await request.post(`${BASE}/api/team/route`, { data: { text: 'Fix the news reader API' } })).json();
  expect(dev.specialist).toBeNull(); expect(dev.teams[0].id).toBe('dev');
  for (const text of ['Đừng đọc báo', 'Nhân sự đọc báo là ai?', 'Tôi vừa đọc báo về AI', 'Sửa luồng đọc báo']) {
    const info = await (await request.post(`${BASE}/api/team/route`, { data: { text } })).json();
    expect(info.specialist, text).toBeNull();
  }

  for (const [url, data] of [
    ['/api/tasks', { sid: 'ordinary-person', text: 'Đọc báo về AI hôm nay', agent: 'codex' }],
    ['/api/chat', { op: 'send', text: 'Tổng hợp tin tức về xe điện', agent: 'codex' }],
    ['/api/team', { goal: 'Read the latest news about Vietnam', agent: 'codex' }],
  ] as const) {
    const response = await request.post(`${BASE}${url}`, { data });
    expect(response.ok()).toBe(true);
    const body = await response.json(); expect(body.specialist).toBe('news'); expect(body.job.kind).toBe('news');
    const job = await finished(); expect(job.sid).toMatch(/^test-news-/);
    const assignment = JSON.parse(fs.readFileSync(path.join(job.dir, 'assignment.json'), 'utf8'));
    expect(assignment.news).toBe(true); expect(assignment.argv).toContain('web_search="live"');
    // The process has finished before its rollout/hook is discovered. Its identity must still be the specialist.
    await request.post(`${BASE}/event`, { data: { hook_event_name: 'SessionStart', session_id: job.sid, agent: 'codex', cwd: job.dir } });
    const state = await snapshot(), person = state.sessions.find((s: { role: string; dir: string }) => s.role === 'news' && s.dir.includes(path.basename(job.dir)));
    expect(person).toBeTruthy(); expect(person.name).toBe('News reader');
  }
  const chat = await (await request.get(`${BASE}/api/chat`)).json();
  expect(chat.msgs.filter((m: { from: string; text: string }) => m.from === '__news' && m.text === 'Finished by the news reader.')).toHaveLength(3);
  expect((await (await request.get(`${BASE}/api/team`)).json()).runs).toHaveLength(0);
});

test('2D staff hands news work to the existing news reader without the guide', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('office-tips', 'seen'); localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-guide-hello', '1'); });
  await page.goto(`${BASE}/?debug&layout=hq&view=2d`);
  await page.waitForFunction('window.__office');
  const staff = page.locator('#lite-personnel');
  await staff.locator('[data-role="news"]').click();
  await staff.locator('#lite-role-news [data-focus="goal:news"]').click();
  await expect(page.locator('.sp-panel')).toBeVisible(); await expect(page.locator('.sp-panel')).toHaveAttribute('aria-label', 'News reader');
  await expect(page.locator('#btn-guide')).toHaveCount(0);
  await page.locator('.sp-panel textarea').fill('AI news today');
  await expect(page.locator('.sp-panel button', { hasText: 'Read the news' })).toBeEnabled();
  expect(await page.locator('#stage canvas').count()).toBe(0);
  expect(errors).toEqual([]);
});
