import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

test('module map check accepts LF and CRLF checkouts and still detects stale descriptions', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dtoffice-module-map-'));
  try {
    for (const dir of ['scripts', 'src/office', 'docs']) fs.mkdirSync(path.join(root, dir), { recursive: true });
    const script = path.join(root, 'scripts/module-map.mjs');
    const source = path.join(root, 'src/office/example.js');
    const doc = path.join(root, 'docs/ARCHITECTURE.md');
    fs.copyFileSync(new URL('../../scripts/module-map.mjs', import.meta.url), script);
    fs.writeFileSync(source, '// An example module\n// with a wrapped description.\nexport const value = 1;\n');
    fs.writeFileSync(doc, '# Architecture\n\n### Module map\n\n| Module | Lines | What it is |\n| --- | ---: | --- |\n\nOther documentation.\n');
    const run = (...args) => execFileSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    run();
    assert.match(run('--check'), /up to date/);
    for (const file of [source, doc]) fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
    const before = fs.readFileSync(doc);
    assert.match(run('--check'), /up to date/);
    assert.deepEqual(fs.readFileSync(doc), before, 'Check mode must preserve the documentation bytes');
    fs.writeFileSync(source, fs.readFileSync(source, 'utf8').replace('An example module', 'A changed module'));
    const stale = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /out of date/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
