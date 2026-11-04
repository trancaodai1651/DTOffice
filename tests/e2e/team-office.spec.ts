import { test, expect, type Page } from '@playwright/test';

async function openOffice(page: Page, at = '10:00') {
  await page.addInitScript(() => { localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-tips', 'seen'); localStorage.setItem('office-scene', 'country'); });
  await page.goto(`/?debug&at=${at}`);
  await page.waitForFunction('window.__office?.teamPresence?.length === 15');
  await expect(page.locator('#conn')).toHaveAttribute('data-state', 'on');
  await page.waitForFunction('window.__office.teamPresence[0].freshness === "fresh"');
  const later = page.getByRole('button', { name: 'Later', exact: true });
  if (await later.isVisible()) await later.click();
}
const session = (id: string, role = '') => ({ id, role, name: role ? 'QA Agent' : 'Departure test', dir: '~/departure-test', status: 'rest', desk: -1,
  subs: [], counts: {}, last: null, lastAt: Date.now(), doneAt: Date.now() });

test('15 DEV colleagues are present without CLI sessions and reuse their own character for real work', async ({ page }) => {
  await openOffice(page);
  await expect(page.locator('.tag[data-dev-role]')).toHaveCount(15);
  expect(await page.evaluate('window.__office.sessions.size')).toBe(0);
  await page.evaluate(s => (window as unknown as { __office: { upsert: (s: object) => void } }).__office.upsert(s), { ...session('qa-binding', 'qa'), status: 'work' });
  expect(await page.evaluate('window.__office.teamRoster.get("qa").primarySessionId')).toBe('qa-binding');
  expect(await page.evaluate('window.__office.workers.has("qa-binding")')).toBe(false);
  await expect(page.locator('.tag[data-dev-role="qa"]')).toHaveAttribute('data-dev-state', 'session');
  await expect(page.locator('.tag[data-dev-role]')).toHaveCount(15);
  await page.evaluate('window.__office.emit({k:"gone", id:"qa-binding"})');
  await expect(page.locator('.tag[data-dev-role="qa"]')).toHaveAttribute('data-dev-state', 'idle');
  expect(await page.evaluate('window.__office.teamRoster.get("qa").id')).toBe('team-role:qa');
  await expect(page.locator('.tag[data-dev-role]')).toHaveCount(15);
});

test('a saved company floor stays; the AI room is reached through an explicit layout choice', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('office-layout', 'pro'));
  await openOffice(page);
  await expect(page.locator('.tag[data-dev-role]')).toHaveCount(0);
  await page.locator('#btn-team-presence').click();
  await page.getByRole('button', { name: 'Switch to HQ', exact: true }).click();
  await page.locator('#pop-look [data-layout="hq"]').click();
  await page.waitForURL(/layout=hq/);
  await page.waitForFunction('window.__office?.teamRoster?.size === 15');
});

test('a worker meets the director and waits; denial keeps them inside, allowance lets them leave', async ({ page }) => {
  test.setTimeout(180_000);
  await openOffice(page, '22:00');
  await page.evaluate(s => (window as unknown as { __office: { upsert: (s: object) => void } }).__office.upsert(s), session('leave-test'));
  await page.evaluate('window.__office.speed(12); window.__office.workers.get("leave-test").goHomeNow()');
  const panel = page.locator('#exit-permission');
  await expect(panel).toBeVisible({ timeout: 45_000 });
  await expect(panel).toHaveAttribute('data-stage', 'ready', { timeout: 60_000 });
  expect(await page.evaluate('window.__office.workers.get("leave-test").pos.y')).toBeLessThan(-4);
  await page.waitForTimeout(1500);
  expect(await page.evaluate('window.__office.workers.get("leave-test").away || window.__office.workers.get("leave-test").street')).toBeFalsy();
  await panel.locator('[data-exit="deny"]').click();
  await expect(panel).toBeHidden();
  expect(await page.evaluate('window.__office.workers.get("leave-test").homeBound')).toBe(false);
  expect(await page.evaluate('window.__office.workers.get("leave-test").away')).toBeFalsy();
  await page.evaluate('window.__office.workers.get("leave-test").exitDeniedUntil=0; window.__office.workers.get("leave-test").goHomeNow()');
  await expect(panel).toHaveAttribute('data-stage', 'ready', { timeout: 60_000 });
  await panel.locator('[data-exit="allow"]').click();
  await expect.poll(() => page.evaluate('!!window.__office.workers.get("leave-test").away'), { timeout: 60_000 }).toBe(true);
});

test('new work cancels a pending visit and cannot reuse its permission', async ({ page }) => {
  test.setTimeout(90_000);
  await openOffice(page, '22:00');
  const s = session('cancel-exit');
  await page.evaluate(s => (window as unknown as { __office: { upsert: (s: object) => void } }).__office.upsert(s), s);
  await page.evaluate('window.__office.speed(12); window.__office.workers.get("cancel-exit").goHomeNow()');
  await expect(page.locator('#exit-permission')).toBeVisible({ timeout: 45_000 });
  await page.evaluate(s => (window as unknown as { __office: { upsert: (s: object) => void } }).__office.upsert(s), { ...s, status: 'work' });
  await expect(page.locator('#exit-permission')).toBeHidden();
  expect(await page.evaluate('window.__office.workers.get("cancel-exit").exitApproved')).toBe(false);
  expect(await page.evaluate('window.__office.workers.get("cancel-exit").homeBound')).toBe(false);
});
