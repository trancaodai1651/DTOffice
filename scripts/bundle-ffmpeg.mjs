// Pinned upstream release; binaries are downloaded during build, never during app installation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tag = 'b6.1.1', base = `https://github.com/eugeneware/ffmpeg-static/releases/download/${tag}`;
const sums = {
  'ffmpeg-win32-x64.gz': '8883a3dffbd0a16cf4ef95206ea05283f78908dbfb118f73c83f4951dcc06d77',
  'ffprobe-win32-x64.gz': 'f309e6223ad89d2fe54bccd420a7709b66fd27540674e92309578ed491a43c8d',
  'ffmpeg-darwin-x64.gz': '929b375c1182d956c51f7ac25e0b2b0411fb01f6f407aa15c9758efeb4242106',
  'ffprobe-darwin-x64.gz': 'd4da574d6e2e197bd259b47d69cf262df9e312af24ad960444f6d806d3d4c186',
  'ffmpeg-darwin-arm64.gz': '8923876afa8db5585022d7860ec7e589af192f441c56793971276d450ed3bbfa',
  'ffprobe-darwin-arm64.gz': 'd986a8ec7b030899fe66a8a288ed809a3543338705a3ce178cfb85869c5d80be',
  'win32-x64.LICENSE': '8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903',
  'win32-x64.README': 'a636a7183c58006351acbaf35303c0ed85c6e1320fd4e80de453ba6157de6311',
  'darwin-x64.LICENSE': '2e1d16c72fd74e12063776371da757322f8b77589386532f4fd8634bde7de1af',
  'darwin-arm64.LICENSE': 'cb48bf09a11f5fb576cddb0431c8f5ed0a60157a9ec942adffc13907cbe083f2',
  'darwin-x64.README.gz': '63f983e795802452bdb02bd77c27f3dded90a63eec20d1f3e47220823aa8d1b2',
  'darwin-arm64.README.gz': '527d4ea64a17e81a72ab57103b3817ee224261b5c07844d5a99af40758315154',
};
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
export async function bundleFfmpeg(office, { platform = process.platform, arch = process.arch, universal = false } = {}) {
  const platforms = platform === 'darwin' && universal ? ['darwin-x64', 'darwin-arm64'] : [`${platform}-${arch}`];
  const cache = path.join(root, '.cache', 'ffmpeg', tag); fs.mkdirSync(cache, { recursive: true });
  for (const key of platforms) {
    const out = path.join(office, 'vendor', 'ffmpeg', key); fs.mkdirSync(out, { recursive: true });
    for (const [source, target] of [[`ffmpeg-${key}.gz`, `ffmpeg${platform === 'win32' ? '.exe' : ''}`], [`ffprobe-${key}.gz`, `ffprobe${platform === 'win32' ? '.exe' : ''}`], [`${key}.LICENSE`, 'LICENSE'], [`${key}.README${platform === 'darwin' ? '.gz' : ''}`, 'README']]) {
      if (!sums[source]) throw new Error(`Unsupported FFmpeg target: ${source}`);
      const saved = path.join(cache, source); let bytes = fs.existsSync(saved) ? fs.readFileSync(saved) : null;
      if (!bytes || hash(bytes) !== sums[source]) {
        const response = await fetch(`${base}/${source}`, { signal: AbortSignal.timeout(300000) });
        if (!response.ok) throw new Error(`FFmpeg download ${source}: HTTP ${response.status}`);
        bytes = Buffer.from(await response.arrayBuffer()); if (hash(bytes) !== sums[source]) throw new Error(`FFmpeg checksum mismatch: ${source}`);
        fs.writeFileSync(saved, bytes);
      }
      const dest = path.join(out, target); fs.writeFileSync(dest, source.endsWith('.gz') ? gunzipSync(bytes) : bytes);
      if (target.startsWith('ff') && platform !== 'win32') { fs.chmodSync(dest, 0o755); if (platform === 'darwin') execFileSync('codesign', ['--force', '--sign', '-', dest]); }
    }
    fs.writeFileSync(path.join(out, 'SOURCE.txt'), `FFmpeg tools, upstream binary release ${tag}\n${base}\nhttps://github.com/eugeneware/ffmpeg-static (build scripts/source provenance)\nhttps://ffmpeg.org/releases/ffmpeg-6.1.1.tar.xz\nSee LICENSE and README for licensing, codec libraries and their source locations.\n`);
    console.log(`FFmpeg + ffprobe bundled: ${key}`);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await bundleFfmpeg(path.resolve(process.argv[2] || '.desktop/office'), { universal: process.argv.includes('--universal') });
