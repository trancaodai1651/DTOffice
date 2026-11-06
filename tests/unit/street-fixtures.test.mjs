import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cityLampSites, onCityRoad, roadDashAllowed } from '../../src/shared/street-fixtures.js';

const XS = Array.from({ length: 11 }, (_, k) => 18 + (k - 6) * 15);
const ZS = Array.from({ length: 11 }, (_, k) => 16.2 + (k - 6) * 15);
for (const layout of ['pro', 'hq']) test(`${layout}: every lamp is on a kerb, outside crossroads, zebras and the office block`, () => {
  const config = { XS, ZS, streetWidth: 4.4, superblock: { x0: -9.8, x1: 15.8, z0: -11.6, z1: (layout === 'hq' ? 31.2 : 16.2) - 2.2 } };
  const lamps = cityLampSites(config);
  assert.ok(lamps.length > 120 && lamps.length <= 220);
  assert.equal(new Set(lamps.map(({ x, z }) => `${x}:${z}`)).size, lamps.length);
  for (const p of lamps) {
    assert.equal(onCityRoad(p.x, p.z, config), false);
    const along = p.axis === 'z' ? p.z : p.x, cross = p.axis === 'z' ? ZS : XS;
    assert.ok(cross.every((c) => Math.abs(along - c) >= 5.6));
    assert.ok(!(p.x > config.superblock.x0 && p.x < config.superblock.x1 && p.z > config.superblock.z0 && p.z < config.superblock.z1));
  }
});

test('a doorway keeps its clearance and the lamp moves to the opposite kerb', () => {
  const config = { XS: [0], ZS: [0, 15], streetWidth: 4.4 };
  const [lamp] = cityLampSites(config);
  const [moved] = cityLampSites({ ...config, avoid: [[lamp.x, lamp.z, 1.5]] });
  assert.equal(moved.x, -lamp.x); assert.equal(moved.z, lamp.z);
  assert.equal(cityLampSites({ ...config, avoid: [[lamp.x, lamp.z, 1.5], [-lamp.x, lamp.z, 1.5]] }).length, 0);
});

test('center-line dashes never cross the intersection, zebra or stop line', () => {
  for (const along of [0, 2, 3.6, 4.8, 5.2, 5.9]) assert.equal(roadDashAllowed(along, [0, 15]), false);
  assert.equal(roadDashAllowed(7.5, [0, 15]), true);
  assert.equal(roadDashAllowed(15, [0, 15]), false);
});
