import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { updateReadiness } from '../../src/shared/update-readiness.js';
import { updaterManifest } from '../../scripts/create-updater-manifest.mjs';

test('updates wait for owned tasks, queued team runs, video rendering and PDF printing', () => {
  assert.equal(updateReadiness().safe, true);
  assert.equal(updateReadiness([{ id: 'queued' }]).safe, false);
  assert.equal(updateReadiness([], [{ status: 'run', stages: [] }]).safe, false);
  for (const status of ['run', 'render', 'print']) assert.equal(updateReadiness([], [], [{ status }]).safe, false);
  assert.equal(updateReadiness([], [{ status: 'done' }], [{ status: 'done' }, { status: 'fail' }]).safe, true);
});
test('update manifest needs signatures for the exact published Windows and Universal archives', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'office-update-'));
  try {
    assert.throws(() => updaterManifest(dir, '0.4.13'), /Missing signed/);
    const names = ['DT.Office_0.4.13_x64-setup.exe', 'DT-Office-macos-universal.app.tar.gz'];
    const signature = Buffer.from('untrusted comment: fixture\nfixture-signature').toString('base64');
    for (const name of names) { fs.writeFileSync(path.join(dir, name), Buffer.alloc(1024)); fs.writeFileSync(path.join(dir, `${name}.sig`), signature); }
    const manifest = updaterManifest(dir, '0.4.13', 'Release notes');
    assert.equal(manifest.platforms['darwin-x86_64'].signature, signature);
    assert.deepEqual(manifest.platforms['darwin-aarch64'], manifest.platforms['darwin-x86_64']);
    assert.match(manifest.platforms['windows-x86_64'].url, /DTOffice\/releases\/download\/v0.4.13\/DT.Office_0.4.13_x64-setup.exe$/);
    assert.equal(manifest.notes, 'Release notes');
    fs.writeFileSync(path.join(dir, `${names[0]}.sig`), 'broken');
    assert.throws(() => updaterManifest(dir, '0.4.13'), /Invalid update signature/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
