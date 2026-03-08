'use strict';

// HUD
function updateHUD() {
  const kmh = getSpeedKmh();
  document.getElementById('speed-num').textContent = Math.round(kmh);
  document.getElementById('gear-display').textContent = drive.gear;

  const rpmPct = Math.min(100, (drive.rpm / MAX_RPM) * 100);
  document.getElementById('rpm-fill').style.width = rpmPct + '%';
  document.getElementById('rpm-fill').style.background =
    rpmPct > 88 ? '#ff2200' : '#ff8c00';

  const t   = drive.lapTime;
  const min = Math.floor(t / 60);
  const sec = Math.floor(t % 60).toString().padStart(2, '0');
  const ms  = Math.floor((t % 1) * 1000).toString().padStart(3, '0');
  document.getElementById('lap-time').textContent = `${min}:${sec}.${ms}`;
  document.getElementById('lap-label').textContent = `LAP ${drive.lapCount + 1}`;
}

// Input
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === 'KeyR' && drive.running) resetVehicle();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Main loop
const PHYSICS_SUBSTEPS = 3;
const PHYSICS_FIXED_DT = 1/120;

var lastTime = 0;
var chunkTimer = 0;

function mainLoop(timestamp) {
  requestAnimationFrame(mainLoop);

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (drive.running) {
    updateVehicleDrive(dt, keys);
    physWorld.stepSimulation(dt, PHYSICS_SUBSTEPS, PHYSICS_FIXED_DT);
    syncChassisToThree();
    syncWheelsToThree();
    checkCheckpointTrigger(carGroup.position.x, carGroup.position.z);
    updateDust(dt);
    updateCamera(dt);
    updateHUD();

    // Stream terrain chunks around the vehicle (throttled)
    chunkTimer += dt;
    if (chunkTimer > 0.5) {
      chunkTimer = 0;
      updateChunks(carGroup.position.x, carGroup.position.z);
    }
  }

  renderer.render(scene, camera);
}

// Loading helpers
function setLoadStatus(text, pct) {
  document.getElementById('loading-status').textContent = text;
  document.getElementById('loading-bar').style.width = pct + '%';
}

function startRace() {
  document.getElementById('title').style.display = 'none';
  drive.running = true;
  lastTime = performance.now();
  requestAnimationFrame(mainLoop);
}

async function boot() {
  setLoadStatus('LOADING AMMO.JS...', 5);
  await window.__ammoReady;

  const AmmoLib = await (async () => {
    const raw = window.Ammo;
    if (!raw) throw new Error('Ammo.js did not load — check CDN');
    if (typeof raw === 'function') {
      const result = raw();
      return (result && typeof result.then === 'function') ? await result : result;
    }
    return raw;
  })();

  setLoadStatus('INIT BULLET WORLD...', 20);
  initBulletWorld(AmmoLib);
  btTmp = new AmmoLib.btTransform();

  setLoadStatus('BUILDING THREE.JS SCENE...', 40);
  initThree();

  setLoadStatus('LOADING TERRAIN CHUNKS...', 55);
  // Load initial chunks around spawn (0, 0)
  updateChunks(0, 0);

  setLoadStatus('PLACING CHECKPOINTS...', 72);
  buildCheckpoints(scene);

  setLoadStatus('BUILDING VEHICLE...', 82);
  const spawnY = terrainHeight(0, 0) + 2.5;
  buildVehicle(0, spawnY, 0);
  buildCarVisual();

  setLoadStatus('BUILDING EFFECTS...', 92);
  buildDustSystem();

  setLoadStatus('READY', 100);
  await new Promise(r => setTimeout(r, 300));

  document.getElementById('loading').style.display = 'none';
  document.getElementById('title').style.display = 'flex';
}

boot().catch(err => {
  document.getElementById('loading-status').textContent = 'ERROR: ' + err.message;
  console.error(err);
});
