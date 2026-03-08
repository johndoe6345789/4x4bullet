'use strict';

// Rocks and trees
function buildScenery() {
  for (let i = 0; i < 90; i++) {
    const wx = (Math.random() - 0.5) * 480;
    const wz = (Math.random() - 0.5) * 480;
    if (Math.abs(wx) < 20 && Math.abs(wz) < 20) continue;
    const wy = terrainHeight(wx, wz);
    const r  = 0.4 + Math.random() * 2.8;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(0.35 + Math.random()*0.12, 0.32 + Math.random()*0.10, 0.28)
      })
    );
    rock.position.set(wx, wy + r * 0.25, wz);
    rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    rock.castShadow = true;
    scene.add(rock);
  }

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2810 });
  for (let i = 0; i < 140; i++) {
    const wx = (Math.random() - 0.5) * 490;
    const wz = (Math.random() - 0.5) * 490;
    if (Math.abs(wx) < 24 && Math.abs(wz) < 24) continue;
    const wy = terrainHeight(wx, wz);
    const h  = 3.5 + Math.random() * 7;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, h, 6), trunkMat);
    trunk.position.set(wx, wy + h * 0.5, wz);
    trunk.castShadow = true;
    scene.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(1.1 + Math.random() * 0.9, h * 0.85, 7),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(0.08 + Math.random()*0.12, 0.30 + Math.random()*0.16, 0.08)
      })
    );
    foliage.position.set(wx, wy + h + 0.4, wz);
    foliage.castShadow = true;
    scene.add(foliage);
  }
}

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
