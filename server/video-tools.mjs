// Local video pipeline. No shell, browser automation or disabled TLS checks.
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import tls from 'node:tls';
import dns from 'node:dns/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { findMediaTool, mediaEnvironment } from './media-tools.mjs';

const exec = promisify(execFile);
const run = (file, args, cwd) => exec(file, args, { cwd, env: mediaEnvironment(), windowsHide: true, timeout: 600000, maxBuffer: 4e6 });
const requireTool = name => { const tool = findMediaTool(name); if (!tool) throw Error(`${name} is not installed; install the current DT Office desktop build.`); return tool; };
export function localFile(dir, file) {
  const root = path.resolve(dir), resolved = path.resolve(root, String(file || ''));
  if (!String(file || '') || (resolved !== root && !resolved.startsWith(root + path.sep))) throw Error('Media paths must stay in the job folder');
  let ancestor = resolved; while (!fs.existsSync(ancestor) && ancestor !== path.dirname(ancestor)) ancestor = path.dirname(ancestor);
  const real = fs.realpathSync(ancestor), realRoot = fs.realpathSync(root);
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) throw Error('Media symlink leaves the job folder');
  return resolved;
}
const privateAddress = ip => /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|::|fc|fd|fe80|::ffff:)/i.test(ip);
export async function publicMediaUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw Error('Use a public HTTPS media URL');
  const addresses = await dns.lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true });
  if (!addresses.length || addresses.some(a => privateAddress(a.address))) throw Error('Private network media URLs are not supported');
  return { url, addresses };
}
/** Download a publicly accessible licensed source, using the OS trust store alongside Node roots. */
export async function downloadMedia(value, dest, redirects = 0) {
  if (redirects > 5) throw Error('Too many media redirects');
  const { url, addresses } = await publicMediaUrl(value);
  const ca = [...tls.rootCertificates, ...(tls.getCACertificates?.('system') || [])];
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const partial = `${dest}.part`;
  try {
    await new Promise((resolve, reject) => {
      const req = https.get(url, { ca, headers: { 'User-Agent': 'DT-Office/Video-Editor', Accept: 'video/*,audio/*,image/*,application/octet-stream' },
        lookup: (_host, options, callback) => { const a = addresses[0]; if (options.all) callback(null, addresses); else callback(null, a.address, a.family); },
      }, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) { res.resume(); downloadMedia(new URL(res.headers.location, url).href, dest, redirects + 1).then(resolve, reject); return; }
        if (res.statusCode !== 200) { res.resume(); reject(Error(`Media download HTTP ${res.statusCode}; use another licensed source or original graphics.`)); return; }
        const type = String(res.headers['content-type'] || '');
        if (/text\/html|application\/json/i.test(type)) { res.resume(); reject(Error('The URL is a web page, not a downloadable media file')); return; }
        let size = 0; const file = fs.createWriteStream(partial, { flags: 'wx' });
        const fail = e => { file.destroy(); res.destroy(); reject(e); };
        res.on('data', chunk => { size += chunk.length; if (size > 512e6) fail(Error('Media file exceeds 512 MB')); });
        res.on('error', fail); file.on('error', fail);
        file.on('finish', () => { if (!size) { reject(Error('Empty media response')); return; } fs.renameSync(partial, dest); resolve(dest); });
        res.pipe(file);
      });
      req.setTimeout(120000, () => req.destroy(Error('Media download timeout'))); req.on('error', reject);
    });
    return dest;
  } catch (e) { try { fs.unlinkSync(partial); } catch { /* no partial */ } throw e; }
}
export async function verifyVideo(file, format = '') {
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000) throw Error('No completed MP4 was exported');
  const { stdout } = await run(requireTool('ffprobe'), ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]);
  const probe = JSON.parse(stdout), v = probe.streams?.find(s => s.codec_type === 'video'), a = probe.streams?.find(s => s.codec_type === 'audio');
  const duration = Number(probe.format?.duration), rate = String(v?.r_frame_rate || '').split('/').map(Number), fps = rate[0] / (rate[1] || 1);
  if (!v || v.codec_name !== 'h264' || !a || a.codec_name !== 'aac' || !(duration > 0 && duration <= 900) || Math.abs(fps - 30) > .1) throw Error('Export must contain H.264 video, AAC audio, positive duration and 30 fps');
  if (format && Math.abs(v.width / v.height - (format === 'long' ? 16 / 9 : 9 / 16)) > .02) throw Error('Export aspect ratio does not match the requested format');
  return { duration, width: v.width, height: v.height, fps, videoCodec: v.codec_name, audioCodec: a.codec_name, bytes: fs.statSync(file).size };
}
function fontFile() {
  const options = process.platform === 'win32' ? [`${process.env.WINDIR || 'C:/Windows'}/Fonts/arial.ttf`] : process.platform === 'darwin' ? ['/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf'] : ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'];
  return options.find(f => fs.existsSync(f));
}
export function validateVideoPlan(plan) {
  if (!plan || !Array.isArray(plan.scenes) || !plan.scenes.length || plan.scenes.length > 40) throw Error('video-plan.json needs 1–40 scenes');
  const size = plan.size || (plan.format === 'long' ? [1920, 1080] : [1080, 1920]);
  if (!Array.isArray(size) || size.length !== 2 || size.some(n => !Number.isInteger(n) || n < 240 || n > 1920 || n % 2)) throw Error('Invalid even video dimensions');
  let duration = 0;
  for (const s of plan.scenes) {
    if (!['title', 'clip', 'image'].includes(s.type) || !(s.duration >= 1 && s.duration <= 120) || String(s.text || '').length > 1200) throw Error('Invalid scene type, duration or caption');
    if (s.type !== 'title' && (!s.file || !s.source || !s.license)) throw Error('Each media scene requires file, source and license');
    if (s.color && !/^#[0-9a-f]{6}$/i.test(s.color)) throw Error('Use a six-digit background color');
    duration += Number(s.duration);
  }
  if (duration > 600) throw Error('Video exceeds ten minutes');
  return { size, duration };
}
// Rasterise once with the image runtime shipped by the app. Some upstream Intel
// FFmpeg builds omit drawtext; overlay works on every bundled architecture.
export async function captionImage(text, w, h) {
  const sharp = (await import('sharp')).default, font = fontFile();
  if (!font) throw Error('No font with Vietnamese support was found');
  if (!String(text || '').trim()) return sharp({ create: { width: 1, height: 1, channels: 4, background: '#00000000' } }).png().toBuffer();
  const escaped = String(text).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const pad = Math.max(8, Math.round(w / 54)), size = Math.round(w / (w > h ? 32 : 18));
  const data = await sharp({ text: { text: `<span foreground="white">${escaped}</span>`, font: `${process.platform === 'linux' ? 'DejaVu Sans' : 'Arial'} ${size}`, fontfile: font, width: w - 4 * pad, align: 'center', wrap: 'word-char', rgba: true, spacing: Math.round(size / 4) } }).png().toBuffer();
  const fit = await sharp(data).resize({ width: w - 4 * pad, height: h - 4 * pad, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  const meta = await sharp(fit).metadata();
  return sharp({ create: { width: Math.min(w, meta.width + 2 * pad), height: Math.min(h, meta.height + 2 * pad), channels: 4, background: { r: 0, g: 0, b: 0, alpha: .6 } } }).composite([{ input: fit, gravity: 'centre' }]).png().toBuffer();
}
export async function renderVideo(dir, plan) {
  const root = path.resolve(dir); fs.mkdirSync(root, { recursive: true });
  const { size: [w, h] } = validateVideoPlan(plan), ff = requireTool('ffmpeg');
  const work = fs.mkdtempSync(path.join(root, '.render-')), sources = [];
  for (const [i, scene] of plan.scenes.entries()) {
    fs.writeFileSync(path.join(work, `caption-${i}.png`), await captionImage(scene.text, w, h));
    const input = scene.type === 'title' ? ['-f', 'lavfi', '-i', `color=c=0x${(scene.color || '#17253b').slice(1)}:s=${w}x${h}:r=30:d=${scene.duration}`] : [...(scene.type === 'image' ? ['-loop', '1'] : ['-stream_loop', '-1']), '-i', localFile(root, scene.file)];
    const filter = `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=30[base];[base][2:v]overlay=(W-w)/2:(H-h)/2:format=auto,format=yuv420p[out]`;
    await run(ff, ['-hide_banner', '-y', '-threads', '2', '-filter_complex_threads', '1', ...input, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-loop', '1', '-i', `caption-${i}.png`, '-t', String(scene.duration), '-map', '[out]', '-map', '1:a:0', '-filter_complex', filter, '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-shortest', `scene-${i}.mp4`], work);
    if (scene.type !== 'title') sources.push({ file: scene.file, source: scene.source, license: scene.license });
  }
  fs.writeFileSync(path.join(work, 'concat.txt'), plan.scenes.map((_, i) => `file 'scene-${i}.mp4'`).join('\n'));
  await run(ff, ['-hide_banner', '-y', '-f', 'concat', '-safe', '1', '-i', 'concat.txt', '-c', 'copy', '-movflags', '+faststart', 'export.mp4'], work);
  const staged = path.join(work, 'export.mp4'), proof = await verifyVideo(staged, plan.format || '');
  const dest = path.join(root, 'video-final.mp4'); fs.copyFileSync(staged, dest);
  await run(ff, ['-hide_banner', '-y', '-i', dest, '-frames:v', '1', '-q:v', '2', path.join(root, 'cover.jpg')], root);
  fs.writeFileSync(path.join(root, 'render-proof.json'), JSON.stringify({ ...proof, silentAudio: true, sources }, null, 2));
  return { file: dest, ...proof };
}
async function main() {
  const [command, input, output] = process.argv.slice(2);
  if (command === 'doctor') { console.log(JSON.stringify({ ffmpeg: requireTool('ffmpeg'), ffprobe: requireTool('ffprobe') })); return; }
  if (command === 'download') { console.log(await downloadMedia(input, localFile(process.cwd(), output))); return; }
  if (command === 'verify') { console.log(JSON.stringify(await verifyVideo(path.resolve(input)))); return; }
  if (command === 'render') { const file = path.resolve(input || 'video-plan.json'); const plan = JSON.parse(fs.readFileSync(file, 'utf8')); console.log(JSON.stringify(await renderVideo(path.dirname(file), plan))); return; }
  throw Error('Usage: node video-tools.mjs doctor | download HTTPS_URL relative-file | render video-plan.json | verify video-final.mp4');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message); process.exitCode = 1; });
