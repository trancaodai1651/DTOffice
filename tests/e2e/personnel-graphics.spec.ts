import { test, expect } from '@playwright/test';

for (const device of [{ name: 'phone', width: 390, height: 844, dpr: 3, cap: 1 }, { name: 'tablet', width: 1024, height: 1366, dpr: 2, cap: 1.5 }]) {
  test.describe(device.name, () => {
    test.use({ viewport: { width: device.width, height: device.height }, contextOptions: { screen: { width: device.width, height: device.height } }, deviceScaleFactor: device.dpr, isMobile: true, hasTouch: true });
    test('Auto limits 3D pixels and keeps the interface within the viewport after rotation', async ({ page }) => {
      await page.addInitScript(() => { localStorage.setItem('office-tips', 'seen'); localStorage.setItem('office-quality-auto', JSON.stringify({ level: 'high', at: Date.now() })); });
      const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('/?demo&debug&perf&layout=cozy');
      await page.waitForFunction('!!window.__office?.renderer');
      const resolution = () => page.evaluate<{ ratio: number; width: number; height: number; overflow: number }>(`({ ratio: window.__office.renderer.getPixelRatio(), width: document.querySelector('#stage').clientWidth, height: document.querySelector('#stage').clientHeight, overflow: document.documentElement.scrollWidth - innerWidth })`);
      let r = await resolution();
      expect(r.ratio).toBeLessThanOrEqual(device.cap);
      expect(r.width * r.height * r.ratio ** 2).toBeLessThanOrEqual(1_500_001);
      expect(r.overflow).toBeLessThanOrEqual(1);
      await page.setViewportSize({ width: device.height, height: device.width });
      await expect.poll(async () => (await resolution()).overflow).toBeLessThanOrEqual(1);
      r = await resolution();
      expect(r.width * r.height * r.ratio ** 2).toBeLessThanOrEqual(1_500_001);
      expect(errors).toEqual([]);
    });
  });
}

test('Claude and Codex have stable personnel names while chat titles remain context', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('office-tips', 'seen'); localStorage.setItem('office-quality', 'low'); });
  await page.goto('/?demo&debug&layout=cozy');
  await page.waitForFunction('!!window.__office?.upsert');
  await page.evaluate(`(() => {
    window.__office.pauseDemo();
    for (const agent of ['claude', 'codex']) window.__office.upsert({ id: 'person-' + agent, agent, personnelName: agent === 'claude' ? 'Trần Minh An' : 'Nguyễn Gia Huy', name: 'project-ab', title: 'Original conversation', dir: '~/project', status: 'rest', desk: -1, counts: {}, subs: [], lastAt: Date.now() });
  })()`);
  const claude = page.locator('#rail-list [data-sess="person-claude"]'), codex = page.locator('#rail-list [data-sess="person-codex"]');
  await expect(claude).toContainText('Trần Minh An'); await expect(codex).toContainText('Nguyễn Gia Huy');
  await page.evaluate(`(() => { const s = window.__office.sessions.get('person-codex'); window.__office.upsert({ ...s, title: 'Renamed conversation' }); })()`);
  await expect(codex).toContainText('Nguyễn Gia Huy');
  await expect(codex).toHaveAttribute('title', /Renamed conversation/);
  await codex.click();
  await expect(page.locator('#ds-name')).toHaveText('Nguyễn Gia Huy');
  await expect(page.locator('#ds-dir')).toContainText('Renamed conversation');
  await expect(page.locator('#desktop-bot-controls')).toBeHidden();
});

test('native companion snapshot has translated labels and rejects cross-origin requests', async ({ request }) => {
  const response = await request.get('/api/desktop-bot'); expect(response.ok()).toBe(true);
  const state = await response.json(); expect(state.words.name).toBe('Codex Bot'); expect(state.words.drag).toContain('Drag');
  expect(Object.keys(state).sort()).toEqual(['enabled', 'lang', 'status', 'total', 'waiting', 'words', 'working']);
  expect((await request.get('/api/desktop-bot', { headers: { Origin: 'https://example.com' } })).status()).toBe(403);
});
