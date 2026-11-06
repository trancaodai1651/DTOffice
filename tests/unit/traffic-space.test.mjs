import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrafficSpace, trafficOverlaps, trafficSweep } from '../../src/shared/traffic-space.js';

const car = (x, z = 0, angle = 0) => ({ x, z, angle, half: 1.68, width: 0.9 });
const moto = (x, z = 0, angle = 0) => ({ x, z, angle, half: 1.02, width: 0.34 });
function noCollisions(space) {
  const all = space.values();
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++)
    assert.equal(trafficOverlaps(all[i], all[j]), false, `${all[i].id} intersects ${all[j].id}`);
}

test('a fast car stops before the complete body of a scooter, even across a long frame', () => {
  const space = createTrafficSpace(); space.set('car', car(0)); space.set('scooter', moto(8));
  const moved = space.move('car', 200, 0);
  assert.ok(moved.x < 8 - 1.68 - 1.02);
  assert.ok(moved.x > 5, 'it uses the available road instead of freezing');
  noCollisions(space);
  space.remove('scooter');
  assert.equal(space.move('car', 200, 0).x, 200, 'the queue moves again once the way clears');
});

test('perpendicular cross traffic and long buses occupy their real footprint', () => {
  const space = createTrafficSpace(); space.set('crossing-bus', { ...car(0), half: 3.8, width: 1.11 });
  space.set('moto', moto(1.2, -12, Math.PI / 2));
  const before = space.move('moto', 1.2, 12);
  assert.ok(before.z < -2.1);
  noCollisions(space);
  space.move('crossing-bus', 10, 0);
  assert.equal(space.move('moto', 1.2, 12).z, 12);
});

test('parking, merging and steering cannot sweep through vehicles alongside', () => {
  const space = createTrafficSpace(); space.set('car', car(0)); space.set('beside', moto(0, 1.6));
  const merging = space.move('car', 0, 2, 0.4);
  assert.ok(merging.z < 0.4);
  assert.equal(merging.angle, 0, 'the nose cannot rotate into the scooter');
  noCollisions(space);
  space.move('beside', 8, 1.6);
  const clear = space.move('car', 0, 2, 0.4);
  assert.equal(clear.z, 2); assert.equal(clear.angle, 0.4);
  noCollisions(space);
});

test('opposing traffic, parked player vehicles and wide scooter loads stay solid', () => {
  const space = createTrafficSpace();
  space.set('player-car', car(0)); space.set('oncoming', car(15, 0, Math.PI));
  assert.ok(space.move('oncoming', -15, 0).x > 3.36);
  assert.equal(space.clear(car(0), 'replacement'), false, 'spawning and wrapping must wait for an empty place');
  space.set('wide-load', { ...moto(0, 3), width: 1.21 });
  space.set('bike', moto(-10, 3.6));
  assert.ok(space.move('bike', 10, 3.6).x < -2);
  noCollisions(space);
});

test('separated scooters can pass abreast and touching vehicles can move apart', () => {
  assert.equal(trafficSweep(moto(0, 0), 30, 0, moto(5, 0.8)), 1);
  const space = createTrafficSpace(); space.set('a', car(0)); space.set('b', car(3.4));
  assert.equal(space.move('a', -10, 0).x, -10);
  assert.equal(space.move('b', 10, 0).x, 10);
  noCollisions(space);
});

test('three simulated minutes of mixed traffic, intersections, lane changes and long frames never overlap', () => {
  const space = createTrafficSpace(), cars = [], limit = 65;
  for (const axis of ['x', 'z']) for (const dir of [-1, 1]) for (let i = 0; i < 7; i++) {
    const id = `${axis}:${dir}:${i}`, s = -52 + i * 14, side = dir * 1.25;
    const isMoto = i % 3 !== 0, shape = (isMoto ? moto : car)(axis === 'x' ? s : side, axis === 'x' ? side : s, axis === 'x' ? (dir > 0 ? 0 : Math.PI) : dir * Math.PI / 2);
    if (!space.clear(shape)) continue;
    space.set(id, shape); cars.push({ id, axis, dir, speed: isMoto ? 6.8 : 7.2 });
  }
  let t = 0, frames = 0, distance = 0;
  while (t < 180) {
    const frame = [1 / 60, 0.1, 1.7, 4][frames++ % 4], steps = Math.ceil(frame / 0.05), dt = frame / steps;
    for (let k = 0; k < steps; k++) {
      t += dt;
      for (const v of cars) {
        const b = space.get(v.id), along = v.axis === 'x' ? b.x : b.z;
        const green = ((t % 22) < 10) === (v.axis === 'x'), line = -v.dir * (5.2 + b.half), toLine = (line - along) * v.dir;
        const step = Math.min(v.speed * dt, !green && toLine >= 0 ? toLine : Infinity);
        let s = along + v.dir * step;
        if (s > limit || s < -limit) {
          s = -Math.sign(s) * limit;
          const spawn = { ...b, x: v.axis === 'x' ? s : b.x, z: v.axis === 'z' ? s : b.z };
          if (space.clear(spawn, v.id)) space.set(v.id, spawn);
          continue;
        }
        const moved = space.move(v.id, v.axis === 'x' ? s : b.x, v.axis === 'z' ? s : b.z);
        distance += Math.hypot(moved.x - b.x, moved.z - b.z);
      }
      noCollisions(space);
    }
  }
  assert.ok(distance > 1500, 'traffic progresses through intersections instead of remaining blocked');
});
