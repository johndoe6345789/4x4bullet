'use strict';

// Vehicle drive state
const drive = {
  engineForce  : 0,
  brakeForce   : 0,
  steerCurrent : 0,
  steerTarget  : 0,
  gear         : 1,
  rpm          : IDLE_RPM,
  lapTime      : 0,
  lapCount     : 0,
  bestLap      : Infinity,
  nextCP       : 0,
  running      : false,
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function getSpeedKmh() {
  const v = vehicleBody.getLinearVelocity();
  const ms = Math.sqrt(v.x() * v.x() + v.y() * v.y() + v.z() * v.z());
  return ms * 3.6;
}

function updateVehicleDrive(dt, keys) {
  if (!drive.running) return;

  const throttle   = (keys['KeyW'] || keys['ArrowUp'])    ? 1 : 0;
  const braking    = (keys['KeyS'] || keys['ArrowDown'])  ? 1 : 0;
  const steerLeft  = (keys['KeyA'] || keys['ArrowLeft'])  ? 1 : 0;
  const steerRight = (keys['KeyD'] || keys['ArrowRight']) ? 1 : 0;
  const handbrake  = keys['Space'] || false;

  // Steering interpolation
  drive.steerTarget = (steerLeft - steerRight) * MAX_STEER_ANGLE;
  const steerDelta  = drive.steerTarget - drive.steerCurrent;
  drive.steerCurrent += clamp(steerDelta, -STEER_SPEED * dt, STEER_SPEED * dt);

  vehicle.setSteeringValue(drive.steerCurrent, 0);
  vehicle.setSteeringValue(drive.steerCurrent, 1);

  // Speed + auto gear
  const speedKmh  = getSpeedKmh();
  const speedAbs  = speedKmh;

  if      (speedAbs >  130 && drive.gear < 6) drive.gear = 6;
  else if (speedAbs >   95 && drive.gear < 5) drive.gear = 5;
  else if (speedAbs >   65 && drive.gear < 4) drive.gear = 4;
  else if (speedAbs >   40 && drive.gear < 3) drive.gear = 3;
  else if (speedAbs >   18 && drive.gear < 2) drive.gear = 2;
  else if (speedAbs <   12 && drive.gear > 2) drive.gear = 2;
  else if (speedAbs <    6 && drive.gear > 1) drive.gear = 1;

  // RPM simulation
  const ratio = GEAR_RATIOS[drive.gear - 1] * FINAL_DRIVE;
  const targetRPM = speedAbs * ratio * 10.5 + IDLE_RPM;
  drive.rpm += (targetRPM - drive.rpm) * Math.min(1, dt * 4);
  drive.rpm  = clamp(drive.rpm, IDLE_RPM, MAX_RPM * 1.08);

  // Engine force with torque curve
  const rpmFrac     = clamp(drive.rpm / MAX_RPM, 0, 1);
  const torqueCurve = Math.sin(rpmFrac * Math.PI * 0.88) * 0.9 + 0.1;
  drive.engineForce = throttle * MAX_ENGINE_FORCE * torqueCurve;

  if (!throttle && !braking && !handbrake) {
    drive.engineForce = -clamp(speedAbs * 8, 0, 400);
  }

  // AWD — all 4 wheels
  vehicle.applyEngineForce(drive.engineForce, 0);
  vehicle.applyEngineForce(drive.engineForce, 1);
  vehicle.applyEngineForce(drive.engineForce, 2);
  vehicle.applyEngineForce(drive.engineForce, 3);

  // Braking
  const frontBrake = braking ? MAX_BRAKE_FORCE : 0;
  const rearBrake  = braking ? MAX_BRAKE_FORCE :
                     handbrake ? HANDBRAKE_FORCE : 0;

  vehicle.setBrake(frontBrake, 0);
  vehicle.setBrake(frontBrake, 1);
  vehicle.setBrake(rearBrake,  2);
  vehicle.setBrake(rearBrake,  3);

  drive.lapTime += dt;
}

function resetVehicle() {
  const spawnY = terrainHeight(0, 0) + 2.5;
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(0, spawnY, 0));
  vehicleBody.setWorldTransform(transform);
  vehicleBody.getMotionState().setWorldTransform(transform);
  vehicleBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
  vehicleBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
  vehicleBody.activate();
  drive.steerCurrent = 0;
}
