// Collision space for street traffic and the vehicles driven in first person. Rectangles use the
// model's actual half length/width; angle is its heading from +x towards +z, in radians.
const EPS = 1e-7;
const axes = b => [[Math.cos(b.angle || 0), Math.sin(b.angle || 0)], [-Math.sin(b.angle || 0), Math.cos(b.angle || 0)]];
const radiusOn = (b, x, z) => {
  const c = Math.cos(b.angle || 0), s = Math.sin(b.angle || 0);
  return b.half * Math.abs(c * x + s * z) + b.width * Math.abs(-s * x + c * z);
};
const bounds = b => {
  const x = radiusOn(b, 1, 0), z = radiusOn(b, 0, 1);
  return [b.x - x, b.x + x, b.z - z, b.z + z];
};

/** The fraction of a translation available before touching another vehicle (continuous SAT).
 * A long frame cannot jump over a stopped scooter or traffic coming across an intersection. */
export function trafficSweep(a, dx, dz, b, margin = 0.035) {
  let enter = 0, exit = 1;
  for (const [x, z] of [...axes(a), ...axes(b)]) {
    const r = radiusOn(a, x, z) + radiusOn(b, x, z) + margin;
    const d = (b.x - a.x) * x + (b.z - a.z) * z, v = dx * x + dz * z;
    if (Math.abs(v) < EPS) { if (Math.abs(d) >= r - EPS) return 1; continue; }
    const t0 = (d - r) / v, t1 = (d + r) / v;
    enter = Math.max(enter, Math.min(t0, t1)); exit = Math.min(exit, Math.max(t0, t1));
    if (enter >= exit - EPS) return 1;
  }
  return exit > EPS && enter < 1 ? Math.max(0, enter - EPS) : 1;
}

export function trafficOverlaps(a, b, margin = 0) {
  return [...axes(a), ...axes(b)].every(([x, z]) =>
    Math.abs((b.x - a.x) * x + (b.z - a.z) * z) < radiusOn(a, x, z) + radiusOn(b, x, z) + margin - EPS);
}

/** Spatial hash: street population does not turn collision checks into an all-pairs render cost. */
export function createTrafficSpace({ cellSize = 8, margin = 0.035 } = {}) {
  const bodies = new Map(), cells = new Map(), keys = new Map();
  const cellKeys = ([x0, x1, z0, z1]) => {
    const out = [];
    for (let x = Math.floor(x0 / cellSize); x <= Math.floor(x1 / cellSize); x++)
      for (let z = Math.floor(z0 / cellSize); z <= Math.floor(z1 / cellSize); z++) out.push(`${x}:${z}`);
    return out;
  };
  function remove(id) {
    for (const key of keys.get(id) || []) { const c = cells.get(key); c?.delete(id); if (!c?.size) cells.delete(key); }
    keys.delete(id); bodies.delete(id);
  }
  function set(id, shape) {
    remove(id);
    const b = { angle: 0, ...shape, id }; bodies.set(id, b);
    const list = cellKeys(bounds(b)); keys.set(id, list);
    for (const key of list) { if (!cells.has(key)) cells.set(key, new Set()); cells.get(key).add(id); }
    return b;
  }
  function nearby(box, ignore) {
    const ids = new Set();
    for (const key of cellKeys([box[0] - margin, box[1] + margin, box[2] - margin, box[3] + margin]))
      for (const id of cells.get(key) || []) if (id !== ignore) ids.add(id);
    return [...ids].map(id => bodies.get(id));
  }
  function clear(shape, ignore) {
    return nearby(bounds(shape), ignore).every(b => b.lets?.(ignore) || !trafficOverlaps(shape, b, margin));
  }
  function move(id, x, z, angle = bodies.get(id)?.angle || 0) {
    const old = bodies.get(id); if (!old) return null;
    let shape = old;
    // A steering rotation happens only if its whole arc fits beside the neighbouring vehicles.
    const turn = Math.atan2(Math.sin(angle - old.angle), Math.cos(angle - old.angle));
    if (Math.abs(turn) > EPS) {
      const n = Math.max(1, Math.ceil(Math.abs(turn) / 0.025));
      const rotationalMargin = Math.hypot(old.half, old.width) * Math.abs(turn) / n / 2;
      const around = nearby(bounds({ ...old, half: Math.hypot(old.half, old.width), width: Math.hypot(old.half, old.width), angle: 0 }), id);
      let safe = true;
      for (let i = 0; i <= n && safe; i++) {
        const b = { ...old, angle: old.angle + turn * i / n };
        if (around.some(o => !o.lets?.(id) && trafficOverlaps(b, o, margin + rotationalMargin))) safe = false;
      }
      if (safe) shape = { ...old, angle: old.angle + turn };
    }
    const dx = x - old.x, dz = z - old.z, start = bounds(shape), end = bounds({ ...shape, x, z });
    const swept = [Math.min(start[0], end[0]), Math.max(start[1], end[1]), Math.min(start[2], end[2]), Math.max(start[3], end[3])];
    let fraction = 1;
    for (const b of nearby(swept, id)) if (!b.lets?.(id)) fraction = Math.min(fraction, trafficSweep(shape, dx, dz, b, margin));
    return { ...set(id, { ...shape, x: old.x + dx * fraction, z: old.z + dz * fraction }), fraction };
  }
  return { set, remove, clear, move, get: id => bodies.get(id), values: () => [...bodies.values()], clearAll() { bodies.clear(); cells.clear(); keys.clear(); } };
}
