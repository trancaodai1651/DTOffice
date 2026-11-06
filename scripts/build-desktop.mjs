#!/usr/bin/env node
// Gets the desktop app's resources ready (src-tauri/, `npm run desktop:build` then bundles them): .desktop/office, the
// office as the npm package ships it (its server, hooks, built page and production node_modules, plus a .office-app
// file so its data lives in ~/.my-office), and .desktop/node, the Node that runs it with npm beside it (the first-run
// setup installs Claude Code / Codex with it).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// An isolated production build can be packaged without replacing the running office's .next.
const DIST = process.env.OFFICE_DIST_DIR || '.next';
const OUT = path.join(ROOT, '.desktop'), OFFICE = path.join(OUT, 'office'), NODE = path.join(OUT, 'node');
const step = (s) => console.log(`\n▸ ${s}`);

if (!fs.existsSync(path.join(ROOT, DIST, 'BUILD_ID')) || process.argv.includes('--rebuild')) {
  step('next build');
  execFileSync(process.execPath, [path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
}

step('the office → .desktop/office');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OFFICE, { recursive: true });
const SKIP_NEXT = new Set(['cache', 'dev', 'trace', 'trace-build', 'diagnostics', 'types']);
for (const p of ['bin', 'server', 'hooks', 'src/i18n', 'src/shared', 'public', 'vscode-extension', 'menubar', DIST, 'next.config.mjs', 'package.json', 'package-lock.json', 'LICENSE']) {
  const from = path.join(ROOT, p);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, path.join(OFFICE, p === DIST ? '.next' : p), {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(path.join(ROOT, DIST), src);
      return p !== DIST || !rel || !SKIP_NEXT.has(rel.split(path.sep)[0]);
    },
  });
}
fs.writeFileSync(path.join(OFFICE, '.office-app'), 'The desktop app: data in ~/.my-office (server/data-dir.mjs)\n');

step('production node_modules (npm ci --omit=dev)');
const npmCli = process.platform === 'win32'
  ? path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  : fs.realpathSync(execFileSync('which', ['npm'], { encoding: 'utf8' }).trim());
execFileSync(process.execPath, [npmCli, 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: OFFICE, stdio: 'inherit' });

step('Node → .desktop/node');
fs.mkdirSync(NODE, { recursive: true });
fs.copyFileSync(process.execPath, path.join(NODE, path.basename(process.execPath)));
fs.cpSync(path.resolve(path.dirname(npmCli), '..'), path.join(NODE, 'node_modules', 'npm'), { recursive: true });

if (process.argv.includes('--universal')) {
  if (process.platform !== 'darwin') throw new Error('--universal requires macOS');
  await import('./desktop-universal.mjs');
}

const size = (d) => fs.readdirSync(d, { withFileTypes: true, recursive: true }).filter((e) => e.isFile()).reduce((n, e) => n + fs.statSync(path.join(e.parentPath, e.name)).size, 0);
console.log(`\n✓ .desktop ready: office ${(size(OFFICE) / 1e6).toFixed(0)} MB, node ${(size(NODE) / 1e6).toFixed(0)} MB (Node ${process.versions.node})`);
