'use strict';

// Chassis dimensions (half-extents)
const CHASSIS_HALF_W   = 1.05;
const CHASSIS_HALF_H   = 0.35;
const CHASSIS_HALF_L   = 1.90;

// Wheel layout — chassis-local connection points
const WHEEL_DEFS = [
  { name: 'FL', cx: -1.1, cy: -0.1, cz:  1.6, front: true  },
  { name: 'FR', cx:  1.1, cy: -0.1, cz:  1.6, front: true  },
  { name: 'RL', cx: -1.1, cy: -0.1, cz: -1.6, front: false },
  { name: 'RR', cx:  1.1, cy: -0.1, cz: -1.6, front: false },
];

const WHEEL_RADIUS       = 0.42;
const SUSPENSION_REST    = 0.55;
const SUSPENSION_STIFF   = 22.0;
const SUSPENSION_DAMP_C  = 2.8;
const SUSPENSION_DAMP_R  = 4.2;
const SUSPENSION_TRAVEL  = 0.4;
const WHEEL_FRICTION     = 3.5;
const ROLL_INFLUENCE     = 0.12;

// Engine/drivetrain
const MAX_ENGINE_FORCE   = 5500;
const MAX_BRAKE_FORCE    = 80;
const HANDBRAKE_FORCE    = 120;
const MAX_STEER_ANGLE    = 0.52;
const STEER_SPEED        = 3.5;
const CHASSIS_MASS       = 1600;

// Auto-gearbox
const GEAR_RATIOS  = [3.8, 2.2, 1.5, 1.0, 0.72, 0.55];
const FINAL_DRIVE  = 4.0;
const MAX_RPM      = 7000;
const IDLE_RPM     = 850;

function buildVehicle(spawnX, spawnY, spawnZ) {
  const chassisShape = new Ammo.btBoxShape(
    new Ammo.btVector3(CHASSIS_HALF_W, CHASSIS_HALF_H, CHASSIS_HALF_L)
  );

  const localCoMOffset = new Ammo.btVector3(0, -0.15, 0);
  const compound = new Ammo.btCompoundShape();
  const localTransform = new Ammo.btTransform();
  localTransform.setIdentity();
  localTransform.setOrigin(localCoMOffset);
  compound.addChildShape(localTransform, chassisShape);

  const startTransform = new Ammo.btTransform();
  startTransform.setIdentity();
  startTransform.setOrigin(new Ammo.btVector3(spawnX, spawnY, spawnZ));

  const localInertia = new Ammo.btVector3(0, 0, 0);
  compound.calculateLocalInertia(CHASSIS_MASS, localInertia);

  const motionState = new Ammo.btDefaultMotionState(startTransform);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    CHASSIS_MASS, motionState, compound, localInertia
  );

  vehicleBody = new Ammo.btRigidBody(rbInfo);
  vehicleBody.setActivationState(4);
  if (vehicleBody.setDamping) {
    vehicleBody.setDamping(0.02, 0.05);
  }
  physWorld.addRigidBody(vehicleBody);

  vehicleTuning = new Ammo.btVehicleTuning();
  const vehicleRayCaster = new Ammo.btDefaultVehicleRaycaster(physWorld);

  vehicle = new Ammo.btRaycastVehicle(vehicleTuning, vehicleBody, vehicleRayCaster);
  vehicle.setCoordinateSystem(0, 1, 2);
  physWorld.addAction(vehicle);

  const wheelDirection = new Ammo.btVector3(0, -1, 0);
  const wheelAxle      = new Ammo.btVector3(-1, 0, 0);

  for (const def of WHEEL_DEFS) {
    const connectionPt = new Ammo.btVector3(def.cx, def.cy, def.cz);
    const wheelInfo = vehicle.addWheel(
      connectionPt, wheelDirection, wheelAxle,
      SUSPENSION_REST, WHEEL_RADIUS, vehicleTuning, def.front
    );

    wheelInfo.set_m_suspensionStiffness(SUSPENSION_STIFF);
    wheelInfo.set_m_wheelsDampingCompression(SUSPENSION_DAMP_C);
    wheelInfo.set_m_wheelsDampingRelaxation(SUSPENSION_DAMP_R);
    wheelInfo.set_m_frictionSlip(WHEEL_FRICTION);
    wheelInfo.set_m_rollInfluence(ROLL_INFLUENCE);
    wheelInfo.set_m_maxSuspensionTravelCm(SUSPENSION_TRAVEL * 100);
    wheelInfo.set_m_maxSuspensionForce(80000);
  }
}
