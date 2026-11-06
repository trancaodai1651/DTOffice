import { test, expect } from '@playwright/test';
import { cityLampSites, onCityRoad } from '../../src/shared/street-fixtures.js';

// Exercise the hardware-quality policy even when CI's actual rasterizer is SwiftShader.
// This changes only the reported adapter name; the browser still renders the real scene and post-processing passes.
test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('office-tips', 'seen'); localStorage.setItem('office-quality', 'auto');
    localStorage.setItem('office-quality-auto', JSON.stringify({ level: 'low', at: Date.now() }));
    localStorage.setItem('office-scene', 'country');
    for (const Type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const get = Type.prototype.getParameter;
      Type.prototype.getParameter = function (name: number) { return name === 0x9246 ? 'DT Office hardware policy test' : get.call(this, name); };
    }
  });
});

test('desktop Auto recovers from remembered Low, and explicit High retains detail and anti-aliasing', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?demo&debug&layout=cozy&at=10:00');
  await page.waitForFunction('!!window.__office?.composer');
  const graphics = () => page.evaluate<{ ratio: number; shadows: boolean; samples: number; antialias: boolean }>(`(() => { const o = window.__office; return { ratio: o.renderer.getPixelRatio(), shadows: o.renderer.shadowMap.enabled, samples: o.composer.renderTarget1.samples, antialias: o.renderer.getContext().getContextAttributes().antialias }; })()`);
  expect(await graphics()).toEqual({ ratio: 1.5, shadows: true, samples: 2, antialias: true });
  await page.evaluate(`document.querySelector('[data-quality="high"]').click()`);
  await expect.poll(async () => (await graphics()).ratio).toBe(2);
  expect(await graphics()).toEqual({ ratio: 2, shadows: true, samples: 4, antialias: true });
  await page.waitForTimeout(2500);
  expect((await graphics()).ratio).toBe(2);
  await page.evaluate(`document.querySelector('[data-quality="low"]').click()`);
  await expect.poll(async () => (await graphics()).shadows).toBe(false);
  expect((await graphics()).antialias).toBe(true);
  expect(errors).toEqual([]);
});

test('street shadow coverage follows the walker and returns to the office when leaving first person', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => localStorage.setItem('office-scene', 'city'));
  await page.goto('/?demo&debug&layout=cozy&at=10:00');
  await page.waitForFunction('!!window.__office?.street');
  const atlas = () => page.evaluate<{ width: number; geometry: string[] }>(`(() => { const found = []; let width = 0; window.__office.scene.traverse(o => { if (o.material?.map?.name === 'shop-front-atlas') { found.push(o.geometry.uuid); width = o.material.map.image.width; } }); return { width, geometry: found.sort() }; })()`);
  const signs = await atlas(); expect(signs.width).toBe(2048);
  await page.evaluate(`document.querySelector('[data-quality="low"]').click()`);
  await expect.poll(async () => (await atlas()).width).toBe(1024);
  await page.evaluate(`document.querySelector('[data-quality="high"]').click()`);
  await expect.poll(async () => (await atlas()).width).toBe(2048);
  expect((await atlas()).geometry).toEqual(signs.geometry);
  const light = () => page.evaluate<{ target: number[]; position: number[]; bounds: number[]; map: number }>(`(() => { const o = window.__office, s = o.scene.children.find(v => v.isDirectionalLight); return { target: s.target.position.toArray(), position: s.position.toArray(), bounds: [s.shadow.camera.left, s.shadow.camera.right], map: s.shadow.mapSize.x }; })()`);
  const home = await light();
  await page.click('#btn-fp');
  await page.evaluate('window.__office.fpToStreet()');
  await page.waitForFunction('window.__office.fp.street');
  await expect.poll(async () => (await light()).bounds).toEqual([-18, 18]);
  await page.evaluate('window.__office.fp.pos.set(85, -70)');
  await expect.poll(async () => Math.abs((await light()).target[0] - 85)).toBeLessThan(0.2);
  expect((await light()).map).toBe(home.map);
  await page.click('#fp-exit');
  await expect.poll(light).toEqual(home);
});

for (const layout of ['pro', 'hq']) test(`${layout}: built city lamps stay on kerbs, clear of crossings, zebras, office and shop doors`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => { localStorage.setItem('office-scene', 'city'); localStorage.setItem('office-quality', 'low'); });
  await page.goto(`/?demo&debug&layout=${layout}&at=10:00`);
  await page.waitForFunction('window.__office?.street?.lampPosts?.length > 0 && window.__office.street.shop.fronts().length > 0');
  const built = await page.evaluate<{ lamps: { x: number; z: number; axis: string }[]; doors: { x: number; z: number }[]; fronts: { x: number; z: number }[] }>('({ lamps: window.__office.street.lampPosts, doors: window.__office.street.doors().map(({ x, z }) => ({ x, z })), fronts: window.__office.street.shop.fronts().map(({ x, z }) => ({ x, z })) })');
  const XS = Array.from({ length: 11 }, (_, k) => 18 + (k - 6) * 15), ZS = Array.from({ length: 11 }, (_, k) => 16.2 + (k - 6) * 15);
  const superblock = { x0: -9.8, x1: 15.8, z0: -11.6, z1: (layout === 'hq' ? 31.2 : 16.2) - 2.2 };
  const config = { XS, ZS, streetWidth: 4.4, superblock };
  const intended = cityLampSites({ ...config, avoid: built.fronts.map(({ x, z }) => [x, z, 1.5]) });
  const sites = new Set(intended.map(({ x, z }) => `${x}:${z}`));
  expect(built.lamps.length).toBeGreaterThan(120);
  expect(new Set(built.lamps.map(({ x, z }) => `${x}:${z}`)).size).toBe(built.lamps.length);
  for (const p of built.lamps) {
    expect(sites.has(`${p.x}:${p.z}`)).toBe(true);
    expect(onCityRoad(p.x, p.z, config)).toBe(false);
    expect(p.x > superblock.x0 && p.x < superblock.x1 && p.z > superblock.z0 && p.z < superblock.z1).toBe(false);
    const along = p.axis === 'z' ? p.z : p.x, crossings = p.axis === 'z' ? ZS : XS;
    expect(Math.min(...crossings.map((cross) => Math.abs(along - cross)))).toBeGreaterThanOrEqual(5.6);
    for (const door of built.doors) expect(Math.hypot(p.x - door.x, p.z - door.z)).toBeGreaterThanOrEqual(1.5);
  }
});
