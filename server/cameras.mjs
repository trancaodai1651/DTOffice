// "Phòng camera": Dahua cameras (and Dahua-made NVR/DVR channels: Imou, KBVision…) on the local network, watched in the
// office. Each camera: its LAN address, HTTP port (80), user and password, channel (1 for a camera; the NVR's channel
// number). The page shows each one by its snapshot (cgi-bin/snapshot.cgi, refreshed about once a second) or, when asked,
// its MJPEG stream (cgi-bin/mjpg/video.cgi, sub stream: it must be set to MJPEG in the camera's own settings). Both go
// through this computer with HTTP Digest authentication, so the browser never holds the password.
// Kept in data/cameras.json on this computer only; the password is never sent to the page.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { digestGet, isLanHost } from './lan-proto.mjs';

const clip = (s, n) => String(s ?? '').trim().slice(0, n);
export const snapPath = (ch = 1) => `/cgi-bin/snapshot.cgi?channel=${Math.max(1, Math.min(256, Math.round(Number(ch) || 1)))}`;
export const mjpegPath = (ch = 1, sub = 1) => `/cgi-bin/mjpg/video.cgi?channel=${Math.max(1, Math.min(256, Math.round(Number(ch) || 1)))}&subtype=${sub ? 1 : 0}`;

/**
 * @param {{ dataDir: string, now?: () => number, get?: typeof digestGet }} o
 */
export function createCameras({ dataDir, now = Date.now, get = digestGet }) {
  const file = path.join(dataDir, 'cameras.json');
  let list = [];
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); list = Array.isArray(j.cameras) ? j.cameras : []; } catch { /* first time */ }
  const save = () => { try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ cameras: list }, null, 1)); } catch { /* best effort */ } };
  const pub = (c) => ({ id: c.id, name: c.name, ip: c.ip, port: c.port, channel: c.channel, user: c.user, hasPassword: !!c.pass, at: c.at });
  const find = (id) => list.find((c) => c.id === id);
  return {
    out: () => ({ cameras: list.map(pub) }),
    add(b = {}) {
      const ip = clip(b.ip, 64), port = Math.round(Number(b.port) || 80);
      if (!isLanHost(ip)) return { ok: false, code: 'notLan' };
      if (port < 1 || port > 65535) return { ok: false, code: 'badPort' };
      if (list.length >= 64) return { ok: false, code: 'full' };
      const c = { id: crypto.randomUUID().slice(0, 8), name: clip(b.name, 60) || `Camera ${list.length + 1}`, ip, port, channel: Math.max(1, Math.min(256, Math.round(Number(b.channel) || 1))), user: clip(b.user, 60) || 'admin', pass: String(b.pass ?? '').slice(0, 120), at: now() };
      list.push(c); save(); return { ok: true, camera: pub(c) };
    },
    /** Name, channel, user or password changed (an empty password keeps the old one). */
    edit(id, b = {}) {
      const c = find(id); if (!c) return { ok: false, code: 'notFound' };
      if (b.name !== undefined && clip(b.name, 60)) c.name = clip(b.name, 60);
      if (b.channel !== undefined) c.channel = Math.max(1, Math.min(256, Math.round(Number(b.channel) || 1)));
      if (b.user !== undefined && clip(b.user, 60)) c.user = clip(b.user, 60);
      if (b.pass) c.pass = String(b.pass).slice(0, 120);
      save(); return { ok: true, camera: pub(c) };
    },
    remove(id) { const n = list.length; list = list.filter((c) => c.id !== id); save(); return n !== list.length; },
    /** One picture: { ok, type, body } or { ok: false, code } (auth: wrong user/password; offline; notImage). */
    async snapshot(id) {
      const c = find(id); if (!c) return { ok: false, code: 'notFound' };
      try {
        const res = await get({ host: c.ip, port: c.port, path: snapPath(c.channel), user: c.user, pass: c.pass, timeout: 6000 });
        const chunks = []; for await (const d of res) chunks.push(d);
        const type = String(res.headers['content-type'] || '');
        if (res.statusCode !== 200 || !/image\//i.test(type)) return { ok: false, code: res.statusCode === 404 ? 'noSnapshot' : 'notImage' };
        return { ok: true, type, body: Buffer.concat(chunks) };
      } catch (e) { return { ok: false, code: e.code === 'auth' ? 'auth' : e.code === 'timeout' ? 'timeout' : 'offline' }; }
    },
    /** The MJPEG stream, piped to `res` until the page goes away. false (and nothing written) when it can't be had. */
    async stream(id, res, sub = 1) {
      const c = find(id); if (!c) return { ok: false, code: 'notFound' };
      try {
        const up = await get({ host: c.ip, port: c.port, path: mjpegPath(c.channel, sub), user: c.user, pass: c.pass, timeout: 8000 });
        const type = String(up.headers['content-type'] || '');
        if (up.statusCode !== 200 || !/multipart/i.test(type)) { up.resume(); up.abort(); return { ok: false, code: 'noMjpeg' }; }
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        up.pipe(res);
        res.on('close', () => up.abort());
        return { ok: true };
      } catch (e) { return { ok: false, code: e.code === 'auth' ? 'auth' : e.code === 'timeout' ? 'timeout' : 'offline' }; }
    },
  };
}
