import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pathValue = env => env[Object.keys(env).find(k => k.toUpperCase() === 'PATH')] || '';
export function findMediaTool(name, { platform = process.platform, arch = process.arch, env = process.env, root = ROOT } = {}) {
  const exe = name + (platform === 'win32' ? '.exe' : '');
  const candidates = [env[`OFFICE_${name.toUpperCase()}`], path.join(root, 'vendor', 'ffmpeg', `${platform}-${arch}`, exe)];
  for (const dir of String(pathValue(env)).split(path.delimiter)) if (dir) candidates.push(path.join(dir, exe));
  if (platform === 'win32') {
    const local = env.LOCALAPPDATA || '';
    candidates.push(path.join(local, 'Microsoft', 'WinGet', 'Links', exe), `C:/ffmpeg/bin/${exe}`);
    const packages = path.join(local, 'Microsoft', 'WinGet', 'Packages');
    try { for (const pkg of fs.readdirSync(packages).filter(n => n.startsWith('Gyan.FFmpeg_'))) {
      const dir = path.join(packages, pkg); for (const build of fs.readdirSync(dir)) candidates.push(path.join(dir, build, 'bin', exe));
    } } catch { /* not installed by winget */ }
  } else candidates.push(...['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'].map(d => path.join(d, exe)));
  return candidates.find(f => { try { return f && fs.statSync(f).isFile(); } catch { return false; } }) || null;
}
export const mediaEnvironment = (env = process.env) => {
  const ff = findMediaTool('ffmpeg', { env });
  const result = { ...env };
  if (ff) { for (const key of Object.keys(result)) if (key.toUpperCase() === 'PATH') delete result[key]; result.PATH = `${path.dirname(ff)}${path.delimiter}${pathValue(env)}`; }
  return { ...result, NODE_USE_SYSTEM_CA: '1' };
};
