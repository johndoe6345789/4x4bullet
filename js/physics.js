'use strict';

// Bullet physics globals
var Ammo;
var physWorld;
var vehicleBody;
var vehicle;
var vehicleTuning;

// Reusable btVector3 triplet for triangle building — avoids 12k allocations per chunk
var _tv0, _tv1, _tv2, _tv3, _tv4, _tv5;

function initBulletWorld(AmmoLib) {
  Ammo = AmmoLib;

  const broadphase      = new Ammo.btDbvtBroadphase();
  const collisionConfig = new Ammo.btDefaultCollisionConfiguration();
  const dispatcher      = new Ammo.btCollisionDispatcher(collisionConfig);
  const solver          = new Ammo.btSequentialImpulseConstraintSolver();

  physWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfig);
  physWorld.setGravity(new Ammo.btVector3(0, -20, 0));

  // Allocate reusable triangle vertices once
  _tv0 = new Ammo.btVector3(); _tv1 = new Ammo.btVector3();
  _tv2 = new Ammo.btVector3(); _tv3 = new Ammo.btVector3();
  _tv4 = new Ammo.btVector3(); _tv5 = new Ammo.btVector3();
}

// Build a Bullet collision body for one terrain chunk
function buildChunkBody(cx, cz, heights) {
  const segs1 = CHUNK_SEGS + 1;
  const triMesh = new Ammo.btTriangleMesh(true, false);
  const originX = cx * CHUNK_SIZE;
  const originZ = cz * CHUNK_SIZE;
  const step = CHUNK_SIZE / CHUNK_SEGS;

  for (let row = 0; row < CHUNK_SEGS; row++) {
    for (let col = 0; col < CHUNK_SEGS; col++) {
      const x0 = originX + col * step;
      const x1 = x0 + step;
      const z0 = originZ + row * step;
      const z1 = z0 + step;

      const h00 = heights[ row      * segs1 + col     ];
      const h10 = heights[ row      * segs1 + col + 1 ];
      const h01 = heights[(row + 1) * segs1 + col     ];
      const h11 = heights[(row + 1) * segs1 + col + 1 ];

      // Reuse vectors instead of allocating new ones
      _tv0.setValue(x0, h00, z0); _tv1.setValue(x1, h10, z0); _tv2.setValue(x0, h01, z1);
      triMesh.addTriangle(_tv0, _tv1, _tv2, false);

      _tv3.setValue(x1, h10, z0); _tv4.setValue(x1, h11, z1); _tv5.setValue(x0, h01, z1);
      triMesh.addTriangle(_tv3, _tv4, _tv5, false);
    }
  }

  const shape = new Ammo.btBvhTriangleMeshShape(triMesh, true, true);
  const transform = new Ammo.btTransform();
  transform.setIdentity();

  const motionState = new Ammo.btDefaultMotionState(transform);
  const localInertia = new Ammo.btVector3(0, 0, 0);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, localInertia);
  const body = new Ammo.btRigidBody(rbInfo);
  body.setFriction(0.8);
  body.setRestitution(0.0);
  physWorld.addRigidBody(body);

  // Clean up construction temporaries
  Ammo.destroy(transform);
  Ammo.destroy(localInertia);
  Ammo.destroy(rbInfo);
  Ammo.destroy(motionState);

  return { body, triMesh, shape };
}
