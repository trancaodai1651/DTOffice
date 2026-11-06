import { test, expect, type Page } from '@playwright/test';

async function tableForTwo(page: Page) {
  await page.setViewportSize({ width: 800, height: 500 });
  await page.addInitScript(() => { localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-tips', 'seen'); localStorage.setItem('office-scene', 'country'); });
  // Before automatic leisure hours: only the game explicitly selected by this test can claim the two colleagues.
  await page.goto('/?debug&layout=pro&at=08:00');
  await page.waitForFunction('!!window.__office?.pingpong');
  await expect(page.locator('#conn')).toHaveAttribute('data-state', 'on');
  await page.evaluate(`(() => {
    const o = window.__office; o.speed(6);
    for (const id of ['player-a', 'player-b']) o.upsert({ id, name: id, agent: 'claude', dir: '~/game-test', status: 'rest', desk: -1, subs: [], counts: {}, lastAt: Date.now() });
  })()`);
  await expect.poll(() => page.evaluate<boolean>('!!window.__office.foos || window.__office.pingpong()'), { timeout: 60_000 }).toBe(true);
  await expect.poll(() => page.evaluate<boolean>('!!window.__office.foos?.ready'), { timeout: 60_000 }).toBe(true);
}

test('a current round excludes other games and ignores idle actions, then yields to real work', async ({ page }) => {
  test.setTimeout(180_000);
  await tableForTwo(page);
  const held = await page.evaluate<boolean>(`(() => {
    const o = window.__office; o.speed(1);
    return o.foos.players.every(id => o.workers.get(id).chore.until === Infinity) && !o.tvGame('racing') && !o.bilGame();
  })()`);
  expect(held).toBe(true);
  await page.evaluate(`(() => { const o = window.__office; for (const id of o.foos.players) o.workers.get(id).want = { type: 'idle', station: 'coffee', rest: 5 }; })()`);
  await page.waitForTimeout(1500);
  expect(await page.evaluate<boolean>('!!window.__office.foos?.ready && !window.__office.foos.over')).toBe(true);
  await page.evaluate(`(() => { const o = window.__office, id = o.foos.players[0]; o.upsert({ ...o.sessions.get(id), status: 'work' }); })()`);
  await expect.poll(() => page.evaluate<boolean>('!window.__office.foos || window.__office.foos.over')).toBe(true);
});

test('colleagues finish foosball at five goals before releasing the table', async ({ page }) => {
  test.setTimeout(180_000);
  await tableForTwo(page);
  const score = await page.evaluate<number[]>(`new Promise((resolve, reject) => {
    const o = window.__office; o.speed(20);
    const timeout = setTimeout(() => { clearInterval(timer); reject(new Error('round did not complete')); }, 60_000);
    const timer = setInterval(() => { if (o.foos?.over) { const result = o.foos.score.slice(); clearInterval(timer); clearTimeout(timeout); resolve(result); } }, 10);
  })`);
  expect(Math.max(...score)).toBe(5);
  await expect.poll(() => page.evaluate('window.__office.foos'), { timeout: 30_000 }).toBe(null);
});
