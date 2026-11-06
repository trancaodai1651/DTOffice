import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test('idle resident agents can play billiards and leave the game when real work arrives', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-tips', 'seen'); localStorage.setItem('office-scene', 'country');
    Object.defineProperty(window, 'EventSource', { value: class { onopen: (() => void) | null = null; close() {} constructor() { setTimeout(() => this.onopen?.(), 10); } } });
  });
  await page.goto('/?debug&layout=hq&at=10:30');
  await page.waitForFunction('window.__office?.teamRoster?.size === 15 && !!window.__office.bilGame');
  await page.evaluate(`window.__office.emit({ k: 'snap', sessions: [], feed: [], stats: {} })`);
  expect(await page.evaluate('window.__office.bilGame()')).toBe(true);
  const players = await page.evaluate<string[]>('window.__office.bil.players');
  expect(players).toHaveLength(2); expect(players.every(id => id.startsWith('team-role:'))).toBe(true);
  await expect.poll(() => page.evaluate('window.__office.bil.stage'), { timeout: 45000 }).toBe('aim');
  await page.evaluate(role => {
    // The real SSE projection changes to work, then the leisure loop must release the table.
    (window as unknown as { __office: { emit: (m: object) => void } }).__office.emit({ k: 'snap', sessions: [{ id: 'new-job', role, status: 'work', agent: 'codex', name: 'job', dir: 'C:/test', subs: [], counts: {} }], feed: [], stats: {} });
  }, players[0].slice('team-role:'.length));
  await expect.poll(() => page.evaluate('window.__office.bil.stage')).toBe('over');
  expect(errors).toEqual([]);
});

test('role skills can be saved, loaded and removed through the actual UI and API', async ({ page, request }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'EventSource', { value: class { close() {} } }));
  await page.addInitScript(() => { localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-tips', 'seen'); });
  await page.goto('/?debug&view=2d');
  const skip = page.locator('.su-overlay button').filter({ hasText: /Skip|Later|Not now/i }); if (await skip.count()) await skip.first().click();
  await page.locator('#btn-team-presence').click();
  await page.getByText('Skills by role', { exact: true }).click();
  const text = page.getByRole('textbox', { name: 'Skill name and instructions (or SKILL.md content)' });
  await text.fill('MY-UI-SKILL: write acceptance criteria'); await page.getByRole('button', { name: 'Save skill', exact: true }).click();
  await expect(page.getByText('Saved. Applies to the next assignment.', { exact: true })).toBeVisible();
  let data = await (await request.get('/api/team')).json(); expect(Object.values(data.roleSkills)).toContain('MY-UI-SKILL: write acceptance criteria');
  await text.fill(''); await page.getByRole('button', { name: 'Save skill', exact: true }).click();
  await expect.poll(async () => { data = await (await request.get('/api/team')).json(); return Object.values(data.roleSkills).includes('MY-UI-SKILL: write acceptance criteria'); }).toBe(false);
});

test('floating bot shows the laptop for Claude work', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { __TAURI__: { core: { invoke: async () => ({ working: 1, waiting: 0, lang: 'en', status: 'Claude + Codex are on 1 jobs', agents: { claude: { working: 1, waiting: 0 } }, words: { name: 'Codex Bot', drag: 'Drag', limits: 'Open', hide: 'Hide' } }) } } });
  });
  await page.goto('/'); await page.setContent(fs.readFileSync('src-tauri/loading/bot.html', 'utf8'));
  await expect(page.locator('body')).toHaveAttribute('data-state', 'work'); await expect(page.locator('.laptop')).toBeVisible();
  await expect(page.locator('#status')).toContainText('Claude + Codex');
  await page.locator('#robot').screenshot({ path: 'test-results/staff-bot.png' });
});

test('Claude and Codex API values display USD and VND with an editable rate', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'EventSource', { value: class { close() {} } }));
  await page.addInitScript(() => { localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-tips', 'seen'); });
  await page.goto('/?demo&burn&layout=cozy');
  await expect(page.locator('#burn-body')).toContainText('₫'); await expect(page.locator('#burn-body')).toContainText('$');
  const rate = page.getByRole('spinbutton', { name: 'Estimated VND per USD (editable)' }); await rate.fill('26000'); await rate.dispatchEvent('change');
  expect(await page.evaluate("localStorage.getItem('office-usd-vnd')")).toBe('26000');
  await page.route('**/api/burn?**', route => route.fulfill({ json: { ok: true, agent: 'codex', range: 'today', total: { input: 1000000, cached: 0, output: 0, tokens: 1000000, req: 1 }, by: { model: [{ name: 'gpt-6.1-sol', input: 1000000, cached: 0, output: 0, tokens: 1000000, share: 1 }] }, windows: [], sessions: [], projects: [], perDay: [], roles: [] } }));
  await page.goto('/?burn&agent=codex&layout=cozy');
  await expect(page.locator('#burn-body')).toContainText('$2.00 · ≈ 52.000 ₫');
  await expect(page.locator('#burn-body')).toContainText('not a subscription invoice');
});
