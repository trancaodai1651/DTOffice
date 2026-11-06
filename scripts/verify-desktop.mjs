// Exercise the shipped Node, native image module and built server without a system Node.
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
const resources = path.resolve(process.argv[2] || '.desktop');
const node = path.join(resources, 'node', process.platform === 'win32' ? 'node.exe' : 'node');
const office = path.join(resources, 'office');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'dtoffice-desktop-'));
const pkg = JSON.parse(fs.readFileSync(path.join(office, 'package.json'), 'utf8'));
assert.equal(pkg.name, '@trancaodai1651/dtoffice');
execFileSync(node, ['-e', "console.log(process.arch); require('sharp'); require('next');"], { cwd: office, stdio: 'inherit' });
// Both encoders and the probe must work without system FFmpeg or a network connection.
const videoDir = path.join(data, 'video-smoke'); fs.mkdirSync(videoDir);
fs.writeFileSync(path.join(videoDir, 'video-plan.json'), JSON.stringify({ size: [320, 568], scenes: [{ type: 'title', duration: 1, text: 'DT Office · Tiếng Việt' }] }));
execFileSync(node, [path.join(office, 'server', 'video-tools.mjs'), 'render', path.join(videoDir, 'video-plan.json')], { cwd: office, stdio: 'inherit', env: { ...process.env, OFFICE_FFMPEG: '', OFFICE_FFPROBE: '' } });
console.log('Bundled FFmpeg + ffprobe render and verify H.264/AAC: OK');
const port = 14310;
const child = spawn(node, [path.join(office, 'bin', 'cli.mjs')], {
  cwd: office, stdio: 'inherit',
  env: {
    ...process.env, NODE_ENV: 'production', OFFICE_PORT: String(port), OFFICE_CODEX_PROCS: '0',
    OFFICE_DATA_DIR: data, OFFICE_LANG: 'en', OFFICE_USAGE: '0', OFFICE_CI: '0', OFFICE_TRANSLATE: '0', OFFICE_AI_ACCOUNTS: '0',
    CLAUDE_CONFIG_DIR: path.join(data, '.claude'), CODEX_HOME: path.join(data, '.codex'),
  },
});
let exited = false;
child.once('exit', () => { exited = true; });
try {
  let ready = false;
  for (let i = 0; i < 120 && !exited; i++) {
    try {
      const health = await fetch(`http://localhost:${port}/api/doctor`);
      const page = await fetch(`http://localhost:${port}/?demo`);
      if (health.ok && page.ok) {
        const html = await page.text();
        assert.ok(html.includes('<title>DT Office</title>'), 'The bundled page must have the current DT Office title');
        ready = true; break;
      }
    } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Bundled desktop server did not become healthy');
  console.log(`Bundled DT Office ${pkg.version} server and page: OK`);
} finally {
  child.kill();
  await new Promise(resolve => {
    if (exited) resolve();
    else { child.once('exit', resolve); setTimeout(resolve, 5000).unref(); }
  });
  fs.rmSync(data, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
