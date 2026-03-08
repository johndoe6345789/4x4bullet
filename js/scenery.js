'use strict';

// Dust particles
const DUST_COUNT = 256;
const dustPositions = new Float32Array(DUST_COUNT * 3);
const dustVelocities = Array.from({ length: DUST_COUNT }, () => new THREE.Vector3());
const dustLife = new Float32Array(DUST_COUNT);
var dustCursor = 0;
var dustSystem;

function buildDustSystem() {
  const geo = new THREE.BufferGeometry();
  for (let i = 0; i < DUST_COUNT; i++) dustPositions[i*3] = 99999;
  geo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xaa8855, size: 0.55, transparent: true, opacity: 0.35, depthWrite: false
  });
  dustSystem = new THREE.Points(geo, mat);
  scene.add(dustSystem);
}

function spawnDust(x, y, z, vx, vz) {
  const i = dustCursor % DUST_COUNT;
  dustPositions[i*3+0] = x;
  dustPositions[i*3+1] = y;
  dustPositions[i*3+2] = z;
  dustVelocities[i].set(
    vx * 0.25 + (Math.random()-0.5) * 2.5,
    2.0 + Math.random() * 2.5,
    vz * 0.25 + (Math.random()-0.5) * 2.5
  );
  dustLife[i] = 1.0;
  dustCursor++;
}

function updateDust(dt) {
  for (let i = 0; i < DUST_COUNT; i++) {
    if (dustLife[i] <= 0) continue;
    dustLife[i] -= dt * 1.0;
    dustPositions[i*3+0] += dustVelocities[i].x * dt;
    dustPositions[i*3+1] += dustVelocities[i].y * dt;
    dustPositions[i*3+2] += dustVelocities[i].z * dt;
    dustVelocities[i].y  -= 3.5 * dt;
    if (dustLife[i] <= 0) dustPositions[i*3] = 99999;
  }
  dustSystem.geometry.attributes.position.needsUpdate = true;
}
