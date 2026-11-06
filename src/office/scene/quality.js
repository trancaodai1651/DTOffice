// Graphics quality: Auto (the default), Low, Medium or High, each viewer's own choice (Settings → Display).
//   High:   up to 2× resolution on Retina screens, soft shadows, 4× MSAA, bloom at night.
//   Medium: up to 1.5×, plain shadows from a smaller map, 2× MSAA, bloom at night.
//   Low:    1×, no shadows, no post-processing (one plain draw), 30 frames a second.
// Auto starts from what the device looks like (a phone: Low, its CPU is what runs out first, measured at 15 fps on
// Medium with the main thread full; a tablet or a narrow window: Medium; no GPU: Low; else High). When frames keep arriving late
// even at the lowest resolution step, it goes down one level and remembers that for this device. A remembered level is
// tried one step higher again after three days, so a busy afternoon does not cap the office for good. Hardware desktops
// retain at least Medium (shadows and MSAA); explicit choices keep their requested resolution, including High.
import * as THREE from 'three';
import { small } from '../core/env.js';
import { SOFTWARE_GL, camera, composer, renderer, renderPass, scene } from './renderer.js';
import { sun } from './lights.js';
import { autoGraphicsLevel, GRAPHICS_LEVELS, GRAPHICS_PRESETS, lowerAutoGraphicsLevel } from '../../shared/graphics-policy.js';

export const LEVELS = GRAPHICS_LEVELS;
const PRESET = GRAPHICS_PRESETS;
const KEY = 'office-quality', AUTO_KEY = 'office-quality-auto';
// choice: what the viewer picked ('auto' or a level); level: what is in use; plain: draw without post-processing
export const quality = { choice: 'auto', level: 'high', plain: false, fps: 60, prMax: 2 };
const listeners = new Set();

const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } } };
/** A phone: a touch screen whose short side is under 600 px (a tablet is not one). */
let phone = null;
export const phoneLike = () => (phone ??= matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600);
function autoStart() {
  let saved = null; try { saved = JSON.parse(store.get(AUTO_KEY) || 'null'); } catch { /* old value */ }
  return autoGraphicsLevel({ software: SOFTWARE_GL, coarse: matchMedia('(pointer: coarse)').matches, shortSide: Math.min(screen.width, screen.height), narrow: small.matches, saved });
}

function apply(level) {
  const p = PRESET[level];
  Object.assign(quality, { level, plain: p.plain || SOFTWARE_GL, fps: p.fps, prMax: SOFTWARE_GL ? 0.5 : p.prMax });
  renderer.shadowMap.enabled = p.shadows && !SOFTWARE_GL;
  if (!SOFTWARE_GL) {
    sun.castShadow = p.shadows;
    const type = p.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    if (renderer.shadowMap.type !== type) renderer.shadowMap.type = type;
    if (sun.shadow.mapSize.x !== p.map) { sun.shadow.mapSize.set(p.map, p.map); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    renderer.shadowMap.needsUpdate = true;
    const samples = Math.min(p.msaa, renderer.capabilities.maxSamples);
    for (const rt of [composer.renderTarget1, composer.renderTarget2]) if (rt.samples !== samples) { rt.samples = samples; rt.dispose(); }
  }
  for (const fn of listeners) fn(quality);
}

/** Draws one frame with the current quality: through the post-processing chain, or plainly when it is off. */
export function drawFrame(cam = camera) {
  if (quality.plain) renderer.render(scene, cam); else { renderPass.camera = cam; composer.render(); }
}
/** The viewer picked a level (or 'auto') in Settings. */
export function setQuality(choice) {
  if (choice !== 'auto' && !LEVELS.includes(choice)) return;
  quality.choice = choice; store.set(KEY, choice);
  apply(choice === 'auto' ? autoStart() : choice);
}
/** Auto only: frames keep coming late at the lowest resolution. Returns true when it stepped down. */
export function stepDown() {
  if (quality.choice !== 'auto' || quality.level === 'low' || SOFTWARE_GL) return false;
  const level = lowerAutoGraphicsLevel(quality.level, matchMedia('(pointer: coarse)').matches);
  if (!level) return false;
  store.set(AUTO_KEY, JSON.stringify({ level, at: Date.now() }));
  apply(level);
  return true;
}
/** Called now and on every change: core/loop.js keeps its resolution steps under the cap, Settings shows the level. */
export function onQualityChange(fn) { listeners.add(fn); fn(quality); }

export function setup() {
  const saved = store.get(KEY);
  quality.choice = saved === 'auto' || LEVELS.includes(saved) ? saved : 'auto';
  apply(quality.choice === 'auto' ? autoStart() : quality.choice);
}
