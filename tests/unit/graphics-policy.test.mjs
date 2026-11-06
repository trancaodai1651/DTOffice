import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoGraphicsLevel, canAdaptGraphics, graphicsResolutionSteps, lowerAutoGraphicsLevel } from '../../src/shared/graphics-policy.js';

test('Auto respects phones/tablets, software rendering and remembered lower quality', () => {
  assert.equal(autoGraphicsLevel({ coarse: true, shortSide: 390, saved: { level: 'high', at: Date.now() } }), 'low');
  assert.equal(autoGraphicsLevel({ coarse: true, shortSide: 768 }), 'medium');
  assert.equal(autoGraphicsLevel({ coarse: true, shortSide: 768, saved: { level: 'low', at: Date.now() } }), 'low');
  assert.equal(autoGraphicsLevel({ software: true }), 'low');
  assert.equal(autoGraphicsLevel(), 'high');
  assert.equal(autoGraphicsLevel({ saved: { level: 'low', at: Date.now() } }), 'medium');
  assert.equal(autoGraphicsLevel({ narrow: true, saved: { level: 'low', at: Date.now() } }), 'medium');
});

test('Retina tablet Auto respects its pixel budget; explicit High can retain detail', () => {
  const screen = { width: 1366, height: 1024, pixelRatio: 2, prMax: 2, coarse: true };
  const auto = graphicsResolutionSteps(screen), manual = graphicsResolutionSteps({ ...screen, auto: false });
  assert.ok(auto[0] ** 2 * screen.width * screen.height <= 1_500_001);
  assert.equal(manual[0], 2);
  assert.equal(manual.length, 1);
  assert.ok(auto.at(-1) <= 0.75);
  assert.ok(auto.every((ratio, i) => ratio > 0 && (!i || ratio < auto[i - 1])));
  assert.deepEqual(graphicsResolutionSteps({ software: true, pixelRatio: 3 }), [0.5]);
});

test('desktop Auto keeps native clarity and shadows while touch devices can trade detail for smoothness', () => {
  assert.equal(graphicsResolutionSteps({ pixelRatio: 2 }).at(-1), 1);
  assert.equal(graphicsResolutionSteps({ coarse: true, pixelRatio: 2 }).at(-1), 0.6);
  assert.deepEqual(graphicsResolutionSteps({ pixelRatio: 1.5, prMax: 2, auto: false }), [1.5]);
  assert.equal(lowerAutoGraphicsLevel('high'), 'medium');
  assert.equal(lowerAutoGraphicsLevel('medium'), null);
  assert.equal(lowerAutoGraphicsLevel('medium', true), 'low');
  assert.equal(lowerAutoGraphicsLevel('low', true), null);
});

test('resolution can adapt at 12, 20 and 30 fps without learning from background throttling', () => {
  for (const fps of [12, 20, 30, 60]) assert.equal(canAdaptGraphics(1000 / fps), true);
  for (const fps of [2, 5, 8]) assert.equal(canAdaptGraphics(1000 / fps), false);
  assert.equal(canAdaptGraphics(0), false);
});
