// "Phòng in 3D": the filament the CEO keeps (kho nhựa in) and the 3D printers on the local network.
//   filaments  what is in stock: material (PLA, PETG…), brand (Bambu Lab, Cailab…), colour, number of spools, weight
//   printers   each printer by its LAN address:
//     bambu       Bambu Lab (A1, A1 mini, P1, X1) in LAN mode: MQTT over TLS on 8883 (user "bblp", the printer's LAN
//                 access code) for its state and commands; the file goes to its SD card by FTPS (port 990)
//     flashforge  Flashforge Adventurer 5M / 5M Pro (and later) on its HTTP API, port 8898 (serial number + check code
//                 shown on the printer) or, without a check code, the older TCP protocol on port 8899 (Adventurer 3/4,
//                 Finder, Guider, and the 5M in LAN mode)
//   Each printer's state: free / printing / paused / done (free, its plate to clear) / error / offline, how far its print
//   is (%), the time left, the file. A G-code file sent to a free printer starts printing.
// Kept in data/print-farm.json, on this computer only. The access/check codes stay there and are never sent to the page.
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { mqttTls, ftpsUpload, crc32, isLanHost } from './lan-proto.mjs';

export const MATERIALS = ['PLA', 'PLA+', 'PLA Silk', 'PLA Matte', 'PLA-CF', 'PETG', 'PETG-CF', 'ABS', 'ASA', 'TPU', 'PA', 'PA-CF', 'PC', 'PVA', 'HIPS', 'Khác'];
export const BRANDS = ['Bambu Lab', 'Cailab', 'Flashforge', 'eSUN', 'Sunlu', 'Polymaker', 'Elegoo', 'Creality', 'Kingroon', 'Jayo', 'Overture', 'Anycubic', 'Khác'];
export const KINDS = ['bambu', 'flashforge'];
const clip = (s, n) => String(s ?? '').trim().slice(0, n);
const hex = (c) => (/^#[0-9a-f]{6}$/i.test(String(c || '')) ? String(c).toUpperCase() : '#9AA3B0');

/* ---------- what a printer said, as one shape ---------- */
/** Bambu's report ("print" object, merged over time) -> the printer's state. */
export function bambuState(p = {}) {
  const g = String(p.gcode_state || '').toUpperCase();
  const state = g === 'RUNNING' || g === 'PREPARE' || g === 'SLICING' ? 'printing' : g === 'PAUSE' ? 'paused' : g === 'FINISH' ? 'done' : g === 'FAILED' ? 'error' : g === 'IDLE' || g === '' ? 'free' : 'busy';
  const pct = Number(p.mc_percent);
  return { state, percent: Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : null, left: Number.isFinite(Number(p.mc_remaining_time)) ? Number(p.mc_remaining_time) : null,
    file: clip(p.subtask_name || p.gcode_file || '', 120), nozzle: Number(p.nozzle_temper) || null, bed: Number(p.bed_temper) || null, layer: Number(p.layer_num) || null, layers: Number(p.total_layer_num) || null,
    error: Number(p.print_error) ? String(p.print_error) : '' };
}
/** Flashforge's HTTP /detail -> the printer's state. */
export function flashforgeHttpState(d = {}) {
  const s = String(d.status || '').toLowerCase();
  const state = /printing|heating|busy/.test(s) ? 'printing' : /paus/.test(s) ? 'paused' : /complete/.test(s) ? 'done' : /error|fail/.test(s) ? 'error' : /ready|idle|cancel/.test(s) ? 'free' : s ? 'busy' : 'free';
  const pr = Number(d.printProgress);
  return { state, percent: Number.isFinite(pr) ? Math.round((pr <= 1 ? pr * 100 : pr) * 10) / 10 : null, left: Number.isFinite(Number(d.estimatedTime)) && Number(d.estimatedTime) > 0 ? Math.round(Number(d.estimatedTime) / 60) : null,
    file: clip(d.printFileName || '', 120), nozzle: Number(d.rightTemp ?? d.nozzleTemp) || null, bed: Number(d.platTemp ?? d.bedTemp) || null, layer: Number(d.printLayer) || null, layers: Number(d.targetPrintLayer) || null, error: d.errorCode && d.errorCode !== '0' ? String(d.errorCode) : '' };
}
/** Flashforge's TCP replies (~M119 and ~M27) -> the printer's state. */
export function flashforgeTcpState(m119 = '', m27 = '') {
  const s = (/MachineStatus:\s*(\w+)/i.exec(m119)?.[1] || '').toUpperCase(), pm = /(\d+)\s*\/\s*(\d+)/.exec(m27);
  const state = s === 'BUILDING_FROM_SD' || s === 'BUILDING' ? 'printing' : s === 'PAUSED' ? 'paused' : s === 'BUILDING_COMPLETED' ? 'done' : s === 'READY' ? 'free' : s ? 'busy' : 'free';
  return { state, percent: pm && Number(pm[2]) ? Math.round((Number(pm[1]) / Number(pm[2])) * 1000) / 10 : null, left: null, file: clip(/CurrentFile:\s*(.*)/i.exec(m119)?.[1] || '', 120), nozzle: null, bed: null, layer: null, layers: null, error: '' };
}

/* ---------- Bambu Lab ---------- */
// one MQTT link per printer, kept while the page looks at it (closed after a few idle minutes)
function bambuLink(pr, { connect = mqttTls, idleMs = 180_000 } = {}) {
  let link = null, report = {}, at = 0, err = '', idle = null, opening = null;
  const topic = (k) => `device/${pr.serial}/${k}`;
  const keep = () => { clearTimeout(idle); idle = setTimeout(() => { link?.close(); link = null; }, idleMs); };
  async function open() {
    if (link) return link;
    if (opening) return opening;
    opening = connect({ host: pr.ip, username: 'bblp', password: pr.code, onMessage: (t, payload) => {
      try { const j = JSON.parse(payload.toString('utf8')); if (j.print) { report = { ...report, ...j.print }; at = Date.now(); err = ''; } } catch { /* not JSON */ }
    } }).then((l) => {
      link = l; opening = null;
      l.onClose(() => { if (link === l) link = null; });
      l.subscribe(topic('report'));
      l.publish(topic('request'), { pushing: { sequence_id: '0', command: 'pushall' } });   // (the full state now; changes come by themselves)
      return l;
    }, (e) => { opening = null; err = e.code || 'net'; throw e; });
    return opening;
  }
  return {
    async status() {
      keep();
      try { await open(); } catch (e) { return { ...bambuState({}), state: 'offline', why: e.code || 'net' }; }
      if (!at) await new Promise((r) => setTimeout(r, 1500));   // (the first report, just asked for)
      return at ? { ...bambuState(report), at } : { ...bambuState({}), state: 'offline', why: err || 'noReport' };
    },
    async print(file, name) {
      const remote = name.replace(/[^\w.-]+/g, '_');
      await ftpsUpload({ host: pr.ip, user: 'bblp', pass: pr.code, file, remote });
      const l = await open(); keep();
      l.publish(topic('request'), { print: { sequence_id: '0', command: 'gcode_file', param: `${pr.storage || '/sdcard/'}${remote}` } });
      return { ok: true, file: remote };
    },
    close() { clearTimeout(idle); link?.close(); link = null; },
  };
}

/* ---------- Flashforge ---------- */
const FF_HTTP = 8898, FF_TCP = 8899;
async function ffHttp(pr, route, body, headers = {}) {
  const r = await fetch(`http://${pr.ip}:${FF_HTTP}${route}`, { method: 'POST', headers, body, signal: AbortSignal.timeout(route === '/uploadGcode' ? 300_000 : 6000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j.code !== undefined && Number(j.code) !== 0)) throw Object.assign(new Error(j.message || `HTTP ${r.status}`), { code: Number(j.code) === 1 ? 'auth' : 'net' });
  return j;
}
/** One TCP conversation: each command ("~M119") answered by its reply (up to its "ok"); `pre`: raw bytes sent just before it. */
export function ffTcp(ip, steps, { port = FF_TCP, timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host: ip, port }); const out = []; let buf = '', i = -1, t;
    const fail = (e) => { clearTimeout(t); sock.destroy(); reject(Object.assign(e, { code: e.code === 'ECONNREFUSED' || e.code === 'EHOSTUNREACH' ? 'offline' : e.code || 'net' })); };
    const next = () => {
      clearTimeout(t); i++;
      if (i >= steps.length) { sock.end(); resolve(out); return; }
      t = setTimeout(() => fail(Object.assign(new Error('timeout'), { code: 'timeout' })), steps[i].timeout || timeout);
      if (steps[i].pre) sock.write(steps[i].pre);   // (a file's packets, before the command that closes it)
      sock.write(`${steps[i].cmd}\r\n`);
    };
    sock.on('connect', next);
    sock.on('data', (d) => { buf += d.toString('latin1'); if (/(^|\n)ok\s*$/.test(buf)) { out.push(buf); buf = ''; next(); } });
    sock.on('error', fail);
  });
}
/** The file as Flashforge's TCP upload wants it: 4096-byte packets, each with a header (magic, index, length, CRC-32). */
export function ffPackets(data) {
  const parts = [];
  for (let k = 0, off = 0; off < data.length; k++, off += 4096) {
    const chunk = data.subarray(off, off + 4096), head = Buffer.alloc(16);
    head.writeUInt32BE(0x5a5aa5a5, 0); head.writeUInt32BE(k, 4); head.writeUInt32BE(chunk.length, 8); head.writeUInt32BE(crc32(chunk), 12);
    parts.push(head, chunk.length < 4096 ? Buffer.concat([chunk, Buffer.alloc(4096 - chunk.length)]) : chunk);
  }
  return Buffer.concat(parts);
}
function flashforgeLink(pr) {
  const http = !!(pr.serial && pr.code), auth = () => ({ serialNumber: pr.serial, checkCode: pr.code });
  return {
    async status() {
      try {
        if (http) { const j = await ffHttp(pr, '/detail', JSON.stringify(auth()), { 'Content-Type': 'application/json' }); return { ...flashforgeHttpState(j.detail || {}), at: Date.now() }; }
        const [, m119, m27] = await ffTcp(pr.ip, [{ cmd: '~M601 S1' }, { cmd: '~M119' }, { cmd: '~M27' }]);
        return { ...flashforgeTcpState(m119, m27), at: Date.now() };
      } catch (e) { return { ...flashforgeTcpState(), state: 'offline', why: e.code || 'net' }; }
    },
    async print(file, name) {
      const remote = name.replace(/[^\w.-]+/g, '_'), data = fs.readFileSync(file);
      if (http) {
        const form = new FormData();
        form.append('gcodeFile', new Blob([data]), remote);
        await ffHttp(pr, '/uploadGcode', form, { serialNumber: pr.serial, checkCode: pr.code, fileSize: String(data.length), printNow: 'true', levelingBeforePrint: 'true', flowCalibration: 'false', useMatlStation: 'false', gcodeToolCnt: '0', materialMappings: Buffer.from('[]').toString('base64') });
        return { ok: true, file: remote };
      }
      await ffTcp(pr.ip, [{ cmd: '~M601 S1' }, { cmd: `~M28 ${data.length} 0:/user/${remote}` }, { cmd: '~M29', pre: ffPackets(data), timeout: 300_000 }, { cmd: `~M23 0:/user/${remote}` }], { timeout: 15_000 });
      return { ok: true, file: remote };
    },
    close() {},
  };
}

/**
 * @param {{ dataDir: string, now?: () => number, links?: { bambu?: Function, flashforge?: Function } }} o
 */
export function createPrintFarm({ dataDir, now = Date.now, links = {} }) {
  const file = path.join(dataDir, 'print-farm.json');
  let st = { filaments: [], printers: [] };
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); st = { filaments: Array.isArray(j.filaments) ? j.filaments : [], printers: Array.isArray(j.printers) ? j.printers : [] }; } catch { /* first time */ }
  const save = () => { try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(st, null, 1)); } catch { /* best effort */ } };
  const open = new Map();   // printer id -> its link
  const last = new Map();   // printer id -> its last state
  const linkOf = (pr) => { if (!open.has(pr.id)) open.set(pr.id, (pr.kind === 'bambu' ? links.bambu || bambuLink : links.flashforge || flashforgeLink)(pr)); return open.get(pr.id); };
  const pubPrinter = (p) => ({ id: p.id, name: p.name, kind: p.kind, model: p.model, ip: p.ip, serial: p.serial ? `…${String(p.serial).slice(-4)}` : '', hasCode: !!p.code, mode: p.kind === 'flashforge' ? (p.serial && p.code ? 'http' : 'tcp') : 'mqtt', state: last.get(p.id) || null });
  return {
    MATERIALS, BRANDS, KINDS,
    out: () => ({ filaments: st.filaments, printers: st.printers.map(pubPrinter), materials: MATERIALS, brands: BRANDS }),
    /* ---- the filament stock ---- */
    addFilament(b = {}) {
      const material = clip(b.material, 30), brand = clip(b.brand, 40), color = clip(b.color, 40), qty = Math.round(Number(b.qty));
      if (!material || !brand || !color) return { ok: false, code: 'missing' };
      if (!Number.isFinite(qty) || qty < 0 || qty > 100_000) return { ok: false, code: 'badQty' };
      const same = st.filaments.find((f) => f.material === material && f.brand === brand && f.color.toLowerCase() === color.toLowerCase() && (f.weight || 0) === (Number(b.weight) || 0));
      if (same) { same.qty += qty; same.at = now(); save(); return { ok: true, filament: same, merged: true }; }   // (the same kind again: its count goes up)
      if (st.filaments.length >= 1000) return { ok: false, code: 'full' };
      const f = { id: crypto.randomUUID().slice(0, 8), material, brand, color, hex: hex(b.hex), qty, weight: Math.max(0, Math.round(Number(b.weight) || 0)), note: clip(b.note, 200), at: now() };
      st.filaments.push(f); save(); return { ok: true, filament: f };
    },
    /** Changes a filament's count by `delta` (used or bought), or sets fields; never below 0. */
    editFilament(id, b = {}) {
      const f = st.filaments.find((x) => x.id === id); if (!f) return { ok: false, code: 'notFound' };
      if (b.delta !== undefined) { const d = Math.round(Number(b.delta)); if (!Number.isFinite(d)) return { ok: false, code: 'badQty' }; f.qty = Math.max(0, f.qty + d); }
      if (b.qty !== undefined) { const q = Math.round(Number(b.qty)); if (!Number.isFinite(q) || q < 0) return { ok: false, code: 'badQty' }; f.qty = q; }
      for (const k of ['material', 'brand', 'color', 'note']) if (b[k] !== undefined && clip(b[k], k === 'note' ? 200 : 40)) f[k] = clip(b[k], k === 'note' ? 200 : 40);
      if (b.hex !== undefined) f.hex = hex(b.hex);
      if (b.weight !== undefined) f.weight = Math.max(0, Math.round(Number(b.weight) || 0));
      f.at = now(); save(); return { ok: true, filament: f };
    },
    removeFilament(id) { const n = st.filaments.length; st.filaments = st.filaments.filter((f) => f.id !== id); save(); return n !== st.filaments.length; },
    /* ---- the printers ---- */
    addPrinter(b = {}) {
      const kind = KINDS.includes(b.kind) ? b.kind : '', ip = clip(b.ip, 64);
      if (!kind) return { ok: false, code: 'badKind' };
      if (!isLanHost(ip)) return { ok: false, code: 'notLan' };
      if (kind === 'bambu' && (!clip(b.serial, 40) || !clip(b.code, 40))) return { ok: false, code: 'bambuNeeds' };
      if (st.printers.length >= 50) return { ok: false, code: 'full' };
      const p = { id: crypto.randomUUID().slice(0, 8), kind, name: clip(b.name, 60) || (kind === 'bambu' ? 'Bambu Lab A1' : 'Flashforge'), model: clip(b.model, 40), ip, serial: clip(b.serial, 40), code: clip(b.code, 40), storage: kind === 'bambu' ? (clip(b.storage, 60) || '/sdcard/') : '', at: now() };
      st.printers.push(p); save(); return { ok: true, printer: pubPrinter(p) };
    },
    removePrinter(id) { open.get(id)?.close(); open.delete(id); last.delete(id); const n = st.printers.length; st.printers = st.printers.filter((p) => p.id !== id); save(); return n !== st.printers.length; },
    /** Every printer's state, asked now (side by side). */
    async refresh() {
      await Promise.all(st.printers.map(async (p) => { try { last.set(p.id, await linkOf(p).status()); } catch (e) { last.set(p.id, { state: 'offline', why: e.code || 'net' }); } }));
      return st.printers.map(pubPrinter);
    },
    /** A G-code file (already on this computer) to a printer: refused when it is not free. */
    async print(id, fileOnDisk, name) {
      const p = st.printers.find((x) => x.id === id); if (!p) return { ok: false, code: 'notFound' };
      if (!/\.(gcode|gco|g|3mf)$/i.test(name)) return { ok: false, code: 'notGcode' };
      const s = await linkOf(p).status(); last.set(p.id, s);
      if (s.state === 'offline') return { ok: false, code: 'offline' };
      if (!['free', 'done'].includes(s.state)) return { ok: false, code: 'busy' };
      try { const r = await linkOf(p).print(fileOnDisk, name); last.set(p.id, { ...s, state: 'printing', percent: 0, file: r.file }); return { ok: true, file: r.file }; }
      catch (e) { return { ok: false, code: e.code === 'auth' ? 'auth' : 'sendFail', why: String(e.message || '').slice(0, 200) }; }
    },
    /** A temporary file for an upload on its way. */
    tempFile: (name) => path.join(os.tmpdir(), `dto-print-${crypto.randomUUID().slice(0, 8)}-${String(name).replace(/[^\w.-]+/g, '_').slice(-80)}`),
    close() { for (const l of open.values()) l.close(); open.clear(); },
  };
}
