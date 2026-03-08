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

// Terrain grid constants
const TERRAIN_SIZE     = 512;
const TERRAIN_SEGMENTS = 128;
const TERRAIN_VERTEX_COUNT = (TERRAIN_SEGMENTS + 1) * (TERRAIN_SEGMENTS + 1);

function buildTerrainData() {
  const heights = new Float32Array(TERRAIN_VERTEX_COUNT);
  let minH = Infinity, maxH = -Infinity;

  for (let row = 0; row <= TERRAIN_SEGMENTS; row++) {
    for (let col = 0; col <= TERRAIN_SEGMENTS; col++) {
      const wx = (col / TERRAIN_SEGMENTS - 0.5) * TERRAIN_SIZE;
      const wz = (row / TERRAIN_SEGMENTS - 0.5) * TERRAIN_SIZE;
      const h  = terrainHeight(wx, wz);
      heights[row * (TERRAIN_SEGMENTS + 1) + col] = h;
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }
  }

  return { heights, minH, maxH };
}

function buildThreeTerrain(heights) {
  const geo = new THREE.PlaneGeometry(
    TERRAIN_SIZE, TERRAIN_SIZE,
    TERRAIN_SEGMENTS, TERRAIN_SEGMENTS
  );
  geo.rotateX(-Math.PI / 2);

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
    col[i*3+0] = r + (Math.random()-0.5)*0.06;
    col[i*3+1] = g + (Math.random()-0.5)*0.05;
    col[i*3+2] = b + (Math.random()-0.5)*0.05;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
