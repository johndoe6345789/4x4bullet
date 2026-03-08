'use strict';

// Chunk streaming manager

const LOAD_RADIUS   = 3;
const UNLOAD_RADIUS = 5;
const MAX_CHUNKS_PER_FRAME = 2; // throttle loading to avoid freezes

const loadedChunks = {};

// Store chunk coords as numbers to avoid string split/parseInt on every scan
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

// Shared geometry pools — reuse instead of creating per-instance
var _rockGeoPool, _trunkGeo, _sharedTrunkMat;

function initChunkPools() {
  // Pre-build a few rock sizes to pick from
  _rockGeoPool = [0.6, 1.2, 2.0, 3.0].map(r => new THREE.DodecahedronGeometry(r, 0));
  _trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 1, 5); // unit height, scaled per tree
  _sharedTrunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2810 });
}

function loadChunk(cx, cz) {
  const key = chunkKey(cx, cz);
  if (loadedChunks[key]) return;

  const heights = buildChunkHeights(cx, cz);
  const mesh = buildChunkMesh(cx, cz, heights);
  scene.add(mesh);

  const phys = buildChunkBody(cx, cz, heights);
  const scenery = buildChunkScenery(cx, cz);

  loadedChunks[key] = { mesh, body: phys.body, triMesh: phys.triMesh, shape: phys.shape, scenery, cx, cz };
}

function unloadChunk(key) {
  const chunk = loadedChunks[key];
  if (!chunk) return;

  scene.remove(chunk.mesh);
  chunk.mesh.geometry.dispose();

  for (const obj of chunk.scenery) {
    scene.remove(obj);
    // Don't dispose shared geometry/materials
  }

  physWorld.removeRigidBody(chunk.body);
  Ammo.destroy(chunk.body);
  Ammo.destroy(chunk.shape);
  Ammo.destroy(chunk.triMesh);

  delete loadedChunks[key];
}

function updateChunks(playerX, playerZ) {
  const pcx = Math.floor(playerX / CHUNK_SIZE);
  const pcz = Math.floor(playerZ / CHUNK_SIZE);

  // Load nearby chunks (throttled)
  let loaded = 0;
  for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS && loaded < MAX_CHUNKS_PER_FRAME; dx++) {
    for (let dz = -LOAD_RADIUS; dz <= LOAD_RADIUS && loaded < MAX_CHUNKS_PER_FRAME; dz++) {
      const key = chunkKey(pcx + dx, pcz + dz);
      if (!loadedChunks[key]) {
        loadChunk(pcx + dx, pcz + dz);
        loaded++;
      }
    }
  }

  // Unload far chunks
  for (const key in loadedChunks) {
    const c = loadedChunks[key];
    if (Math.abs(c.cx - pcx) > UNLOAD_RADIUS || Math.abs(c.cz - pcz) > UNLOAD_RADIUS) {
      unloadChunk(key);
    }
  }
}

function buildChunkScenery(cx, cz) {
  const rng = chunkRNG(cx, cz);
  const meshes = [];
  const originX = cx * CHUNK_SIZE;
  const originZ = cz * CHUNK_SIZE;

  // Rocks — use shared geometry pool
  const rockCount = 2 + Math.floor(rng() * 4);
  for (let i = 0; i < rockCount; i++) {
    const wx = originX + rng() * CHUNK_SIZE;
    const wz = originZ + rng() * CHUNK_SIZE;
    if (Math.abs(wx) < 20 && Math.abs(wz) < 20) continue;
    const wy = terrainHeight(wx, wz);
    const geo = _rockGeoPool[Math.floor(rng() * _rockGeoPool.length)];
    const rock = new THREE.Mesh(geo,
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(0.35 + rng()*0.12, 0.32 + rng()*0.10, 0.28)
      })
    );
    const s = 0.3 + rng() * 1.2;
    rock.scale.set(s, s * (0.6 + rng() * 0.8), s);
    rock.position.set(wx, wy + s * 0.3, wz);
    rock.rotation.set(rng()*Math.PI, rng()*Math.PI, rng()*Math.PI);
    rock.castShadow = true;
    scene.add(rock);
    meshes.push(rock);
  }

  // Trees — shared trunk geo + material, scale for height
  const treeCount = 4 + Math.floor(rng() * 8);
  for (let i = 0; i < treeCount; i++) {
    const wx = originX + rng() * CHUNK_SIZE;
    const wz = originZ + rng() * CHUNK_SIZE;
    if (Math.abs(wx) < 24 && Math.abs(wz) < 24) continue;
    const wy = terrainHeight(wx, wz);
    const h  = 3.5 + rng() * 7;

    const trunk = new THREE.Mesh(_trunkGeo, _sharedTrunkMat);
    trunk.scale.set(1, h, 1);
    trunk.position.set(wx, wy + h * 0.5, wz);
    trunk.castShadow = true;
    scene.add(trunk);
    meshes.push(trunk);

    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(1.1 + rng() * 0.9, h * 0.85, 6),
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
