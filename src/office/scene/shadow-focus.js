import * as THREE from 'three';

// Reuse the office's sunlight/shadow map around a street walker. Its direction and allocation stay unchanged.
// Snap in light space so a step on the pavement does not make the shadow's texels crawl over every surface.
export function createShadowFocus(light, changed = () => {}) {
  const home = { position: light.position.clone(), target: light.target.position.clone() };
  const cam = light.shadow.camera, bounds = { left: cam.left, right: cam.right, top: cam.top, bottom: cam.bottom };
  const offset = new THREE.Vector3().subVectors(home.position, home.target), forward = offset.clone().normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
  const up = new THREE.Vector3().crossVectors(forward, right), target = new THREE.Vector3(), lastPosition = new THREE.Vector3();
  let following = false;
  return (position) => {
    if (!position) {
      if (!following) return;
      following = false;
      light.position.copy(home.position); light.target.position.copy(home.target);
      Object.assign(cam, bounds); cam.updateProjectionMatrix(); changed();
      return;
    }
    if (following && position.distanceToSquared(lastPosition) < 0.25) return;
    const radius = 18, texel = 2 * radius / light.shadow.mapSize.x;
    const x = Math.round(position.dot(right) / texel) * texel;
    const y = Math.round(position.dot(up) / texel) * texel;
    const z = position.dot(forward);
    target.copy(right).multiplyScalar(x).addScaledVector(up, y).addScaledVector(forward, z);
    if (following && target.distanceToSquared(light.target.position) < 1e-8) return;
    if (!following) { Object.assign(cam, { left: -radius, right: radius, top: radius, bottom: -radius }); cam.updateProjectionMatrix(); }
    following = true; lastPosition.copy(position);
    light.target.position.copy(target); light.position.copy(target).add(offset); changed();
  };
}
