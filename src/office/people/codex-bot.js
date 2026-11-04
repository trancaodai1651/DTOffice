// Codex's bot: a small blue robot with a terminal ">_" for a face, floating about the office while Codex is one of your
// CLIs. It goes to a desk where a Codex session is at work and hovers there, otherwise drifts between the server room,
// the library and the lounge. Click it for Codex's plan limits. Built from a few shapes (no model file), its faces drawn
// on canvases; walks the office's own paths (people/navigation.js), floating a little above the floor.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { state } from '../core/state.js';
import { STATIC, V2, el, rand, reduceMotion, replay } from '../core/env.js';
import { scene } from '../scene/renderer.js';
import { canvasTex } from '../scene/blocks.js';
import { DESK_SPOTS, NODES, STATIONS, nearestNode, route } from './navigation.js';
import { sessions, workerForSession } from './workers.js';
import { togglePlan } from '../ui/settings.js';
import { addHook } from '../ui/ticks.js';
import { t as tr } from '../../i18n/index.js';

const BLUE = '#5B6CF0', BLUE_D = '#4453D6', SCREEN = '#1E2440', GLOW = '#9FB4FF';
let bot = null;   // { root, head, tag, pos: V2, path: V2[], face, next, at }
const pickables = [];

// the screen: a dark rounded panel with ">_" in light blue
function screenTex(big) {
  return canvasTex(128, big ? 96 : 64, (g, w, h) => {
    g.fillStyle = SCREEN; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 18); g.fill();
    g.fillStyle = GLOW; g.font = `700 ${big ? 46 : 30}px ui-monospace, Consolas, monospace`; g.textBaseline = 'middle';
    g.fillText('>', w * 0.2, h * 0.5); g.fillRect(w * 0.52, h * 0.5 + (big ? 10 : 6), w * 0.26, big ? 7 : 5);
  });
}
function build() {
  const root = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.55, metalness: 0.05 }), md = new THREE.MeshStandardMaterial({ color: BLUE_D, roughness: 0.6 });
  // the head: a cloud of round bumps around a soft box, the screen on its front
  const head = new THREE.Group(); head.position.y = 1.05;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), m); core.scale.set(1.25, 0.95, 0.95); head.add(core);
  for (const [x, y, z, r] of [[-0.3, 0.16, 0, 0.17], [0.3, 0.16, 0, 0.17], [0, 0.27, -0.02, 0.19], [-0.17, 0.26, 0.04, 0.15], [0.17, 0.26, 0.04, 0.15], [-0.38, -0.05, 0, 0.13], [0.38, -0.05, 0, 0.13]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); b.position.set(x, y, z); head.add(b);
  }
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.36), new THREE.MeshBasicMaterial({ map: screenTex(true), transparent: true }));
  face.position.set(0, -0.02, 0.305); head.add(face);
  // the body: a rounded capsule with a smaller screen, stubby arms and feet
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.14, 6, 14), m); body.position.y = 0.55; body.scale.set(1.05, 1, 0.85);
  const chest = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.13), new THREE.MeshBasicMaterial({ map: screenTex(false), transparent: true })); chest.position.set(0, 0.58, 0.175);
  const arms = [-1, 1].map((s) => { const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.14, 4, 8), md); a.position.set(0.25 * s, 0.56, 0.02); a.rotation.z = 0.35 * s; return a; });
  const feet = [-1, 1].map((s) => { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.06, 4, 8), md); f.position.set(0.09 * s, 0.27, 0.02); return f; });
  root.add(head, body, chest, ...arms, ...feet);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.dynamic = true; pickables.push(o); } });
  // its name, as people have theirs
  const tagEl = el('div', 'tag tag--bot'); tagEl.append(el('span', null, tr('specialists.bot.name')));
  const tag = new CSS2DObject(tagEl); tag.position.set(0, 1.62, 0); root.add(tag);
  scene.add(root);
  return { root, head, arms, tagEl, tag, pos: new V2(), path: [], face: 0, next: 0, t: rand(0, 10) };
}
// where it goes next: the desk of a Codex session at work, else somewhere it likes
function nextSpot() {
  const codex = [...sessions.values()].filter((s) => s.agent === 'codex' && s.status !== 'rest');
  if (codex.length && Math.random() < 0.7) {
    const s = codex[Math.floor(Math.random() * codex.length)], w = workerForSession(s.id), d = s.desk ?? -1;
    if (d >= 0 && DESK_SPOTS[d]) { const ds = DESK_SPOTS[d]; return { x: ds.x + 0.7, z: ds.z - 0.7, node: ds.node }; }
    if (w) return { x: w.pos.x + 0.8, z: w.pos.y + 0.6, node: nearestNode(w.pos) };
  }
  const pool = ['server', 'library', 'globe', 'coffee', 'board'].flatMap((k) => STATIONS[k] || []);
  const s = pool[Math.floor(Math.random() * pool.length)];
  return s ? { x: s.x + rand(-0.4, 0.4), z: s.z + rand(-0.4, 0.4), node: s.node } : null;
}
function go(to) {
  const N = (k) => new V2(NODES[k][0], NODES[k][1]);
  bot.path = [...route(nearestNode(bot.pos), to.node).map(N), new V2(to.x, to.z)];
}
const wanted = () => !STATIC && !replay.on && (!Array.isArray(state.agents) || state.agents.includes('codex'));

/** Every frame (core/loop.js): there while Codex is one of your CLIs, floating and drifting. */
export function updateCodexBot(dt, t) {
  if (!state.world || !NODES) return;
  if (!wanted()) { if (bot) bot.root.visible = bot.tag.visible = false; return; }
  if (!bot) {
    bot = build();
    const s = (STATIONS.server || STATIONS.library || [])[0]; if (s) bot.pos.set(s.x + 0.6, s.z + 0.4);
  }
  bot.root.visible = true; bot.tag.visible = true;
  bot.t += dt;
  if (bot.path.length) {
    const p = bot.path[0], dx = p.x - bot.pos.x, dz = p.y - bot.pos.y, d = Math.hypot(dx, dz), step = 1.6 * dt;
    if (d <= step) { bot.pos.copy(p); bot.path.shift(); if (!bot.path.length) bot.next = t + rand(8, 18); }
    else { bot.pos.x += (dx / d) * step; bot.pos.y += (dz / d) * step; bot.face = Math.atan2(dx, dz); }
  } else if (t > bot.next) { const to = nextSpot(); if (to) go(to); else bot.next = t + 10; }
  const bob = reduceMotion ? 0 : Math.sin(bot.t * 2.4) * 0.05;
  bot.root.position.set(bot.pos.x, 0.12 + bob, bot.pos.y);
  bot.root.rotation.y += ((((bot.face - bot.root.rotation.y + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * Math.min(1, dt * 5);
  if (!reduceMotion) { bot.head.rotation.z = Math.sin(bot.t * 1.3) * 0.06; for (const [i, a] of bot.arms.entries()) a.rotation.x = Math.sin(bot.t * 3 + i * Math.PI) * (bot.path.length ? 0.6 : 0.15); }
  const n = [...sessions.values()].filter((s) => s.agent === 'codex' && s.status !== 'rest').length;
  bot.tagEl.title = n ? tr('specialists.bot.working', { n }) : tr('specialists.bot.idle');
}
/** The bot under the pointer (interact): its distance, or null. */
export function pickBot(ray) {
  if (!bot?.root.visible) return null;
  const hit = ray.intersectObjects(pickables, false)[0];
  return hit ? { d: hit.distance } : null;
}
/** Clicked: Codex's plan limits, on its tab. */
export function openBot() {
  togglePlan(true);
  setTimeout(() => document.querySelector('#plan-tabs [data-k="codex"], #plan-tabs [data-tab="codex"]')?.click(), 30);
}
export function setup() {
  if (new URLSearchParams(location.search).has('debug')) addHook({ get codexBot() { return bot && { x: bot.pos.x, z: bot.pos.y, walking: bot.path.length > 0, visible: bot.root.visible }; }, get codexBotRoot() { return bot?.root; } });
}
