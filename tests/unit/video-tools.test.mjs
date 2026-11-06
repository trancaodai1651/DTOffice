import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateVideoPlan, localFile, publicMediaUrl, verifyVideo, captionImage } from '../../server/video-tools.mjs';
import { findMediaTool, mediaEnvironment } from '../../server/media-tools.mjs';

test('Vietnamese captions render literal markup, wrap and fit without FFmpeg drawtext', async () => {
  const sharp = (await import('sharp')).default;
  for (const text of ['Tiếng Việt <b> & "100%" · vàng\nDòng thứ hai', 'Nhân sự được giao việc '.repeat(50)]) {
    const png = await captionImage(text, 320, 568), meta = await sharp(png).metadata();
    assert.equal(meta.format, 'png'); assert.equal(meta.channels, 4);
    assert.ok(meta.width <= 320 && meta.height <= 568);
    const pixels = await sharp(png).raw().toBuffer();
    assert.ok(pixels.some((n, i) => i % 4 !== 3 && n > 200), 'caption has visible white glyphs');
  }
  const blank = await sharp(await captionImage('', 320, 568)).raw().toBuffer();
  assert.equal(blank[3], 0);
});

test('video manifest requires licensed media, bounded durations and valid output dimensions', () => {
  assert.deepEqual(validateVideoPlan({ scenes: [{ type: 'title', duration: 5, text: 'Tiếng Việt' }] }), { size: [1080, 1920], duration: 5 });
  assert.throws(() => validateVideoPlan({ scenes: [{ type: 'clip', file: 'x.mp4', duration: 5 }] }), /source and license/);
  assert.throws(() => validateVideoPlan({ size: [1, 99999], scenes: [{ type: 'title', duration: 2 }] }), /dimensions/);
  assert.throws(() => validateVideoPlan({ scenes: [{ type: 'title', duration: 999999 }] }), /duration/);
});
test('media stays inside the job folder, empty exports fail and private downloads are rejected', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'office-video-'));
  try {
    assert.throws(() => localFile(dir, '../secret.mp4'), /job folder/);
    await assert.rejects(verifyVideo(path.join(dir, 'missing.mp4')), /No completed MP4/);
    await assert.rejects(publicMediaUrl('http://example.com/a.mp4'), /HTTPS/);
    await assert.rejects(publicMediaUrl('https://127.0.0.1/a.mp4'), /Private/);
    const bin = path.join(dir, 'vendor', 'ffmpeg', 'win32-x64'); fs.mkdirSync(bin, { recursive: true }); fs.writeFileSync(path.join(bin, 'ffmpeg.exe'), 'test');
    assert.equal(findMediaTool('ffmpeg', { root: dir, platform: 'win32', arch: 'x64', env: { PATH: '' } }), path.join(bin, 'ffmpeg.exe'));
    const original = 'keep-original-tools', env = mediaEnvironment({ Path: original, OFFICE_FFMPEG: path.join(bin, 'ffmpeg.exe') });
    assert.equal(env.PATH, `${bin}${path.delimiter}${original}`); assert.equal(env.Path, undefined);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
