import { test, expect } from '@playwright/test';

type Traffic = { collisions: number[][], shadows: number, shadowCasters: number, vehicles: { kind: string, x: number, z: number, speed: number }[] };
type Ride = { kind: string, x: number, z: number, yaw: number, speed: number, mesh: { position: { x: number, z: number }, rotation: { y: number } } };
type Office = { pauseDemo: () => void, speed: (n: number) => void, fpToStreet: () => void, rides: Record<string, Ride>, fp: { street: boolean, vehicle: Ride | null },
  street: { traffic: () => Traffic, blockedAt: (x: number, z: number, r: number) => boolean, registerPlayerVehicle: (v: Ride) => boolean } };

test('rush-hour traffic stays separate through intersections and parking during timelapse', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-tips', 'seen'); localStorage.setItem('office-scene', 'city'); });
  await page.goto('/?demo&debug&layout=pro&at=17:10');
  await page.waitForFunction(() => !!(window as unknown as { __office?: Office }).__office?.street?.traffic);
  await page.evaluate(() => { const o = (window as unknown as { __office: Office }).__office; o.pauseDemo(); o.speed(20); });
  const first = await page.evaluate(() => (window as unknown as { __office: Office }).__office.street.traffic());
  expect(first.vehicles.filter(v => v.kind === 'moto').length).toBeGreaterThan(10);
  expect(first.vehicles.filter(v => v.kind !== 'moto').length).toBeGreaterThan(10);
  expect(first.collisions).toEqual([]);
  for (let sample = 0; sample < 30; sample++) {
    await page.waitForTimeout(250);
    const traffic = await page.evaluate(() => (window as unknown as { __office: Office }).__office.street.traffic());
    expect(traffic.collisions, `sample ${sample}`).toEqual([]);
  }
  const last = await page.evaluate(() => (window as unknown as { __office: Office }).__office.street.traffic());
  expect(last.vehicles.some((v, i) => v.x !== first.vehicles[i]?.x || v.z !== first.vehicles[i]?.z)).toBe(true);
  expect(last.vehicles.some(v => v.speed > 0.5)).toBe(true);
  expect(errors).toEqual([]);
});

test('a car driven in first person stops before the parked scooter instead of crossing it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('office-quality', 'low'); localStorage.setItem('office-tips', 'seen'); localStorage.setItem('office-scene', 'city'); });
  await page.goto('/?demo&debug&layout=pro&at=03:10');
  await page.waitForFunction(() => !!(window as unknown as { __office?: Office }).__office?.street?.traffic);
  await page.evaluate(() => (window as unknown as { __office: Office }).__office.pauseDemo());
  await page.locator('#btn-fp').click();
  await page.evaluate(() => (window as unknown as { __office: Office }).__office.fpToStreet());
  await page.waitForFunction(() => {
    const o = (window as unknown as { __office?: Office }).__office;
    return o?.fp.street && o.rides.car && o.rides.moto;
  });
  const placed = await page.evaluate(() => {
    const o = (window as unknown as { __office: Office }).__office, car = o.rides.car, bike = o.rides.moto;
    const start = { x: car.x, z: car.z }, fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    for (const offset of [0, 8, -8, 16, -16]) {
      const x = start.x + fx * offset, z = start.z + fz * offset;
      if ([0, 1, 2, 3, 4, 5, 6, 7].some(d => o.street.blockedAt(x + fx * d, z + fz * d, 0.95))) continue;
      Object.assign(bike, { x: x + fx * 7, z: z + fz * 7, yaw: car.yaw, speed: 0 });
      if (!o.street.registerPlayerVehicle(bike)) continue;
      Object.assign(car, { x, z, speed: 0 });
      if (!o.street.registerPlayerVehicle(car)) continue;
      for (const v of [car, bike]) { v.mesh.position.x = v.x; v.mesh.position.z = v.z; v.mesh.rotation.y = v.yaw - Math.PI / 2; }
      o.fp.vehicle = car; o.speed(4); return true;
    }
    return false;
  });
  expect(placed, 'a clear stretch of the real road is available').toBe(true);
  await page.keyboard.down('w');
  await expect.poll(async () => page.evaluate(() => {
    const { car, moto } = (window as unknown as { __office: Office }).__office.rides;
    return Math.hypot(car.x - moto.x, car.z - moto.z);
  }), { timeout: 20_000 }).toBeLessThan(2.7);
  await page.waitForTimeout(1200);
  await page.keyboard.up('w');
  const stopped = await page.evaluate(() => {
    const o = (window as unknown as { __office: Office }).__office, { car, moto } = o.rides;
    return { gap: Math.hypot(car.x - moto.x, car.z - moto.z), speed: car.speed, collisions: o.street.traffic().collisions };
  });
  expect(stopped.gap).toBeGreaterThanOrEqual(1.56 + 0.92);
  expect(stopped.gap).toBeLessThan(2.7);
  expect(stopped.speed).toBeLessThan(0.2);
  expect(stopped.collisions).toEqual([]);
  expect(errors).toEqual([]);
});
