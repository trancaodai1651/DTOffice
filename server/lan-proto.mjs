// Small clients for devices on the local network, with no dependency: what the print room and the camera room need.
//   mqttTls      an MQTT 3.1.1 client over TLS (QoS 0): Bambu Lab printers report and take commands on port 8883
//   ftpsUpload   one file sent by implicit FTPS (port 990, TLS on the data channel too): Bambu Lab's SD card
//   digestGet    an HTTP GET with Digest (or Basic) authentication: Dahua cameras' snapshot and MJPEG stream
//   crc32        for Flashforge's file packets
// The devices use self-signed certificates on the LAN: they are not checked (a local address only, never the internet).
import tls from 'node:tls';
import net from 'node:net';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';

/* ---------- MQTT ---------- */
const str = (s) => { const b = Buffer.from(String(s), 'utf8'); const h = Buffer.alloc(2); h.writeUInt16BE(b.length); return Buffer.concat([h, b]); };
export function mqttLength(n) {
  const out = [];
  do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; out.push(b); } while (n > 0);
  return Buffer.from(out);
}
export const mqttPacket = (type, body) => Buffer.concat([Buffer.from([type]), mqttLength(body.length), body]);
export const mqttConnect = ({ clientId, username, password, keepAlive = 60 }) => {
  const flags = (username ? 0x80 : 0) | (password ? 0x40 : 0) | 0x02;
  const head = Buffer.concat([str('MQTT'), Buffer.from([4, flags, keepAlive >> 8, keepAlive & 255])]);
  return mqttPacket(0x10, Buffer.concat([head, str(clientId), ...(username ? [str(username)] : []), ...(password ? [str(password)] : [])]));
};
export const mqttSubscribe = (id, topic) => mqttPacket(0x82, Buffer.concat([Buffer.from([id >> 8, id & 255]), str(topic), Buffer.from([0])]));
export const mqttPublish = (topic, payload) => mqttPacket(0x30, Buffer.concat([str(topic), Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload))]));
/** Splits a stream's bytes into packets: [{ type, flags, body }], and what is left over (an incomplete packet). */
export function mqttParse(buf) {
  const out = [];
  let i = 0;
  while (i + 2 <= buf.length) {
    let len = 0, mul = 1, j = i + 1, done = false;
    for (; j < buf.length && j < i + 5; j++) { len += (buf[j] & 127) * mul; mul *= 128; if (!(buf[j] & 128)) { done = true; j++; break; } }
    if (!done || j + len > buf.length) break;
    out.push({ type: buf[i] >> 4, flags: buf[i] & 15, body: buf.subarray(j, j + len) });
    i = j + len;
  }
  return { packets: out, rest: buf.subarray(i) };
}
/** A PUBLISH packet's topic and payload. */
export function mqttMessage(p) {
  const tl = p.body.readUInt16BE(0), topic = p.body.subarray(2, 2 + tl).toString('utf8'), qos = (p.flags >> 1) & 3;
  return { topic, payload: p.body.subarray(2 + tl + (qos ? 2 : 0)) };
}
/**
 * A connection: resolves once the broker accepted it; onMessage(topic, payload) for each message.
 * @returns {Promise<{ publish: (topic: string, payload: any) => void, subscribe: (topic: string) => void, close: () => void, onClose: (fn: () => void) => void }>}
 */
export function mqttTls({ host, port = 8883, username, password, clientId = `dto-${crypto.randomUUID().slice(0, 8)}`, onMessage = () => {}, timeout = 8000 }) {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host, port, rejectUnauthorized: false, servername: net.isIP(host) ? undefined : host });
    let rest = Buffer.alloc(0), ok = false, pid = 1, ping = null;
    const closers = [];
    const fail = (e) => { clearTimeout(t); if (!ok) reject(e); sock.destroy(); };
    const t = setTimeout(() => fail(Object.assign(new Error('timeout'), { code: 'timeout' })), timeout);
    sock.setNoDelay(true);
    sock.on('secureConnect', () => sock.write(mqttConnect({ clientId, username, password })));
    sock.on('data', (d) => {
      const r = mqttParse(Buffer.concat([rest, d])); rest = Buffer.from(r.rest);
      for (const p of r.packets) {
        if (p.type === 2) {   // CONNACK
          clearTimeout(t);
          if (p.body[1] !== 0) { fail(Object.assign(new Error('refused'), { code: p.body[1] === 4 || p.body[1] === 5 ? 'auth' : 'refused' })); return; }
          ok = true; ping = setInterval(() => { try { sock.write(Buffer.from([0xc0, 0])); } catch { /* closed */ } }, 30_000);
          resolve({
            publish: (topic, payload) => sock.write(mqttPublish(topic, payload)),
            subscribe: (topic) => sock.write(mqttSubscribe(pid++, topic)),
            close: () => { clearInterval(ping); sock.end(); sock.destroy(); },
            onClose: (fn) => closers.push(fn),
          });
        } else if (p.type === 3) { try { const m = mqttMessage(p); onMessage(m.topic, m.payload); } catch { /* a broken message */ } }
      }
    });
    sock.on('error', (e) => fail(Object.assign(e, { code: e.code || 'net' })));
    sock.on('close', () => { clearInterval(ping); clearTimeout(t); if (!ok) reject(Object.assign(new Error('closed'), { code: 'net' })); for (const fn of closers) fn(); });
  });
}

/* ---------- FTPS (implicit) ---------- */
/** Sends a local file to `remote` (a name in the printer's storage root). Resolves when the server confirmed it. */
export function ftpsUpload({ host, port = 990, user, pass, file, remote, timeout = 20_000 }) {
  return new Promise((resolve, reject) => {
    const ctl = tls.connect({ host, port, rejectUnauthorized: false });
    let buf = '', step = 0, data = null, settled = false, waiting = null;
    const done = (e) => { if (settled) return; settled = true; clearTimeout(t); try { ctl.write('QUIT\r\n'); } catch { /* gone */ } ctl.destroy(); data?.destroy(); e ? reject(e) : resolve(true); };
    let t = setTimeout(() => done(Object.assign(new Error('timeout'), { code: 'timeout' })), timeout);
    const bump = () => { clearTimeout(t); t = setTimeout(() => done(Object.assign(new Error('timeout'), { code: 'timeout' })), timeout); };
    const send = (cmd) => { bump(); ctl.write(`${cmd}\r\n`); };
    // the server's replies, one complete reply (multi-line ones end on "NNN ") at a time
    function reply(code, text) {
      if (code >= 400) { done(Object.assign(new Error(text), { code: code === 530 ? 'auth' : 'ftp' })); return; }
      if (step === 0 && code === 220) { step = 1; send(`USER ${user}`); }
      else if (step === 1 && (code === 331 || code === 230)) { step = 2; if (code === 230) reply(230, ''); else send(`PASS ${pass}`); }
      else if (step === 2 && code === 230) { step = 3; send('PBSZ 0'); }
      else if (step === 3 && code === 200) { step = 4; send('PROT P'); }
      else if (step === 4 && code === 200) { step = 5; send('TYPE I'); }
      else if (step === 5 && code === 200) { step = 6; send('PASV'); }
      else if (step === 6 && code === 227) {
        const m = /(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/.exec(text); if (!m) { done(Object.assign(new Error('pasv'), { code: 'ftp' })); return; }
        const dport = Number(m[5]) * 256 + Number(m[6]);
        // (the address it gives may be its own idea of itself: the one we reached it at is used)
        data = tls.connect({ host, port: dport, rejectUnauthorized: false, session: ctl.getSession() });
        data.on('error', (e) => done(Object.assign(e, { code: 'net' })));
        data.on('secureConnect', () => { step = 7; send(`STOR ${remote}`); });
      } else if (step === 7 && (code === 150 || code === 125)) {
        step = 8; const rs = fs.createReadStream(file);
        rs.on('data', () => bump());
        rs.on('error', (e) => done(Object.assign(e, { code: 'file' })));
        rs.pipe(data);
      } else if (step === 8 && code === 226) done();
      else if (waiting) waiting();
    }
    ctl.on('data', (d) => {
      buf += d.toString('utf8');
      for (;;) {
        const m = /^(\d{3}) ([^\r\n]*)\r?\n/m.exec(buf); if (!m) break;
        const text = buf.slice(0, m.index + m[0].length); buf = buf.slice(m.index + m[0].length);
        reply(Number(m[1]), text);
      }
    });
    ctl.on('error', (e) => done(Object.assign(e, { code: e.code || 'net' })));
  });
}

/* ---------- HTTP Digest ---------- */
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
/** The fields of a "Digest realm=…, nonce=…" challenge. */
export function parseChallenge(h) {
  const out = { scheme: String(h || '').split(/\s+/)[0].toLowerCase() };
  for (const m of String(h || '').matchAll(/(\w+)=(?:"([^"]*)"|([^,\s]*))/g)) out[m[1].toLowerCase()] = m[2] ?? m[3];
  return out;
}
/** The Authorization header answering a challenge. */
export function digestHeader({ challenge, method = 'GET', uri, user, pass, nc = 1, cnonce = crypto.randomBytes(8).toString('hex') }) {
  const c = parseChallenge(challenge);
  if (c.scheme === 'basic') return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  const qop = (c.qop || '').split(',').map((x) => x.trim()).find((x) => x === 'auth'), n = nc.toString(16).padStart(8, '0');
  let ha1 = md5(`${user}:${c.realm}:${pass}`);
  if (/md5-sess/i.test(c.algorithm || '')) ha1 = md5(`${ha1}:${c.nonce}:${cnonce}`);
  const ha2 = md5(`${method}:${uri}`), response = qop ? md5(`${ha1}:${c.nonce}:${n}:${cnonce}:${qop}:${ha2}`) : md5(`${ha1}:${c.nonce}:${ha2}`);
  return [`Digest username="${user}"`, `realm="${c.realm}"`, `nonce="${c.nonce}"`, `uri="${uri}"`, `response="${response}"`, ...(c.opaque ? [`opaque="${c.opaque}"`] : []), ...(c.algorithm ? [`algorithm=${c.algorithm}`] : []), ...(qop ? [`qop=${qop}`, `nc=${n}`, `cnonce="${cnonce}"`] : [])].join(', ');
}
/**
 * A GET that answers a 401 challenge once; resolves with the response (its body not read yet) or rejects.
 * @returns {Promise<import('node:http').IncomingMessage & { abort: () => void }>}
 */
export function digestGet({ host, port = 80, path: p, user = '', pass = '', timeout = 8000 }) {
  const once = (auth) => new Promise((resolve, reject) => {
    const req = http.request({ host, port, path: p, method: 'GET', headers: { ...(auth ? { Authorization: auth } : {}), Connection: 'close' }, timeout }, (res) => { res.abort = () => req.destroy(); resolve(res); });
    req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'timeout' })));
    req.on('error', (e) => reject(Object.assign(e, { code: e.code === 'timeout' ? 'timeout' : 'net' })));
    req.end();
  });
  return once(null).then((res) => {
    if (res.statusCode !== 401) return res;
    const challenge = res.headers['www-authenticate']; res.resume();
    if (!challenge || !user) throw Object.assign(new Error('auth'), { code: 'auth' });
    return once(digestHeader({ challenge: Array.isArray(challenge) ? challenge.find((x) => /digest/i.test(x)) || challenge[0] : challenge, uri: p, user, pass })).then((r) => {
      if (r.statusCode === 401) { r.resume(); throw Object.assign(new Error('auth'), { code: 'auth' }); }
      return r;
    });
  });
}

/* ---------- CRC-32 ---------- */
const TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
export function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

/** Is this an address on a local network (private, link-local or loopback IPv4, or a ".local" name)? */
export function isLanHost(h) {
  h = String(h || '').trim().toLowerCase();
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.local$/.test(h)) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h); if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([m[1], m[2], m[3], m[4]].some((x) => Number(x) > 255)) return false;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
}
