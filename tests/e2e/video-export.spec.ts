import { test, expect } from '@playwright/test';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findMediaTool } from '../../server/media-tools.mjs';

test('the video employee renders and verifies a real MP4; script-only work is a failure', async ({ playwright }) => {
  test.setTimeout(150000);
  test.skip(!findMediaTool('ffmpeg') || !findMediaTool('ffprobe'), 'Prepare media tools first; release verifier always renders with bundled tools.');
  const root = path.resolve('test-results/video-job-integration'), home = path.join(root, 'home'), data = path.join(root, 'data');
  fs.mkdirSync(home, { recursive: true }); fs.mkdirSync(data, { recursive: true });
  const legacy = path.join(root, 'legacy'); fs.mkdirSync(legacy, { recursive: true });
  fs.writeFileSync(path.join(legacy, 'video-plan.json'), JSON.stringify({ size: [320, 568], scenes: [{ type: 'title', duration: 1, text: 'Recovered export' }] }));
  execFileSync(process.execPath, ['server/video-tools.mjs', 'render', path.join(legacy, 'video-plan.json')], { cwd: path.resolve('.'), windowsHide: true, stdio: 'ignore' });
  fs.writeFileSync(path.join(data, 'specialists.json'), JSON.stringify({ jobs: [{ id: 'legacy-video', kind: 'video', dir: legacy, status: 'done', video: '', format: 'short' }] }));
  const fake = path.join(root, 'video-codex.mjs');
  fs.writeFileSync(fake, `import fs from 'node:fs'; const words=process.argv.at(-1)==='-'?fs.readFileSync(0,'utf8'):process.argv.at(-1); if(!words.includes('NO_EXPORT')) fs.writeFileSync('video-plan.json', JSON.stringify({format:'short',size:[320,568],scenes:[{type:'title',duration:2,text:'Tiếng Việt · verified export'}]})); console.log(JSON.stringify({type:'thread.started',thread_id:'video-'+Date.now()})); console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Prepared the local video plan'}}));`);
  const port = Number(process.env.E2E_PORT || 4399) + 44;
  const child: ChildProcess = spawn(process.execPath, ['server/index.mjs'], { cwd: path.resolve('.'), windowsHide: true, stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production', OFFICE_PORT: String(port), OFFICE_DATA_DIR: data, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), CODEX_HOME: path.join(home, '.codex'), OFFICE_CODEX_BIN: fake, OFFICE_CLAUDE_BIN: process.execPath, OFFICE_AI_ACCOUNTS: '0', OFFICE_CODEX_SESSIONS: '0', OFFICE_MENUBAR: '0', OFFICE_USAGE: '0', OFFICE_TRANSLATE: '0', OFFICE_LANG: 'en' } });
  const request = await playwright.request.newContext({ baseURL: `http://127.0.0.1:${port}` });
  try {
    await expect.poll(async () => { try { return (await request.get('/health')).ok(); } catch { return false; } }).toBe(true);
    const tools = await (await request.get('/api/specialists')).json();
    expect(tools.tools.ffmpeg).toBeTruthy(); expect(tools.tools.ffprobe).toBeTruthy();
    await expect.poll(async () => (await (await request.get('/api/specialists')).json()).jobs.find((j: { id: string }) => j.id === 'legacy-video')?.status).toBe('done');
    const response = await request.post('/api/specialists/video', { data: { brief: 'Render a short original title card', agent: 'codex', out: path.join(root, 'exports') } });
    const started = await response.json(); expect(started.ok).toBe(true);
    const getJob = async (id: string) => (await (await request.get('/api/specialists')).json()).jobs.find((j: { id: string }) => j.id === id);
    await expect.poll(async () => (await getJob(started.job.id)).status, { timeout: 90000 }).toBe('done');
    const ready = await getJob(started.job.id);
    expect(fs.statSync(ready.video).size).toBeGreaterThan(1000);
    const proof = JSON.parse(fs.readFileSync(path.join(ready.dir, 'export-verified.json'), 'utf8'));
    expect(proof.videoCodec).toBe('h264'); expect(proof.audioCodec).toBe('aac'); expect(proof.fps).toBe(30);
    const failed = await (await request.post('/api/specialists/video', { data: { brief: 'NO_EXPORT', agent: 'codex', out: path.join(root, 'exports') } })).json();
    expect(failed.ok).toBe(true);
    await expect.poll(async () => (await getJob(failed.job.id)).status).toBe('fail');
    expect((await getJob(failed.job.id)).video).toBe('');
  } finally { await request.dispose(); child.kill(); }
});

test('a staff card targets that employee, and the assignment selector includes Marketing roles', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-tips', 'seen'); Object.defineProperty(window, 'EventSource', { value: class { close() {} } }); });
  await page.route('**/api/tasks', r => r.fulfill({ json: { ok: true, projects: [{ dir: 'C:/test', name: 'Test' }], sessions: [], claude: true, codex: true, models: {} } }));
  let body: { role?: string, goal?: string } = {};
  await page.route('**/api/team', async r => { if (r.request().method() === 'POST') { body = r.request().postDataJSON(); await r.fulfill({ json: { ok: true } }); } else await r.continue(); });
  await page.goto('/?debug&view=2d&layout=hq'); await page.locator('#btn-team-presence').click();
  await page.locator('[data-role="frontend"]').click(); await page.locator('[data-focus="goal:frontend"]').click();
  const assignee = page.locator('[data-assignment-role]'); await expect(assignee).toHaveValue('frontend');
  await assignee.selectOption('copywriter');
  await page.locator('.tm-form textarea').fill('Write one caption personally'); await page.locator('.tm-form .zc-task-go').click();
  await expect.poll(() => body.role).toBe('copywriter'); expect(body.goal).toBe('Write one caption personally');
});
