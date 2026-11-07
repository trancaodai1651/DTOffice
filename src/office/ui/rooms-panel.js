// "Phòng in 3D" and "Phòng camera": a dialog over the office for each (server/print-farm.mjs, server/cameras.mjs).
//   print   the filament stock (material, brand, colour, spools: added, used, removed) and the printers on the LAN (free or
//           printing, how far, a G-code file sent to a free one); the printers are asked every 10 s while it is open
//   camera  the Dahua cameras on the LAN, each a snapshot refreshed every second, or its MJPEG stream; full screen on click
// Both work on the computer running the office only (the server refuses them from a phone).
import { el } from '../core/env.js';
import { TOKEN } from '../net/live.js';
import { toast } from './activity.js';
import { t as tr } from '../../i18n/index.js';

const q = (extra = '') => { const p = new URLSearchParams(extra); if (TOKEN) p.set('k', TOKEN); const s = p.toString(); return s ? `?${s}` : ''; };
const get = (url) => fetch(`${url}${q()}`).then((x) => x.json()).catch(() => null);
const post = (url, body) => fetch(`${url}${q()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  .then((x) => x.json()).catch(() => ({ ok: false, message: tr('rooms.unreachable') }));
const button = (text, onClick, cls = 'rp-btn') => { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', onClick); return b; };
const field = (label, input, cls = '') => { const w = el('label', `rp-field ${cls}`.trim()); w.append(el('small', null, label), input); return w; };
const keepKeys = (n) => { n.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); }); return n; };
function input(type = 'text', ph = '', value = '') { const i = el('input'); i.type = type; i.placeholder = ph; i.value = value; return keepKeys(i); }
function select(items, value = '') { const s = keepKeys(el('select')); for (const [v, text] of items) { const o = el('option', null, text); o.value = v; if (v === value) o.selected = true; s.append(o); } return s; }
const mins = (m) => (m >= 60 ? tr('rooms.print.printers.hm', { h: Math.floor(m / 60), m: m % 60 }) : tr('rooms.print.printers.m', { m }));

let overlay = null, stopTimers = () => {};
export function closeRoom() { stopTimers(); stopTimers = () => {}; overlay?.remove(); overlay = null; }
/** Opens the room's dialog: 'print' or 'camera'. */
export function openRoom(kind) {
  closeRoom();
  overlay = el('div', 'rp-overlay'); overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
  const card = el('div', `rp-card is-${kind}`), head = el('div', 'rp-head'), body = el('div', 'rp-body');
  const title = el('b', null, `${kind === 'print' ? '🖨️' : '📷'} ${tr(`rooms.${kind}.title`)}`); title.tabIndex = -1;
  head.append(title, button('✕', closeRoom, 'zc-ib'));
  card.append(head, el('p', 'zc-task-note', tr(`rooms.${kind}.sub`)), body);
  overlay.append(card); document.body.append(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeRoom(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeRoom(); } });
  overlay.setAttribute('aria-label', tr(`rooms.${kind}.title`));
  title.focus({ preventScroll: true });
  (kind === 'print' ? printRoom : cameraRoom)(body);
}

/* ---------- the print room ---------- */
function printRoom(body) {
  let data = null, busy = false;
  const stock = el('details', 'lib-sec rp-sec'), printers = el('details', 'lib-sec rp-sec'); stock.open = printers.open = true;
  body.replaceChildren(el('p', 'zc-task-note', tr('rooms.loading')));
  async function act(url, b, msg) { const r = await post(url, b); if (!r?.ok) { toast(r?.message || tr('rooms.unreachable'), 6000); return null; } data = r; draw(); if (msg) toast(msg, 4000); return r; }
  async function load(status = false) {
    if (busy) return; busy = true;
    const r = await get(status ? '/api/print/status' : '/api/print'); busy = false;
    if (!overlay) return;
    if (!r?.ok) { body.replaceChildren(el('p', 'zc-task-note', r?.message || tr('rooms.unreachable')), button(tr('rooms.refresh'), () => load(true))); return; }
    data = r; data.checked = status ? new Date() : data.checked; draw();
  }
  function drawStock() {
    const total = data.filaments.reduce((n, f) => n + f.qty, 0), by = {};
    for (const f of data.filaments) by[f.material] = (by[f.material] || 0) + f.qty;
    stock.replaceChildren(el('summary', null, `🧵 ${tr('rooms.print.stock.title', { n: total })}`));
    if (Object.keys(by).length) stock.append(el('small', 'rp-note', tr('rooms.print.stock.byMaterial', { list: Object.entries(by).map(([m, n]) => `${m} ${n}`).join(' · ') })));
    // the form: what the CEO brought in
    const material = select(data.materials.map((m) => [m, m]), 'PLA'), brand = select(data.brands.map((b) => [b, b]), 'Bambu Lab');
    const color = input('text', tr('rooms.print.stock.colorPh')), hex = input('color', '', '#202020'), qty = input('number', '', '1'), weight = input('number', '', '1000'), note = input('text', tr('rooms.print.stock.notePh'));
    qty.min = '0'; weight.min = '0'; weight.step = '50';
    const form = el('div', 'rp-form');
    form.append(field(tr('rooms.print.stock.material'), material), field(tr('rooms.print.stock.brand'), brand), field(tr('rooms.print.stock.color'), color), field(tr('rooms.print.stock.hex'), hex, 'is-narrow'),
      field(tr('rooms.print.stock.qty'), qty, 'is-narrow'), field(tr('rooms.print.stock.weight'), weight, 'is-narrow'), field(tr('rooms.print.stock.note'), note),
      button(tr('rooms.print.stock.add'), async () => {
        const r = await act('/api/print/filament', { material: material.value, brand: brand.value, color: color.value, hex: hex.value, qty: qty.value, weight: weight.value, note: note.value });
        if (r) toast(tr(r.merged ? 'rooms.print.stock.merged' : 'rooms.print.stock.added'), 4000);
      }, 'rp-btn is-go'));
    stock.append(form);
    if (!data.filaments.length) { stock.append(el('p', 'zc-task-note', tr('rooms.print.stock.none'))); return; }
    const table = el('div', 'rp-stock');
    for (const f of [...data.filaments].sort((a, b) => a.material.localeCompare(b.material) || a.brand.localeCompare(b.brand) || a.color.localeCompare(b.color))) {
      const row = el('div', `rp-spool${f.qty === 0 ? ' is-out' : f.qty <= 1 ? ' is-low' : ''}`), dot = el('i', 'rp-dot'); dot.style.background = f.hex;
      const name = el('span', 'rp-spool-name'); name.append(el('b', null, `${f.material} · ${f.color}`), el('small', null, [f.brand, f.weight ? `${f.weight} g` : '', f.note].filter(Boolean).join(' · ')));
      const n = el('em', 'rp-qty', f.qty === 0 ? tr('rooms.print.stock.out') : `${f.qty}`);
      if (f.qty === 1) n.title = tr('rooms.print.stock.low');
      row.append(dot, name, n,
        button('−', () => act('/api/print/filament-edit', { id: f.id, delta: -1 }), 'zc-ib rp-step'),
        button('+', () => act('/api/print/filament-edit', { id: f.id, delta: 1 }), 'zc-ib rp-step'),
        button('🗑', () => act('/api/print/filament-remove', { id: f.id }), 'zc-ib rp-step'));
      row.querySelectorAll('.rp-step')[0].setAttribute('aria-label', tr('rooms.print.stock.use'));
      row.querySelectorAll('.rp-step')[1].setAttribute('aria-label', tr('rooms.print.stock.more'));
      row.querySelectorAll('.rp-step')[2].setAttribute('aria-label', tr('rooms.remove'));
      table.append(row);
    }
    stock.append(table);
  }
  function drawPrinters() {
    printers.replaceChildren(el('summary', null, `🖨️ ${tr('rooms.print.printers.title', { n: data.printers.length })}`), el('small', 'rp-note', tr('rooms.print.printers.sub')));
    const kind = select(['bambu', 'flashforge'].map((k) => [k, tr(`rooms.print.printers.kinds.${k}`)]), 'bambu');
    const name = input('text', 'Bambu Lab A1'), ip = input('text', tr('rooms.print.printers.ipPh')), serial = input('text'), code = input('password');
    code.autocomplete = 'off';
    const hint = el('small', 'rp-note'); const hintOf = () => { hint.textContent = tr(kind.value === 'bambu' ? 'rooms.print.printers.hintBambu' : 'rooms.print.printers.hintFlashforge'); name.placeholder = kind.value === 'bambu' ? 'Bambu Lab A1' : 'Flashforge Adventurer 5M'; };
    kind.addEventListener('change', hintOf); hintOf();
    const form = el('div', 'rp-form');
    form.append(field(tr('rooms.print.printers.kind'), kind), field(tr('rooms.print.printers.name'), name), field(tr('rooms.print.printers.ip'), ip), field(tr('rooms.print.printers.serial'), serial), field(tr('rooms.print.printers.code'), code),
      button(tr('rooms.print.printers.add'), async () => { const r = await act('/api/print/printer', { kind: kind.value, name: name.value, ip: ip.value, serial: serial.value, code: code.value }); if (r) { toast(tr('rooms.print.printers.added'), 4000); load(true); } }, 'rp-btn is-go'));
    const add = el('details', 'rp-add'); add.append(el('summary', null, `＋ ${tr('rooms.print.printers.add')}`), hint, form); add.open = !data.printers.length;
    printers.append(add);
    if (!data.printers.length) { printers.append(el('p', 'zc-task-note', tr('rooms.print.printers.none'))); return; }
    if (data.checked) printers.append(el('small', 'rp-note', tr('rooms.print.printers.checked', { t: data.checked.toLocaleTimeString() })));
    const grid = el('div', 'rp-printers');
    for (const p of data.printers) {
      const s = p.state, st = s?.state || 'unknown';
      const box = el('div', `rp-printer is-${st}`);
      const top = el('div', 'rp-printer-top');
      top.append(el('b', null, p.name), el('em', `rp-badge is-${st}`, s ? tr(`rooms.print.printers.state.${st}`) : tr('rooms.print.printers.checking')));
      box.append(top, el('small', 'rp-note', `${p.ip} · ${tr(`rooms.print.printers.mode.${p.mode}`)}${p.serial ? ` · ${p.serial}` : ''}`));
      if (s && s.percent != null && st !== 'free') {
        const bar = el('div', 'rp-bar'), fill = el('i'); fill.style.width = `${Math.max(0, Math.min(100, s.percent))}%`; bar.append(fill);
        bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuenow', String(s.percent)); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100');
        box.append(bar, el('small', 'rp-pct', [tr('rooms.print.printers.percent', { n: s.percent }), s.left ? tr('rooms.print.printers.left', { t: mins(s.left) }) : '', s.layer && s.layers ? tr('rooms.print.printers.layer', { l: s.layer, t: s.layers }) : ''].filter(Boolean).join(' · ')));
      }
      if (s?.file) box.append(el('small', 'rp-note', tr('rooms.print.printers.file', { file: s.file })));
      if (s?.nozzle || s?.bed) box.append(el('small', 'rp-note', tr('rooms.print.printers.temps', { n: Math.round(s.nozzle || 0), b: Math.round(s.bed || 0) })));
      if (s?.why && st === 'offline') box.append(el('small', 'rp-why', tr(`rooms.err.${s.why === 'auth' ? 'auth' : s.why === 'timeout' ? 'timeout' : 'offline'}`)));
      // a G-code file to a free printer
      const free = st === 'free' || st === 'done', pick = keepKeys(el('input')); pick.type = 'file'; pick.accept = '.gcode,.gco,.g,.3mf'; pick.hidden = true;
      pick.addEventListener('change', async () => {
        const f = pick.files?.[0]; if (!f) return;
        toast(tr('rooms.print.printers.sending', { file: f.name }), 8000);
        const r = await fetch(`/api/print/send${q({ id: p.id, name: f.name })}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f }).then((x) => x.json()).catch(() => null);
        pick.value = '';
        if (!r?.ok) { toast(r?.message || tr('rooms.unreachable'), 8000); return; }
        data = { ...r, checked: new Date() }; draw(); toast(tr('rooms.print.printers.sent', { file: r.sent }), 6000);
      });
      const send = button(tr('rooms.print.printers.send'), () => pick.click(), free ? 'rp-btn is-go' : 'rp-btn');
      send.disabled = !free; send.title = free ? tr('rooms.print.printers.pickFile') : tr('rooms.print.printers.onlyFree');
      const acts = el('div', 'lib-acts');
      acts.append(send, button(tr('rooms.remove'), () => act('/api/print/printer-remove', { id: p.id })));
      box.append(acts, pick);
      grid.append(box);
    }
    printers.append(grid, button(tr('rooms.refresh'), () => load(true)));
  }
  function draw() {
    if (!overlay || !data) return;
    const openStock = stock.open, openPrinters = printers.open;
    drawStock(); drawPrinters(); stock.open = openStock; printers.open = openPrinters;
    if (!body.contains(stock)) body.replaceChildren(printers, stock);
  }
  load(false).then(() => load(true));
  const timer = setInterval(() => { if (data?.printers.length) load(true); }, 10_000);
  stopTimers = () => clearInterval(timer);
}

/* ---------- the camera room ---------- */
function cameraRoom(body) {
  let data = null;
  const tiles = new Map();   // camera id -> { img, mode, timer }
  body.replaceChildren(el('p', 'zc-task-note', tr('rooms.loading')));
  async function act(url, b, msg) { const r = await post(url, b); if (!r?.ok) { toast(r?.message || tr('rooms.unreachable'), 6000); return null; } data = r; draw(); if (msg) toast(msg, 4000); return r; }
  function stopTile(id) { const t = tiles.get(id); if (!t) return; clearTimeout(t.timer); t.img.src = ''; tiles.delete(id); }
  function draw() {
    if (!overlay) return;
    for (const id of [...tiles.keys()]) stopTile(id);
    const name = input('text', tr('rooms.camera.namePh')), ip = input('text', tr('rooms.camera.ipPh')), port = input('number', '', '80'), channel = input('number', '', '1'), user = input('text', '', 'admin'), pass = input('password');
    pass.autocomplete = 'off'; port.min = '1'; channel.min = '1';
    const form = el('div', 'rp-form');
    form.append(field(tr('rooms.camera.name'), name), field(tr('rooms.camera.ip'), ip), field(tr('rooms.camera.port'), port, 'is-narrow'), field(tr('rooms.camera.channel'), channel, 'is-narrow'), field(tr('rooms.camera.user'), user), field(tr('rooms.camera.pass'), pass),
      button(tr('rooms.camera.add'), () => act('/api/cameras/add', { name: name.value, ip: ip.value, port: port.value, channel: channel.value, user: user.value, pass: pass.value }, tr('rooms.camera.added')), 'rp-btn is-go'));
    const add = el('details', 'rp-add'); add.append(el('summary', null, `＋ ${tr('rooms.camera.add')}`), el('small', 'rp-note', tr('rooms.camera.hint')), form); add.open = !data.cameras.length;
    const grid = el('div', 'rp-cams');
    for (const c of data.cameras) {
      const tile = el('figure', 'rp-cam'), img = el('img'), cap = el('figcaption'), msg = el('small', 'rp-cam-msg', tr('rooms.camera.noImage'));
      img.alt = c.name; img.decoding = 'async';
      const t = { img, mode: 'snap', timer: 0 }; tiles.set(c.id, t);
      // snapshots: the next one asked once the last arrived (never piling up when the camera is slow)
      const next = () => { if (!overlay || tiles.get(c.id) !== t || t.mode !== 'snap') return; img.src = `/api/cameras/snap${q({ id: c.id, t: String(Date.now()) })}`; };
      img.addEventListener('load', () => { msg.hidden = true; img.style.visibility = ''; if (t.mode === 'snap') t.timer = setTimeout(next, 1000); });
      img.addEventListener('error', async () => {
        if (!overlay || tiles.get(c.id) !== t || !img.getAttribute('src')) return;
        img.style.visibility = 'hidden';   // (no broken-picture icon)
        // why: the server's answer for a snapshot (asked again, it is quick to fail the same way); a stream that failed is MJPEG not on
        const r = t.mode === 'snap' ? await fetch(img.src).then((x) => x.json()).catch(() => null) : { message: tr('rooms.err.noMjpeg') };
        msg.hidden = false; msg.textContent = tr('rooms.camera.error', { why: r?.message || tr('rooms.err.offline') });
        if (t.mode === 'live') { t.mode = 'snap'; mode.value = 'snap'; }
        t.timer = setTimeout(next, 5000);
      });
      const mode = select([['snap', tr('rooms.camera.snap')], ['live', tr('rooms.camera.live')]], 'snap');
      mode.addEventListener('change', () => { clearTimeout(t.timer); t.mode = mode.value; if (t.mode === 'live') img.src = `/api/cameras/live${q({ id: c.id })}`; else next(); });
      const full = button('⛶', () => tile.requestFullscreen?.(), 'zc-ib'); full.setAttribute('aria-label', tr('rooms.camera.fullscreen'));
      cap.append(el('b', null, c.name), el('small', null, `${c.ip} · CH${c.channel}`), mode, full, button('🗑', () => act('/api/cameras/remove', { id: c.id }), 'zc-ib'));
      cap.lastChild.setAttribute('aria-label', tr('rooms.remove'));
      tile.append(img, msg, cap); grid.append(tile);
      next();
    }
    body.replaceChildren(add, data.cameras.length ? grid : el('p', 'zc-task-note', tr('rooms.camera.none')));
  }
  get('/api/cameras').then((r) => { if (!overlay) return; if (!r?.ok) { body.replaceChildren(el('p', 'zc-task-note', r?.message || tr('rooms.unreachable'))); return; } data = r; draw(); });
  stopTimers = () => { for (const id of [...tiles.keys()]) stopTile(id); };
}
