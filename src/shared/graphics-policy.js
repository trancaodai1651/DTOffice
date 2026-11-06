// Device policy shared by initial WebGL allocation and later quality/resolution changes.
// Only Auto applies a touch-screen pixel budget; an explicit quality choice keeps its own cap.
export const GRAPHICS_LEVELS = ['low', 'medium', 'high'];
export const GRAPHICS_PRESETS = {
  high: { prMax: 2, shadows: true, soft: true, map: 2048, msaa: 4, plain: false, fps: 60 },
  medium: { prMax: 1.5, shadows: true, soft: false, map: 1024, msaa: 2, plain: false, fps: 60 },
  low: { prMax: 1, shadows: false, soft: false, map: 512, msaa: 0, plain: true, fps: 30 },
};
const RETRY_MS = 3 * 864e5;

export function autoGraphicsLevel({ software = false, coarse = false, shortSide = 1080, narrow = false, saved, now = Date.now() } = {}) {
  if (software) return 'low';
  const base = coarse && shortSide < 600 ? 'low' : coarse || narrow ? 'medium' : 'high';
  if (!saved || !GRAPHICS_LEVELS.includes(saved.level)) return base;
  const remembered = GRAPHICS_LEVELS.indexOf(saved.level) + (now - (saved.at || 0) > RETRY_MS ? 1 : 0);
  // A busy first load must not leave a hardware desktop without shadows and anti-aliasing for days.
  return GRAPHICS_LEVELS[Math.max(coarse ? 0 : 1, Math.min(remembered, GRAPHICS_LEVELS.indexOf(base)))];
}

export function lowerAutoGraphicsLevel(level, coarse = false) {
  const at = GRAPHICS_LEVELS.indexOf(level), floor = coarse ? 0 : 1;
  return at > floor ? GRAPHICS_LEVELS[at - 1] : null;
}

export function graphicsResolutionSteps({ width = 1, height = 1, pixelRatio = 1, prMax = 2, software = false, coarse = false, auto = true } = {}) {
  const native = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  if (software) return [Math.min(native, 0.5)];
  // A large Retina tablet otherwise draws several million pixels per pass, plus MSAA and bloom.
  // Keep HTML labels at the screen's native resolution while limiting only the 3D backing buffer.
  const budget = auto && coarse ? Math.sqrt(1_500_000 / Math.max(1, width * height)) : 2;
  const cap = Math.min(native, prMax, budget, 2), floor = Math.min(cap, coarse ? 0.6 : 1);
  if (!auto) return [cap];
  return [...new Set([cap, ...[1.75, 1.5, 1.25, 1, 0.85, 0.75, 0.6].filter((v) => v < cap && v >= floor), floor])];
}

// Intentional background/covered/list-mode throttling is never evidence of a slow GPU.
export const canAdaptGraphics = (targetMs) => targetMs > 0 && targetMs <= 1000 / 11;
