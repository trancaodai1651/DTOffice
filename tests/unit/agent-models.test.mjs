// The models and efforts work is given with (server/agent-models.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CLAUDE_MODELS, codexModels, pickRun, runArgs } from '../../server/agent-models.mjs';

function codexHome(models) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'office-codex-'));
  fs.writeFileSync(path.join(d, 'models_cache.json'), JSON.stringify({ models }));
  return d;
}

test("Codex's models are read from its own list, the hidden ones left out, each with its efforts", () => {
  const home = codexHome([
    { slug: 'gpt-a', display_name: 'GPT-A', visibility: 'list', default_reasoning_level: 'medium', supported_reasoning_levels: [{ effort: 'low' }, { effort: 'high' }, { effort: 'ultra' }] },
    { slug: 'gpt-hidden', display_name: 'Hidden', visibility: 'hide' },
  ]);
  assert.deepEqual(codexModels(home), [{ id: 'gpt-a', name: 'GPT-A', efforts: ['low', 'high', 'ultra'], def: 'medium' }]);
  assert.deepEqual(codexModels(path.join(home, 'nope')), [], 'no list yet: none');
});

test('a request keeps a model and an effort its CLI knows, and nothing a command line would read as more', () => {
  const home = codexHome([{ slug: 'gpt-a', supported_reasoning_levels: [{ effort: 'low' }, { effort: 'ultra' }] }]);
  assert.deepEqual(pickRun('codex', { model: 'gpt-a', effort: 'ultra' }, home), { model: 'gpt-a', effort: 'ultra' });
  assert.deepEqual(pickRun('codex', { model: 'gpt-a', effort: 'max' }, home), { model: 'gpt-a', effort: '' }, 'an effort that model does not take');
  assert.deepEqual(pickRun('claude', { model: CLAUDE_MODELS[0].id, effort: 'xhigh' }), { model: CLAUDE_MODELS[0].id, effort: 'xhigh' });
  assert.deepEqual(pickRun('claude', { model: 'opus; rm -rf /', effort: 'huge' }), { model: '', effort: '' });
  assert.deepEqual(pickRun('claude', { model: '--dangerously-skip-permissions' }), { model: '', effort: '' });
  assert.deepEqual(pickRun('claude', {}), { model: '', effort: '' });
});

test("each CLI's own flags", () => {
  assert.deepEqual(runArgs('claude', { model: 'claude-opus-5-5', effort: 'high' }), ['--model', 'claude-opus-5-5', '--effort', 'high']);
  assert.deepEqual(runArgs('codex', { model: 'gpt-a', effort: 'low' }), ['-m', 'gpt-a', '-c', 'model_reasoning_effort="low"']);
  assert.deepEqual(runArgs('codex', {}), []);
});
