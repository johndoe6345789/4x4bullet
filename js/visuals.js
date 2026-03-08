'use strict';

var carGroup;
var wheelMeshes;

function buildCarVisual() {
  carGroup = new THREE.Group();
  scene.add(carGroup);

  const bodyMat  = new THREE.MeshLambertMaterial({ color: 0xc42000 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x7799bb, transparent: true, opacity: 0.45 });
  const chromeMat= new THREE.MeshLambertMaterial({ color: 0xbbbbbb });

  // Main body tub
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 3.7), bodyMat);
  body.position.y = 0.38;
  body.castShadow = true;
  carGroup.add(body);

  // Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, 2.1), bodyMat);
  cab.position.set(0, 1.1, -0.15);
  cab.castShadow = true;
  carGroup.add(cab);

  // Windscreen
  const wind = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.52, 0.08), glassMat);
  wind.position.set(0, 1.12, 0.9);
  wind.rotation.x = -0.22;
  carGroup.add(wind);

  // Rear window
  const rearWin = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.40, 0.08), glassMat);
  rearWin.position.set(0, 1.08, -1.22);
  rearWin.rotation.x = 0.18;
  carGroup.add(rearWin);

  // Side windows
  for (const sx of [-0.88, 0.88]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 1.4), glassMat);
    sw.position.set(sx, 1.1, -0.18);
    carGroup.add(sw);
  }

  // Bumpers
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 0.3), darkMat);
  bumperF.position.set(0, 0.18, 1.95);
  carGroup.add(bumperF);

  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.28, 0.28), darkMat);
  bumperR.position.set(0, 0.18, -1.95);
  carGroup.add(bumperR);

  // Roof rack
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 1.65), darkMat);
  rack.position.set(0, 1.45, -0.18);
  carGroup.add(rack);

  // Headlights
  const hlMat = new THREE.MeshLambertMaterial({ color: 0xffffee, emissive: 0xffffee, emissiveIntensity: 0.6 });
  for (const sx of [-0.65, 0.65]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.08), hlMat);
    hl.position.set(sx, 0.48, 1.9);
    carGroup.add(hl);
  }

  // Tail lights
  const tlMat = new THREE.MeshLambertMaterial({ color: 0xff1100, emissive: 0xff2200, emissiveIntensity: 0.4 });
  for (const sx of [-0.62, 0.62]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), tlMat);
    tl.position.set(sx, 0.46, -1.9);
    carGroup.add(tl);
  }

  // Exhaust pipe
  const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), chromeMat);
  exh.rotation.z = Math.PI / 2;
  exh.position.set(-1.05, 0.25, -1.7);
  carGroup.add(exh);

  // Wheels — purely visual, positioned by Bullet transforms
  wheelMeshes = [];
  const tyreMat = new THREE.MeshLambertMaterial({ color: 0x181818 });
  const rimMat  = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
  const boltMat = new THREE.MeshLambertMaterial({ color: 0x777777 });

  for (let i = 0; i < 4; i++) {
    const wg = new THREE.Group();
    scene.add(wg);

    const tyreGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.36, 16);
    tyreGeo.rotateZ(Math.PI / 2);
    const tyre = new THREE.Mesh(tyreGeo, tyreMat);
    tyre.castShadow = true;
    wg.add(tyre);

    const rimGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.37, 8);
    rimGeo.rotateZ(Math.PI / 2);
    wg.add(new THREE.Mesh(rimGeo, rimMat));

    for (let b = 0; b < 5; b++) {
      const angle = (b / 5) * Math.PI * 2;
      const bolt  = new THREE.Mesh(new THREE.SphereGeometry(0.038, 4, 4), boltMat);
      const faceX = (i % 2 === 0) ? -0.20 : 0.20;
      bolt.position.set(faceX, Math.sin(angle) * 0.12, Math.cos(angle) * 0.12);
      wg.add(bolt);
    }

    wheelMeshes.push(wg);
  }
}
