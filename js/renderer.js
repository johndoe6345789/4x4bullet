'use strict';

var renderer, scene, camera;
var camHeading = 0;

// Reusable vector for camera — avoids allocation every frame
var _camTarget = null;

function initThree() {
  const canvas = document.getElementById('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7a8a9a);
  scene.fog        = new THREE.Fog(0x7a8a9a, 90, 380);

  const sun = new THREE.DirectionalLight(0xfff0d0, 1.9);
  sun.position.set(100, 160, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near   = 1;
  sun.shadow.camera.far    = 600;
  sun.shadow.camera.left   = -180;
  sun.shadow.camera.right  =  180;
  sun.shadow.camera.top    =  180;
  sun.shadow.camera.bottom = -180;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0x3050a0, 0.65);
  scene.add(ambient);

  const fill = new THREE.DirectionalLight(0x7090c0, 0.35);
  fill.position.set(-80, 50, -60);
  scene.add(fill);

  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.3, 600);
  camera.position.set(0, 8, -12);

  _camTarget = new THREE.Vector3();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Reusable Ammo transform
var btTmp;

// Cached wheel HUD dots
var _wDots = [];
function initWheelDots() {
  _wDots = ['w-fl','w-fr','w-rl','w-rr'].map(id => document.getElementById(id));
}

function syncChassisToThree() {
  vehicleBody.getMotionState().getWorldTransform(btTmp);

  const origin = btTmp.getOrigin();
  carGroup.position.set(origin.x(), origin.y(), origin.z());

  const q = btTmp.getRotation();
  carGroup.quaternion.set(q.x(), q.y(), q.z(), q.w());
}

function syncWheelsToThree() {
  for (let i = 0; i < 4; i++) {
    vehicle.updateWheelTransform(i, true);
    const wt = vehicle.getWheelTransformWS(i);

    const o = wt.getOrigin();
    wheelMeshes[i].position.set(o.x(), o.y(), o.z());

    const q = wt.getRotation();
    wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());

    const wi = vehicle.getWheelInfo(i);
    const onGround = wi.get_m_raycastInfo().get_m_isInContact();
    _wDots[i].className = onGround ? 'w-dot' : 'w-dot air';

    if (onGround && i >= 2 && getSpeedKmh() > 8) {
      if (Math.random() < 0.18) {
        const chassis = vehicleBody.getLinearVelocity();
        spawnDust(o.x(), o.y() + 0.1, o.z(), chassis.x(), chassis.z());
      }
    }
  }
}

const CAM_DISTANCE = 10;
const CAM_HEIGHT   = 3.8;
const CAM_LAG      = 4.5;

function updateCamera(dt) {
  const q = carGroup.quaternion;
  const chassisYaw = Math.atan2(
    2 * (q.w * q.y + q.x * q.z),
    1 - 2 * (q.y * q.y + q.z * q.z)
  );

  let diff = chassisYaw - camHeading;
  if (diff >  Math.PI) diff -= 6.283185307;
  if (diff < -Math.PI) diff += 6.283185307;
  camHeading += diff * Math.min(1, dt * CAM_LAG);

  const tx = carGroup.position.x - Math.sin(camHeading) * CAM_DISTANCE;
  const tz = carGroup.position.z - Math.cos(camHeading) * CAM_DISTANCE;
  const groundUnderCam = terrainHeight(tx, tz);
  const ty = Math.max(groundUnderCam + 1.8, carGroup.position.y + CAM_HEIGHT);

  // Reuse _camTarget instead of allocating new Vector3 every frame
  _camTarget.set(tx, ty, tz);
  camera.position.lerp(_camTarget, Math.min(1, dt * 7));

  const lookX = carGroup.position.x + Math.sin(chassisYaw) * 4;
  const lookZ = carGroup.position.z + Math.cos(chassisYaw) * 4;
  camera.lookAt(lookX, carGroup.position.y + 0.8, lookZ);

  // Only update projection matrix when FOV actually changes
  const newFov = 72 + getSpeedKmh() * 0.10;
  if (Math.abs(camera.fov - newFov) > 0.1) {
    camera.fov = newFov;
    camera.updateProjectionMatrix();
  }
}
