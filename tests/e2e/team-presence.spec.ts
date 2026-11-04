import { test, expect, type Page } from '@playwright/test';

const s = (id: string, role = 'frontend', status = 'work') => ({ id, role, name: id, dir: `C:/projects/${id}`, status, subs: [], counts: {}, lastAt: 1 });
const emit = (page: Page, msg: object) => page.evaluate(m => (window as unknown as { __office: { emit: (m: object) => void } }).__office.emit(m), msg);
const snap = (sessions: object[] = []) => ({ k: 'snap', sessions, feed: [], stats: {} });
async function open(page: Page, query = '') {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-tips', 'seen'); localStorage.setItem('office-scene', 'country');
    // No stream/model side effects. Tests supply actual event-shaped snapshots through the existing debug hook.
    Object.defineProperty(window, 'EventSource', { value: class { onopen: (() => void) | null = null; close() {} constructor() { setTimeout(() => this.onopen?.(), 10); } } });
  });
  await page.route('**/api/team', route => route.fulfill({ json: { ok: true, runs: [], stages: [], roles: [], groups: [] } }));
  await page.route('**/api/tasks', route => route.fulfill({ json: { ok: true, projects: [{ dir: 'C:/test-project', name: 'test-project' }], sessions: [], claude: true, models: {} } }));
  await page.goto(`/?debug&at=23:00${query}`);
  await page.waitForFunction('window.__office?.teamPresence?.length === 15');
  return errors;
}

test('live HQ has 15 stable people at night with zero execution; snapshot, mult-session and late roles preserve identity', async ({ page }) => {
  const executions: string[] = [];
  page.on('request', r => { if (r.method() === 'POST' && /\/api\/(team|tasks)(?:\?|$)/.test(r.url())) executions.push(r.url()); });
  const errors = await open(page);
  await page.waitForFunction('window.__office.teamRoster.size === 15');
  expect(await page.evaluate('window.__office.sessions.size')).toBe(0);
  await page.locator('#btn-team-presence').click();
  await expect(page.locator('.tm-person-button')).toHaveCount(15);
  await expect(page.locator('.tm-presence-summary')).toContainText('— team sessions');
  await expect(page.locator('[data-role="frontend"]')).toContainText('Syncing');
  await emit(page, snap());
  await expect(page.locator('[data-role="frontend"]')).toContainText('Awaiting work');
  const a = { ...s('project-a'), subs: [{ id: 'sub-a', type: 'Explore' }] }, b = { ...s('project-b', 'frontend', 'rest'), subs: [{ id: 'sub-b', type: 'Explore' }] };
  await emit(page, snap([a,b]));
  await emit(page, { k: 'perm', p: { id: 'permission-b', sess: b.id, kind: 'perm', name: b.name, tool: 'Bash', label: 'echo test', detail: 'echo test', at: Date.now() } });
  await expect(page.locator('[data-role="frontend"]')).toContainText('Needs approval · 2 sessions');
  expect(await page.evaluate('window.__office.teamRoster.get("frontend").primarySessionId')).toBe(b.id);
  expect(await page.evaluate('window.__office.workers.size')).toBe(0);
  expect(await page.evaluate('window.__office.subs.get("sub-a").parentSessionId')).toBe(a.id);
  await page.locator('[data-role="frontend"]').click();
  await expect(page.locator('#tm-role-frontend .tm-session')).toHaveCount(2);
  await page.locator('[data-focus="session:project-a"]').click();
  await expect(page.locator('#dr-session')).toBeVisible();
  await expect(page.locator('#ds-name')).toHaveText(a.id);
  await expect(page.locator('.tm-sheet')).toHaveCount(0);
  await expect(page.locator('#ds-name')).toBeFocused();
  await page.locator('#dr-session [data-close]').click();
  await emit(page, { k: 'gone', id: a.id });
  expect(await page.evaluate('window.__office.subs.has("sub-b")')).toBe(true);
  expect(await page.evaluate('window.__office.teamRoster.get("frontend").id')).toBe('team-role:frontend');
  await emit(page, { k: 'gone', id: b.id });
  await emit(page, { k: 'permDone', id: 'permission-b' });
  await emit(page, { k: 'sess', s: s('late-role', '') });
  expect(await page.evaluate('window.__office.workers.has("late-role")')).toBe(true);
  await emit(page, { k: 'sess', s: s('late-role', 'qa') });
  expect(await page.evaluate('window.__office.workers.has("late-role")')).toBe(false);
  await emit(page, { k: 'sess', s: s('late-role', 'backend') });
  expect(await page.evaluate('window.__office.teamPresence.find(p=>p.roleId==="qa").activity')).toBe('idle');
  await emit(page, { k: 'sess', s: s('late-role', 'unknown') });
  expect(await page.evaluate('window.__office.workers.has("late-role")')).toBe(true);
  await emit(page, snap()); await emit(page, snap());
  expect(await page.evaluate('window.__office.teamRoster.size')).toBe(15);
  expect(await page.evaluate('window.__office.sessions.size')).toBe(0);
  expect(executions).toEqual([]);
  expect(errors).toEqual([]);
});

test('2D roster survives API errors, stale data, keyboard/mobile and switches to HQ without forcing WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addInitScript(() => localStorage.setItem('office-layout', 'pro'));
  const errors = await open(page, '&view=2d');
  await page.route('**/api/tasks', route => route.fulfill({ json: { ok: false } }));
  expect(await page.evaluate('window.__office.teamRoster.size')).toBe(0);
  await expect(page.locator('#stage canvas')).toHaveCount(0);
  await page.locator('#btn-team-presence').click();
  await expect(page.locator('.tm-person-button')).toHaveCount(15);
  await expect(page.getByText('Could not load task information. Try again.')).toBeVisible();
  expect(await page.evaluate('document.activeElement?.tagName')).not.toBe('TEXTAREA');
  await emit(page, snap([s('cached')]));
  await page.evaluate('window.__office.teamConnection(false)');
  await expect(page.locator('[data-role="frontend"]')).toContainText('Not up to date');
  await page.evaluate('window.__office.teamConnection(true)');
  await expect(page.locator('[data-role="frontend"]')).toContainText('Not up to date');
  await emit(page, snap());
  await expect(page.locator('[data-role="frontend"]')).toContainText('Awaiting work');
  const overflow = await page.locator('.tm-sheet').evaluate(e => e.scrollWidth > e.clientWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'test-results-presence/roster-mobile.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-team-presence')).toBeFocused();
  await page.locator('#btn-team-presence').click();
  await page.getByRole('button', { name: 'Switch to HQ', exact: true }).click();
  await expect(page.locator('#pop-look')).toBeVisible();
  await page.locator('#pop-look [data-layout="hq"]').click();
  await page.waitForURL(/layout=hq/);
  await page.waitForFunction('window.__office?.teamPresence?.length === 15');
  await expect(page.locator('#stage canvas')).toHaveCount(0);
  await page.locator('.tb-view [data-view="3d"]').click();
  await page.waitForFunction('window.__office.teamRoster.size === 15');
  expect(errors).toEqual([]);
});

test('replay clears residents, seeks history and restores fresh live identities; demo has none', async ({ page }) => {
  const errors = await open(page);
  await emit(page, snap());
  await page.route('**/api/replay?**', route => route.fulfill({ json: { items: [{ t: Date.now() - 60_000, m: snap([s('historical', 'qa')]) }] } }));
  await page.locator('#btn-replay').click();
  await expect(page.locator('#replay-chip')).toBeVisible();
  expect(await page.evaluate('window.__office.teamRoster.size')).toBe(0);
  await expect(page.locator('#btn-team-presence')).toBeHidden();
  await page.locator('#rp-close').click();
  await page.waitForFunction('window.__office.teamRoster.size === 15');
  expect(await page.evaluate('window.__office.sessions.size')).toBe(0);
  expect(await page.evaluate('window.__office.teamPresence[0].freshness')).toBe('loading');
  await emit(page, snap());
  await page.goto('/?demo&debug&layout=hq');
  await page.waitForFunction('window.__office?.sessions.size > 0');
  expect(await page.evaluate('window.__office.teamRoster.size')).toBe(0);
  await expect(page.locator('#btn-team-presence')).toBeHidden();
  expect(errors).toEqual([]);
});

test('resident rigs survive view/look changes without growing GPU resources; role details keep keyboard focus', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await open(page);
  await emit(page, snap());
  await page.waitForFunction('window.__office.teamRoster.size === 15 && window.__office.renderer');
  const settle = () => page.evaluate(() => new Promise(resolve => { let frames = 0; const tick = () => ++frames > 6 ? resolve(null) : requestAnimationFrame(tick); requestAnimationFrame(tick); }));
  await settle();
  const before = Number(await page.evaluate('window.__office.renderer.info.memory.geometries'));
  for (let i = 0; i < 3; i++) for (const look of ['toy','pixar']) {
    await page.locator(`[data-look="${look}"]`).evaluate(e => (e as HTMLButtonElement).click()); await settle();
  }
  expect(await page.evaluate('window.__office.renderer.info.memory.geometries')).toBeLessThan(before * 1.15 + 50);
  await page.locator('#btn-team-presence').click();
  await page.locator('[data-role="architect"]').click();
  await expect(page.locator('#tm-role-architect')).toBeVisible();
  for (const width of [390,720,1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.locator('.tm-sheet').evaluate(e => e.scrollWidth > e.clientWidth)).toBe(false);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-team-presence')).toBeFocused();
  await page.locator('.tb-view [data-view="2d"]').click();
  await expect(page.locator('#btn-team-presence')).toBeVisible();
  await page.locator('.tb-view [data-view="3d"]').click();
  expect(await page.evaluate('window.__office.teamRoster.size')).toBe(15);
  await page.screenshot({ path: 'test-results-presence/office-hq.png', animations: 'disabled' });
  expect(errors).toEqual([]);
});
