import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'EventSource', { value: class { close() {} } });
    localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-tips', 'seen');
  });
});

async function mockDesktop(page: import('@playwright/test').Page, fail = false) {
  await page.addInitScript(({ fail }) => {
    localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-tips', 'seen');
    if (fail) localStorage.setItem('office-auto-update-check', 'false');
    const state = { supported: true, current: '0.4.13', version: null as string | null, stage: 'idle', notes: '<img src=x onerror="window.injected=true"> Release notes', received: 0, total: 100 };
    const w = window as unknown as { __TAURI__: unknown, updateCalls: string[], failCheck: boolean };
    w.updateCalls = []; w.failCheck = fail;
    let installations = 0;
    w.__TAURI__ = { core: { invoke: async (command: string, args: { action: string, version: string }) => {
      if (command !== 'desktop_update') throw Error('not supported');
      w.updateCalls.push(args.action);
      if (args.action === 'check') { if (w.failCheck) throw Error('offline'); state.version = '0.5.0'; if (state.stage === 'idle') state.stage = 'available'; }
      if (args.action === 'download') {
        if (args.version !== state.version) throw Error('wrong consent');
        if (fail) throw Error('invalid signature');
        state.stage = 'downloading'; await new Promise(r => setTimeout(r, 200)); state.stage = 'ready'; state.received = 100;
      }
      if (args.action === 'install') state.stage = ++installations === 1 ? 'waiting' : 'installing';
      if (args.action === 'pause') state.stage = 'ready';
      return { ...state };
    } } };
  }, { fail });
}
async function openUpdateSettings(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => (window as unknown as { updateCalls?: string[] }).updateCalls?.includes('status'));
  await page.locator('#btn-look').click(); await page.locator('[data-st-tab="more"]').click();
  await expect(page.locator('#desktop-updates')).toBeVisible();
}
test('desktop announces updates, requires consent and can postpone an installation while staff work', async ({ page }) => {
  await mockDesktop(page); await page.goto('/?view=2d&layout=hq');
  const dialog = page.locator('dialog.office-update');
  await expect(dialog).toBeVisible({ timeout: 20000 });
  await dialog.screenshot({ path: 'test-results/updater-available.png' });
  await expect(dialog.locator('pre')).toContainText('<img src=x');
  expect(await page.evaluate(() => (window as unknown as { injected?: boolean }).injected)).toBeUndefined();
  await dialog.getByRole('button', { name: 'Later', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { updateCalls: string[] }).updateCalls.filter(a => a === 'download' || a === 'install'))).toEqual([]);
  await openUpdateSettings(page); await page.locator('[data-update-check]').click();
  await dialog.getByRole('button', { name: 'Update now', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Waiting for staff');
  await dialog.getByRole('button', { name: 'Later, keep working' }).click();
  await expect(dialog).not.toBeVisible();
  await page.waitForTimeout(5500);
  expect(await page.evaluate(() => (window as unknown as { updateCalls: string[] }).updateCalls.filter(a => a === 'install').length)).toBe(1);
  await openUpdateSettings(page);
  await page.locator('[data-update-check]').click();
  await dialog.getByRole('button', { name: 'Update and reopen' }).click();
  await expect(dialog.getByRole('status')).toContainText('Installing');
  expect(await page.evaluate(() => (window as unknown as { updateCalls: string[] }).updateCalls.filter(a => a === 'download').length)).toBe(1);
});
test('offline checks and rejected downloads allow retry and never trigger installation', async ({ page }) => {
  await mockDesktop(page, true); await page.goto('/?view=2d&layout=hq'); await openUpdateSettings(page);
  await page.locator('[data-update-check]').click();
  await expect(page.locator('[data-update-status]')).toContainText('Could not update');
  await page.evaluate(() => { (window as unknown as { failCheck: boolean }).failCheck = false; });
  await page.locator('[data-update-check]').click();
  const dialog = page.locator('dialog.office-update'); await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Update now', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Could not update');
  expect(await page.evaluate(() => (window as unknown as { updateCalls: string[] }).updateCalls.includes('install'))).toBe(false);
  await expect(dialog.getByRole('button', { name: 'Update now', exact: true })).toBeEnabled();
});
test('the web office does not expose native update controls', async ({ page }) => {
  await page.goto('/?view=2d&layout=hq'); await expect(page.locator('body')).toHaveClass(/is-lite/); await page.locator('#btn-look').click(); await page.locator('[data-st-tab="more"]').click();
  await expect(page.locator('#desktop-updates')).toBeHidden();
  await expect(page.locator('dialog.office-update')).toHaveCount(0);
});
