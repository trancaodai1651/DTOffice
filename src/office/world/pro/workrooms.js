// The wing's two rooms without desks (world/layout.js WORKROOMS), beside the asset room:
//   "Phòng in 3D"   a rack of filament spools (their colours from the stock you entered), a bench with a Bambu Lab A1 and a
//                   Flashforge Adventurer 5M; each printer's screen glows with its state (free, printing, paused, error)
//   "Phòng camera"  a wall of six screens showing the Dahua cameras' snapshots, a desk and a chair facing it
// Both ask the office now and then (server/print-farm.mjs, server/cameras.mjs: this computer only; elsewhere they stay
// as they are built). Clicking the toolbar's room buttons opens their dialog (ui/rooms-panel.js).
import * as THREE from 'three';
import { scene } from '../../scene/renderer.js';
import { canvasTex, cyl, mat, put, rbox } from '../../scene/blocks.js';
import { metal, potPlant } from '../terrace.js';
import { WORKROOMS } from '../layout.js';
import { officeChair } from '../desks.js';
import { floorZone, glassWall, gridTex, plateTex, speckTex } from './pieces.js';
import { t as tr } from '../../../i18n/index.js';

const STATE_GLOW = { free: '#3DDC84', done: '#3DDC84', printing: '#2F80ED', paused: '#F2B544', busy: '#F2B544', error: '#EB5757', offline: '#4A5160' };
const SPOOL_DEFAULT = ['#202020', '#F5F5F0', '#D64541', '#2F80ED', '#27AE60', '#F2C94C', '#9B51E0', '#F2994A', '#56CCF2', '#BDBDBD', '#6D4C41', '#EB5757'];
const live = { spools: [], screens: [], cams: [] };
const token = async () => { try { return (await import('../../net/live.js')).TOKEN; } catch { return ''; } };
const q = async (extra = {}) => { const p = new URLSearchParams(extra), k = await token(); if (k) p.set('k', k); const s = p.toString(); return s ? `?${s}` : ''; };

// a sign on a wall, its face toward +z of the group
function sign(text, sub, x, y, z, ry, bg) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshBasicMaterial({ map: plateTex(text, sub, { bg, fg: '#F3EFE8', sub: '#C9D6E4' }) }));
  m.position.set(x, y, z); m.rotation.y = ry; m.userData.noMerge = true; scene.add(m);
}
// a small screen whose colour says the printer's state
function stateScreen(g, x, y, z, ry = 0) {
  const m = new THREE.MeshBasicMaterial({ color: STATE_GLOW.offline }), s = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.07), m);
  s.position.set(x, y, z); s.rotation.y = ry; s.userData.noMerge = true; g.add(s); return m;
}
// Bambu Lab A1: a bed-slinger: the base, the bed sliding on it, a column on the left with the arm and the toolhead
function bambuA1(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0.92, z); g.rotation.y = ry; scene.add(g);
  const dark = mat('#2B2E33', { roughness: 0.5 }), grey = mat('#D9DCE1', { roughness: 0.45 });
  put(g, rbox(0.42, 0.07, 0.38, dark, 0.02), 0, 0.035, 0);
  put(g, rbox(0.3, 0.012, 0.3, mat('#1A1C1F', { roughness: 0.3, metalness: 0.4 }), 0.004), 0.03, 0.085, 0);   // the PEI plate
  put(g, rbox(0.045, 0.42, 0.06, grey, 0.01), -0.19, 0.28, -0.02);                                         // the Z column
  put(g, rbox(0.36, 0.035, 0.04, grey, 0.008), 0.0, 0.3, -0.02);                                          // the X arm
  const head = put(g, rbox(0.07, 0.08, 0.07, mat('#E9EBEE', { roughness: 0.4 }), 0.015), 0.02, 0.27, 0.0);
  put(g, cyl(0.06, 0.06, 0.055, mat('#F2994A'), 24), -0.19, 0.53, -0.02).rotation.z = Math.PI / 2;   // its spool on top
  head.userData.noMerge = true;
  const glow = stateScreen(g, 0.12, 0.055, 0.191);
  return { glow, head, g };
}
// Flashforge Adventurer 5M: a cube frame, open sides, the head on its gantry, a screen in front
function flashforge5m(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0.92, z); g.rotation.y = ry; scene.add(g);
  const frame = mat('#1F2226', { roughness: 0.5 }), W = 0.4, H = 0.46;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(g, rbox(0.03, H, 0.03, frame, 0.006), sx * W / 2, H / 2, sz * W / 2);
  for (const y of [0.02, H]) { put(g, rbox(W + 0.03, 0.03, 0.03, frame, 0.006), 0, y, W / 2); put(g, rbox(W + 0.03, 0.03, 0.03, frame, 0.006), 0, y, -W / 2); put(g, rbox(0.03, 0.03, W, frame, 0.006), W / 2, y, 0); put(g, rbox(0.03, 0.03, W, frame, 0.006), -W / 2, y, 0); }
  put(g, rbox(0.3, 0.012, 0.3, mat('#2A2D31', { roughness: 0.35, metalness: 0.3 }), 0.004), 0, 0.13, 0);
  const head = put(g, rbox(0.08, 0.07, 0.07, mat('#F0F1F3', { roughness: 0.4 }), 0.012), 0, 0.38, 0);
  put(g, rbox(W, 0.02, 0.025, mat('#C9CED6', { metalness: 0.4, roughness: 0.4 }), 0.004), 0, 0.42, 0);
  head.userData.noMerge = true;
  const glow = stateScreen(g, 0.12, 0.07, W / 2 + 0.017);
  return { glow, head, g };
}
// a steel rack of filament spools, against a wall
function spoolRack(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  for (const sx of [-0.7, 0.7]) for (const sz of [-0.16, 0.16]) put(g, rbox(0.035, 1.75, 0.035, metal, 0.008), sx, 0.875, sz);
  const rows = [0.18, 0.62, 1.06, 1.5];
  for (const y of rows) put(g, rbox(1.44, 0.025, 0.36, mat('#B7BEC8', { roughness: 0.5 }), 0.005), 0, y, 0);
  rows.forEach((y, r) => { for (let k = 0; k < 4; k++) {
    const m = mat(SPOOL_DEFAULT[(r * 4 + k) % SPOOL_DEFAULT.length], { roughness: 0.55 });
    const spool = put(g, cyl(0.13, 0.13, 0.075, m, 28), -0.5 + k * 0.33, y + 0.145, 0); spool.rotation.x = Math.PI / 2; spool.userData.noMerge = true;
    put(g, cyl(0.045, 0.045, 0.08, mat('#E8E8E8'), 16), -0.5 + k * 0.33, y + 0.145, 0).rotation.x = Math.PI / 2;
    live.spools.push(m);
  } });
}
function printRoom(R) {
  floorZone(R.x0, R.x1, R.z0, R.z1, gridTex('#CDD3DA', 'rgba(70,80,95,.22)', 2), 0.8);
  glassWall(R.x0, R.z0, R.x1, R.z0, [[R.door - 0.6 - R.x0, R.door + 0.6 - R.x0]]);   // onto corridor A
  glassWall(R.x0, R.z0, R.x0, R.z1);                                                 // from the asset room
  // the bench along the east wall, the two printers on it
  const bx = R.x1 - 0.45, bz = (R.z0 + R.z1) / 2 + 0.2;
  put(scene, rbox(0.7, 0.05, 2.2, mat('#E4DFD6', { roughness: 0.55 }), 0.01), bx, 0.9, bz);
  for (const dz of [-1.0, 1.0]) for (const dx of [-0.3, 0.3]) put(scene, rbox(0.05, 0.88, 0.05, metal, 0.01), bx + dx, 0.44, bz + dz);
  live.printers = [bambuA1(bx, bz - 0.55, -Math.PI / 2), flashforge5m(bx, bz + 0.55, -Math.PI / 2)];
  spoolRack(R.x0 + 1.4, R.z0 + 0.32, 0);   // against the corridor's glass, facing into the room
  potPlant(R.x0 + 0.35, R.z1 - 0.35, 0.8, 'snake');
  sign(tr('rooms.view.print').toUpperCase(), 'Bambu Lab · Flashforge', R.x1 - 0.06, 2.15, bz, -Math.PI / 2, '#3A3F8F');
}
function cameraRoom(R) {
  floorZone(R.x0, R.x1, R.z0, R.z1, speckTex('#3B4250', 2600, 0.05), 0.8);
  glassWall(R.x0, R.z0, R.x1, R.z0);                                                 // from the print room
  glassWall(R.x0, R.z0, R.x0, R.z1, [[R.door - 0.6 - R.z0, R.door + 0.6 - R.z0]]);  // its door: from the asset room
  // a wall of 3 x 2 screens on the east wall
  const wx = R.x1 - 0.08, cz = (R.z0 + R.z1) / 2;
  put(scene, rbox(0.06, 1.25, 2.55, mat('#15181D', { roughness: 0.6 }), 0.01), wx, 1.55, cz);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const tex = canvasTex(320, 180, (g) => noSignal(g, r * 3 + c + 1)), m = new THREE.MeshBasicMaterial({ map: tex });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.44), m); s.position.set(wx - 0.035, 1.84 - r * 0.58, cz - 0.82 + c * 0.82); s.rotation.y = -Math.PI / 2; s.userData.noMerge = true; scene.add(s);
    live.cams.push({ tex, n: r * 3 + c + 1 });
  }
  // the desk facing it, a chair
  const dx = R.x1 - 1.45;
  put(scene, rbox(0.7, 0.05, 1.6, mat('#2C323C', { roughness: 0.6 }), 0.01), dx, 0.74, cz);
  for (const dz of [-0.7, 0.7]) put(scene, rbox(0.05, 0.72, 0.6, metal, 0.01), dx, 0.37, cz + dz);
  put(scene, rbox(0.16, 0.02, 0.42, mat('#1B1F26'), 0.005), dx + 0.12, 0.775, cz);   // the keyboard
  const seat = new THREE.Group(); seat.position.set(dx - 0.55, 0, cz); seat.rotation.y = Math.PI / 2; scene.add(seat);
  officeChair(seat, 0, 0, mat('#3B4250', { roughness: 0.9 }));
  sign(tr('rooms.view.camera').toUpperCase(), 'Dahua · LAN', R.x0 + 1.3, 2.15, R.z1 - 0.06, Math.PI, '#5A2A2A');
}
function noSignal(g, n, text = 'NO SIGNAL') {
  g.fillStyle = '#0B0E13'; g.fillRect(0, 0, 320, 180);
  for (let y = 0; y < 180; y += 4) { g.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.03})`; g.fillRect(0, y, 320, 2); }
  g.fillStyle = '#8A94A6'; g.font = '700 22px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(text, 160, 98);
  g.textAlign = 'left'; g.font = '600 14px system-ui, sans-serif'; g.fillStyle = '#C9D1DC'; g.fillText(`CAM ${n}`, 10, 20);
}

/* ---------- what the office says, now and then ---------- */
async function pollPrint() {
  const r = await fetch(`/api/print/status${await q()}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
  if (!r?.ok) return false;
  // the rack: the colours in stock, the most spools first
  const colours = [...r.filaments].filter((f) => f.qty > 0).sort((a, b) => b.qty - a.qty).flatMap((f) => Array(Math.min(f.qty, 4)).fill(f.hex));
  live.spools.forEach((m, k) => m.color.set(colours[k] || SPOOL_DEFAULT[k % SPOOL_DEFAULT.length]));
  r.printers.slice(0, live.printers.length).forEach((p, k) => live.printers[k].glow.color.set(STATE_GLOW[p.state?.state] || STATE_GLOW.offline));
  for (let k = r.printers.length; k < live.printers.length; k++) live.printers[k].glow.color.set(STATE_GLOW.offline);
  live.printing = r.printers.slice(0, live.printers.length).map((p) => p.state?.state === 'printing');
  return true;
}
async function pollCams() {
  const r = await fetch(`/api/cameras${await q()}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
  if (!r?.ok) return false;
  await Promise.all(live.cams.map(async (s, k) => {
    const c = r.cameras[k], cv = s.tex.image, g = cv.getContext('2d');
    if (!c) { noSignal(g, s.n); s.tex.needsUpdate = true; return; }
    const img = new Image(); img.src = `/api/cameras/snap${await q({ id: c.id, t: String(Date.now()) })}`;
    try { await img.decode(); g.drawImage(img, 0, 0, 320, 180); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, 320, 24); g.fillStyle = '#fff'; g.font = '600 14px system-ui, sans-serif'; g.fillText(c.name, 8, 17); }
    catch { noSignal(g, s.n, 'OFFLINE'); }
    s.tex.needsUpdate = true;
  }));
  return true;
}
// the toolheads move while their printer prints
function animate(t) {
  (live.printers || []).forEach((p, k) => { if (live.printing?.[k]) { p.head.position.x = Math.sin(t * 2.3 + k) * 0.11; p.head.position.z = Math.cos(t * 1.7 + k) * 0.08; } });
}

/** Builds both rooms (headquarters only: world/pro/wing.js) and keeps them up to date while the page is open. */
export function buildWorkrooms() {
  printRoom(WORKROOMS.print); cameraRoom(WORKROOMS.camera);
  let printOn = true, camsOn = true;
  const tick = async () => {
    if (document.hidden) return;
    if (printOn) printOn = await pollPrint();   // (refused, from a phone: asked no more)
    if (camsOn) camsOn = await pollCams();
  };
  setTimeout(tick, 4000); setInterval(tick, 15_000);
  const clock = new THREE.Clock(); const step = () => { animate(clock.getElapsedTime()); requestAnimationFrame(step); }; requestAnimationFrame(step);
}
