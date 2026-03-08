'use strict';

// Bullet physics globals
var Ammo;
var physWorld;
var vehicleBody;
var vehicle;
var vehicleTuning;

function initBulletWorld(AmmoLib) {
  Ammo = AmmoLib;

  const broadphase      = new Ammo.btDbvtBroadphase();
  const collisionConfig = new Ammo.btDefaultCollisionConfiguration();
  const dispatcher      = new Ammo.btCollisionDispatcher(collisionConfig);
  const solver          = new Ammo.btSequentialImpulseConstraintSolver();

  physWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfig);
  physWorld.setGravity(new Ammo.btVector3(0, -20, 0));
}

// Build a Bullet collision body for one terrain chunk
function buildChunkBody(cx, cz, heights) {
  const segs1 = CHUNK_SEGS + 1;
  const triMesh = new Ammo.btTriangleMesh(true, false);
  const originX = cx * CHUNK_SIZE;
  const originZ = cz * CHUNK_SIZE;

  for (let row = 0; row < CHUNK_SEGS; row++) {
    for (let col = 0; col < CHUNK_SEGS; col++) {
      const x0 = originX + (col       / CHUNK_SEGS) * CHUNK_SIZE;
      const x1 = originX + ((col + 1) / CHUNK_SEGS) * CHUNK_SIZE;
      const z0 = originZ + (row       / CHUNK_SEGS) * CHUNK_SIZE;
      const z1 = originZ + ((row + 1) / CHUNK_SEGS) * CHUNK_SIZE;

      const h00 = heights[ row      * segs1 + col     ];
      const h10 = heights[ row      * segs1 + col + 1 ];
      const h01 = heights[(row + 1) * segs1 + col     ];
      const h11 = heights[(row + 1) * segs1 + col + 1 ];

      triMesh.addTriangle(
        new Ammo.btVector3(x0, h00, z0),
        new Ammo.btVector3(x1, h10, z0),
        new Ammo.btVector3(x0, h01, z1),
        false
      );
      triMesh.addTriangle(
        new Ammo.btVector3(x1, h10, z0),
        new Ammo.btVector3(x1, h11, z1),
        new Ammo.btVector3(x0, h01, z1),
        false
      );
    }
  }

  const shape = new Ammo.btBvhTriangleMeshShape(triMesh, true, true);
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(0, 0, 0));

  const motionState = new Ammo.btDefaultMotionState(transform);
  const localInertia = new Ammo.btVector3(0, 0, 0);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, localInertia);
  const body = new Ammo.btRigidBody(rbInfo);
  body.setFriction(0.8);
  body.setRestitution(0.0);
  physWorld.addRigidBody(body);

  return { body, triMesh };
}
