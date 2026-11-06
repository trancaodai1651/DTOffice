import test from 'node:test';
import assert from 'node:assert/strict';
import { apiMoney, apiEstimate } from '../../src/shared/api-money.js';
test('API estimates bill cached tokens separately and never double count reasoning output', () => {
  assert.equal(apiEstimate('gpt-5.3-codex', { input: 1e6, cached: 5e5, output: 1e6, reasoning: 9e5 }), 14.9625);
  assert.equal(apiEstimate('unknown', { input: 1e6 }), null);
  assert.equal(apiEstimate('gpt-6.1-sol', { input: 1e6, cached: 2e6, output: 0 }), .1);
  assert.equal(apiMoney(2, 26000), '$2.00 · ≈ 52.000 ₫');
  assert.equal(apiMoney(0, 26000), '$0.00 · ≈ 0 ₫');
});
