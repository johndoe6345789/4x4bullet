'use strict';

// Deterministic value noise — always returns 0..1

function noiseHash(n) {
  const s = Math.sin(n) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise2D(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix,        fz = z - iz;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uz = fz * fz * (3.0 - 2.0 * fz);
  const h00 = noiseHash(ix     + iz     * 57.0);
  const h10 = noiseHash(ix + 1 + iz     * 57.0);
  const h01 = noiseHash(ix     + (iz+1) * 57.0);
  const h11 = noiseHash(ix + 1 + (iz+1) * 57.0);
  return h00*(1-ux)*(1-uz) + h10*ux*(1-uz) + h01*(1-ux)*uz + h11*ux*uz;
}

function terrainHeight(worldX, worldZ) {
  const nx = worldX * 0.004;
  const nz = worldZ * 0.004;

  const macro  = valueNoise2D(nx * 1.0 + 0.0,  nz * 1.0 + 0.0 ) * 10.0;
  const mid    = valueNoise2D(nx * 2.3 + 5.1,  nz * 2.3 + 3.7 ) *  4.0;
  const fine   = valueNoise2D(nx * 6.0 + 11.3, nz * 6.0 + 8.9 ) *  1.2;
  const bowl   = Math.cos(worldX * 0.007) * Math.cos(worldZ * 0.007) * 2.5;

  return macro + mid + fine + bowl;
}

// Chunk-based terrain constants
const CHUNK_SIZE = 128;   // world units per chunk
const CHUNK_SEGS = 32;    // grid resolution per chunk
const CHUNK_VERTS = (CHUNK_SEGS + 1) * (CHUNK_SEGS + 1);

// Build heights array for a chunk at grid position (cx, cz)
function buildChunkHeights(cx, cz) {
  const heights = new Float32Array(CHUNK_VERTS);
  const originX = cx * CHUNK_SIZE;
  const originZ = cz * CHUNK_SIZE;

  for (let row = 0; row <= CHUNK_SEGS; row++) {
    for (let col = 0; col <= CHUNK_SEGS; col++) {
      const wx = originX + (col / CHUNK_SEGS) * CHUNK_SIZE;
      const wz = originZ + (row / CHUNK_SEGS) * CHUNK_SIZE;
      heights[row * (CHUNK_SEGS + 1) + col] = terrainHeight(wx, wz);
    }
  }
  return heights;
}

// Build Three.js mesh for a chunk
function buildChunkMesh(cx, cz, heights) {
  const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_SEGS, CHUNK_SEGS);
  geo.rotateX(-Math.PI / 2);

  const originX = cx * CHUNK_SIZE + CHUNK_SIZE * 0.5;
  const originZ = cz * CHUNK_SIZE + CHUNK_SIZE * 0.5;
  geo.translate(originX, 0, originZ);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heights[i]);
  }
  geo.computeVertexNormals();

  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const h = heights[i];
    let r, g, b;
    if      (h < 1.5)  { r=0.28; g=0.42; b=0.22; }
    else if (h < 5.0)  { r=0.50; g=0.44; b=0.30; }
    else if (h < 10.0) { r=0.43; g=0.38; b=0.33; }
    else               { r=0.58; g=0.55; b=0.52; }
    const seed = noiseHash(i * 0.1 + cx * 73.1 + cz * 137.3);
    col[i*3+0] = r + (seed - 0.5) * 0.06;
    col[i*3+1] = g + (noiseHash(seed * 97.1) - 0.5) * 0.05;
    col[i*3+2] = b + (noiseHash(seed * 31.7) - 0.5) * 0.05;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
