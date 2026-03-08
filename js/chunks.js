'use strict';

// Chunk streaming manager — loads/unloads terrain around the vehicle

const LOAD_RADIUS   = 3;  // chunks to keep loaded around player
const UNLOAD_RADIUS = 5;  // chunks beyond this get removed

const loadedChunks = {};  // key "cx,cz" -> { mesh, body, triMesh, scenery[] }

function chunkKey(cx, cz) { return cx + ',' + cz; }

// Deterministic PRNG seeded per-chunk (mulberry32)
function chunkRNG(cx, cz) {
  let seed = (cx * 73856093 ^ cz * 19349663) >>> 0;
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function loadChunk(cx, cz) {
  const key = chunkKey(cx, cz);
  if (loadedChunks[key]) return;

  const heights = buildChunkHeights(cx, cz);
  const mesh = buildChunkMesh(cx, cz, heights);
  scene.add(mesh);

  const { body, triMesh } = buildChunkBody(cx, cz, heights);
  const scenery = buildChunkScenery(cx, cz);

  loadedChunks[key] = { mesh, body, triMesh, scenery };
}

function unloadChunk(key) {
  const chunk = loadedChunks[key];
  if (!chunk) return;

  // Remove Three.js mesh
  scene.remove(chunk.mesh);
  chunk.mesh.geometry.dispose();
  chunk.mesh.material.dispose();

  // Remove scenery
  for (const obj of chunk.scenery) {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }

  // Remove Bullet body
  physWorld.removeRigidBody(chunk.body);

  delete loadedChunks[key];
}

function updateChunks(playerX, playerZ) {
  const pcx = Math.floor(playerX / CHUNK_SIZE);
  const pcz = Math.floor(playerZ / CHUNK_SIZE);

  // Load nearby chunks
  for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
    for (let dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
      loadChunk(pcx + dx, pcz + dz);
    }
  }

  // Unload far chunks
  const toRemove = [];
  for (const key in loadedChunks) {
    const parts = key.split(',');
    const cx = parseInt(parts[0], 10);
    const cz = parseInt(parts[1], 10);
    if (Math.abs(cx - pcx) > UNLOAD_RADIUS || Math.abs(cz - pcz) > UNLOAD_RADIUS) {
      toRemove.push(key);
    }
  }
  for (const key of toRemove) unloadChunk(key);
}

function buildChunkScenery(cx, cz) {
  const rng = chunkRNG(cx, cz);
  const meshes = [];
  const originX = cx * CHUNK_SIZE;
  const originZ = cz * CHUNK_SIZE;

  // Rocks
  const rockCount = 2 + Math.floor(rng() * 4);
  for (let i = 0; i < rockCount; i++) {
    const wx = originX + rng() * CHUNK_SIZE;
    const wz = originZ + rng() * CHUNK_SIZE;
    if (Math.abs(wx) < 20 && Math.abs(wz) < 20) continue;
    const wy = terrainHeight(wx, wz);
    const r  = 0.4 + rng() * 2.8;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r, 0),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(0.35 + rng()*0.12, 0.32 + rng()*0.10, 0.28)
      })
    );
    rock.position.set(wx, wy + r * 0.25, wz);
    rock.rotation.set(rng()*Math.PI, rng()*Math.PI, rng()*Math.PI);
    rock.castShadow = true;
    scene.add(rock);
    meshes.push(rock);
  }

  // Trees
  const treeCount = 4 + Math.floor(rng() * 8);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2810 });
  for (let i = 0; i < treeCount; i++) {
    const wx = originX + rng() * CHUNK_SIZE;
    const wz = originZ + rng() * CHUNK_SIZE;
    if (Math.abs(wx) < 24 && Math.abs(wz) < 24) continue;
    const wy = terrainHeight(wx, wz);
    const h  = 3.5 + rng() * 7;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, h, 6), trunkMat);
    trunk.position.set(wx, wy + h * 0.5, wz);
    trunk.castShadow = true;
    scene.add(trunk);
    meshes.push(trunk);

    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(1.1 + rng() * 0.9, h * 0.85, 7),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(0.08 + rng()*0.12, 0.30 + rng()*0.16, 0.08)
      })
    );
    foliage.position.set(wx, wy + h + 0.4, wz);
    foliage.castShadow = true;
    scene.add(foliage);
    meshes.push(foliage);
  }

  return meshes;
}
