// Both architectures must work in the bundled Node server as well as the Tauri window.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.desktop');
const node = path.join(out, 'node', 'node');
const office = path.join(out, 'office');
const cache = path.join(out, 'universal-downloads');
fs.mkdirSync(cache, { recursive: true });
const version = process.version;
const base = `https://nodejs.org/dist/${version}`;
const sums = await (await fetch(`${base}/SHASUMS256.txt`)).text();
for (const arch of ['x64', 'arm64']) {
  const name = `node-${version}-darwin-${arch}.tar.gz`;
  const response = await fetch(`${base}/${name}`);
  if (!response.ok) throw new Error(`Node download: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (!sums.split('\n').some(line => line.trim() === `${hash}  ${name}`)) throw new Error(`Checksum mismatch: ${name}`);
  const archive = path.join(cache, name);
  fs.writeFileSync(archive, bytes);
  execFileSync('tar', ['-xzf', archive, '-C', cache]);
}
execFileSync('lipo', ['-create', ...['x64', 'arm64'].map(arch => path.join(cache, `node-${version}-darwin-${arch}`, 'bin', 'node')), '-output', node]);
fs.chmodSync(node, 0o755);
execFileSync('lipo', [node, '-verify_arch', 'x86_64', 'arm64']);
execFileSync('codesign', ['--force', '--sign', '-', node]);

// npm normally keeps only host-native optional dependencies. Install both Darwin variants
// at the exact locked versions; --force permits the other CPU, without changing the repo lock.
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const packages = Object.entries(lock.packages)
  .filter(([name]) => /^node_modules\/(?:@next\/swc|@img\/sharp(?:-libvips)?)-darwin-(?:x64|arm64)$/.test(name))
  .map(([name, value]) => `${name.slice('node_modules/'.length)}@${value.version}`);
const npmCli = path.join(out, 'node', 'node_modules', 'npm', 'bin', 'npm-cli.js');
execFileSync(node, [npmCli, 'install', '--no-save', '--package-lock=false', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', '--force', ...packages], { cwd: office, stdio: 'inherit' });
for (const pkg of packages) {
  const name = pkg.slice(0, pkg.lastIndexOf('@'));
  if (!fs.existsSync(path.join(office, 'node_modules', name))) throw new Error(`Missing universal dependency: ${name}`);
}
