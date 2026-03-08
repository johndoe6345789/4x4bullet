'use strict';

const CP_POSITIONS = [
  [   0,    0], [ 70,  -55], [130,   15], [ 95,   90], [  15,  140],
  [ -55,  110], [-110,   35], [-95,  -55], [-38, -110], [  28,  -75],
];
const CP_RADIUS = 10;

const cpObjects = [];

function buildCheckpoints(scene) {
  for (let i = 0; i < CP_POSITIONS.length; i++) {
    const [cx, cz] = CP_POSITIONS[i];
    const cy = terrainHeight(cx, cz);
    const isStart = i === 0;
    const colour = isStart ? 0x00ff88 : 0xff8c00;
    const mat = new THREE.MeshLambertMaterial({ color: colour, transparent: true, opacity: 0.75 });

    const postGeo = new THREE.CylinderGeometry(0.18, 0.22, 9, 7);
    const post1   = new THREE.Mesh(postGeo, mat);
    const post2   = new THREE.Mesh(postGeo, mat);
    const barGeo  = new THREE.BoxGeometry(11, 0.28, 0.28);
    const bar     = new THREE.Mesh(barGeo, mat);

    post1.position.set(cx - 5.5, cy + 4.5, cz);
    post2.position.set(cx + 5.5, cy + 4.5, cz);
    bar.position.set(cx, cy + 9, cz);

    post1.castShadow = true;
    post2.castShadow = true;
    scene.add(post1); scene.add(post2); scene.add(bar);

    cpObjects.push({ x: cx, z: cz });
  }
}

function checkCheckpointTrigger(px, pz) {
  const cp = cpObjects[drive.nextCP];
  const dx = px - cp.x, dz = pz - cp.z;
  if (Math.sqrt(dx*dx + dz*dz) < CP_RADIUS) {
    drive.nextCP = (drive.nextCP + 1) % CP_POSITIONS.length;
    if (drive.nextCP === 0) {
      drive.lapCount++;
      if (drive.lapTime < drive.bestLap) drive.bestLap = drive.lapTime;
      drive.lapTime = 0;
    }
    flashCheckpoint();
  }
}

function flashCheckpoint() {
  const el = document.getElementById('cp-flash');
  el.style.opacity = '1';
  el.style.transition = 'none';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.9s';
      el.style.opacity = '0';
    });
  });
}
