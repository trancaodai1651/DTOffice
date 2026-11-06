// Publish only the signed installer/archive bytes produced by Tauri.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function updaterManifest(dir, version, notes = '', date = new Date().toISOString()) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('A stable release version is required');
  const entry = name => {
    const file = path.join(dir, name), sig = `${file}.sig`;
    if (!fs.existsSync(file) || fs.statSync(file).size < 1000 || !fs.existsSync(sig)) throw Error(`Missing signed update artifact: ${name}`);
    const signature = fs.readFileSync(sig, 'utf8').trim();
    if (signature.length > 8192 || !/^[A-Za-z0-9+/=]+$/.test(signature) || !Buffer.from(signature, 'base64').toString('utf8').startsWith('untrusted comment:')) throw Error(`Invalid update signature: ${name}`);
    return { signature, url: `https://github.com/trancaodai1651/DTOffice/releases/download/v${version}/${name}` };
  };
  const windows = entry(`DT.Office_${version}_x64-setup.exe`), mac = entry('DT-Office-macos-universal.app.tar.gz');
  return { version, notes, pub_date: date, platforms: { 'windows-x86_64': windows, 'darwin-x86_64': mac, 'darwin-aarch64': mac } };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(process.argv[2] || 'release'), version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version;
  const notes = fs.readFileSync(path.join(root, 'docs', `RELEASE-${version}.md`), 'utf8');
  fs.writeFileSync(path.join(dir, 'latest.json'), JSON.stringify(updaterManifest(dir, version, notes), null, 2) + '\n');
  console.log(`Signed updater manifest ready: ${version} (Windows + macOS Intel/ARM)`);
}
