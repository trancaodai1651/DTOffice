// Street furniture follows block geometry, not a repeating grid that can land inside another street.
const inside = (x, z, r) => r && x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;

export function onCityRoad(x, z, { XS, ZS, streetWidth, superblock }) {
  if (inside(x, z, superblock)) return false;
  const half = streetWidth / 2;
  return XS.some((v) => Math.abs(x - v) <= half) || ZS.some((v) => Math.abs(z - v) <= half);
}

/** @param {{ XS: number[], ZS: number[], streetWidth: number, superblock?: { x0: number, x1: number, z0: number, z1: number }, avoid?: number[][], cornerClearance?: number }} options */
export function cityLampSites({ XS, ZS, streetWidth, superblock, avoid = [], cornerClearance = 5.6 }) {
  const out = [], offset = streetWidth / 2 + 0.5;
  for (const [axis, lines, cross] of [['z', XS, ZS], ['x', ZS, XS]]) {
    lines.forEach((line, n) => {
      for (let k = 0; k < cross.length - 1; k++) {
        if (cross[k + 1] - cross[k] < 2 * cornerClearance) continue;
        const along = (cross[k] + cross[k + 1]) / 2;
        const center = axis === 'z' ? [line, along] : [along, line];
        if (inside(...center, superblock)) continue;
        // One lamp per block, on alternating kerbs. Try the other side if a doorway occupies the preferred one.
        const preferred = (n + k) % 2 ? -1 : 1;
        for (const side of [preferred, -preferred]) {
          const x = axis === 'z' ? line + side * offset : along, z = axis === 'x' ? line + side * offset : along;
          if (inside(x, z, superblock) || onCityRoad(x, z, { XS, ZS, streetWidth, superblock })) continue;
          if (avoid.some(([ax, az, r]) => Math.hypot(x - ax, z - az) < r)) continue;
          if (out.some((p) => Math.hypot(x - p.x, z - p.z) < 3)) continue;
          out.push({ x, z, ax: axis === 'z' ? -side : 0, az: axis === 'x' ? -side : 0, axis });
          break;
        }
      }
    });
  }
  return out;
}

// Keep complete center-line dashes behind the stop lines, clear of zebras and crossing traffic.
export const roadDashAllowed = (along, crossings, dashHalf = 0.7) => crossings.every((c) => Math.abs(along - c) > 5.4 + dashHalf);
