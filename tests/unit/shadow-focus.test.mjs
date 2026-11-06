import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createShadowFocus } from '../../src/office/scene/shadow-focus.js';

test('sunlight covers a distant street walker without changing direction or allocating a larger shadow map', () => {
  const sun = new THREE.DirectionalLight(); sun.position.set(13, 18, 17.5); sun.target.position.set(3, 0, 9);
  Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28 });
  sun.shadow.mapSize.set(1024, 1024);
  const home = sun.position.clone(), target = sun.target.position.clone(), offset = home.clone().sub(target);
  let updates = 0; const focus = createShadowFocus(sun, () => updates++);
  const walker = new THREE.Vector3(85, -0.58, -70);
  focus(walker);
  assert.ok(sun.target.position.distanceTo(walker) < 0.1);
  assert.ok(sun.position.clone().sub(sun.target.position).distanceTo(offset) < 1e-10);
  assert.equal(sun.shadow.camera.right - sun.shadow.camera.left, 36);
  assert.equal(sun.shadow.mapSize.x, 1024);
  assert.equal(updates, 1);
  focus(walker); assert.equal(updates, 1);
  focus(null);
  assert.deepEqual(sun.position.toArray(), home.toArray());
  assert.deepEqual(sun.target.position.toArray(), target.toArray());
  assert.equal(sun.shadow.camera.right, 28);
  assert.equal(updates, 2);
  focus(null); assert.equal(updates, 2);
});
