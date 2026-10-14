import test from 'node:test';
import assert from 'node:assert/strict';
import { createFloorTrip } from '../assets/floor-trip.mjs';

const floors = Object.freeze([1.4, 4.8, 8.4, 12.6]);
const at = (index, extra = {}) => ({ y: floors[index], door: 1, doorFloor: index, brake: 0, ...extra });
const finish = (trip, limit = 3000, dt = 0.01) => {
  let count = 0;
  while (trip.active && count++ < limit) trip.step(dt);
  assert.ok(!trip.active, 'trip completes in bounded time');
  return trip.pose;
};
const safe = pose => {
  assert.ok([pose.y, pose.door, pose.brake].every(Number.isFinite));
  assert.ok(pose.door >= 0 && pose.door <= 1);
  assert.ok(pose.brake >= 0 && pose.brake <= 1);
  if (pose.door > 0) {
    assert.equal(pose.y, floors[pose.doorFloor], 'doors open only at their exact landing');
    assert.equal(pose.brake, 0, 'brake is engaged while doors open');
  }
};

test('floor list and incoming pose remain unchanged; snapshots are independent', () => {
  const pose = Object.freeze(at(0)), trip = createFloorTrip(floors, 1);
  assert.equal(trip.pose, null);
  assert.equal(trip.request(2, pose), true);
  assert.deepEqual(trip.step(0), pose);
  const copy = trip.pose; copy.y = 99;
  assert.deepEqual(trip.pose, pose);
  finish(trip);
  assert.deepEqual(pose, at(0));
  assert.deepEqual(floors, [1.4, 4.8, 8.4, 12.6]);
});

test('upward trip closes doors, accelerates/decelerates within configured speed and opens at target', () => {
  const speed = 1.75, dt = 0.005, trip = createFloorTrip(floors, speed);
  trip.request(2, at(0));
  let previous = trip.pose, previousVelocity = 0, sawMoving = false, sawSlowing = false;
  for (let i = 0; trip.active && i < 5000; i++) {
    const pose = trip.step(dt), velocity = (pose.y - previous.y) / dt;
    safe(pose);
    assert.ok(velocity >= -1e-9 && velocity <= speed + 1e-9, 'bounded upward speed');
    assert.ok(Math.abs(velocity - previousVelocity) <= 0.7 * dt + 1e-7, 'continuous speed with bounded acceleration');
    if (velocity > 0) { sawMoving = true; assert.equal(pose.door, 0); }
    if (previousVelocity > 0.01 && velocity < previousVelocity) sawSlowing = true;
    previous = pose; previousVelocity = velocity;
  }
  assert.ok(!trip.active && sawMoving && sawSlowing);
  assert.deepEqual(trip.pose, at(2));
});

test('downward trip respects speed and does not overshoot', () => {
  const speed = 0.8, trip = createFloorTrip(floors, speed), dt = 0.02;
  trip.request(0, at(3));
  let previous = trip.pose;
  for (let i = 0; trip.active && i < 2000; i++) {
    const pose = trip.step(dt); safe(pose);
    assert.ok(pose.y <= previous.y + 1e-9 && pose.y >= floors[0]);
    assert.ok(previous.y - pose.y <= speed * dt + 1e-9);
    previous = pose;
  }
  assert.deepEqual(trip.pose, at(0));
});

test('same-floor request keeps open doors or safely opens closed doors without movement', () => {
  const openTrip = createFloorTrip(floors, 1);
  assert.equal(openTrip.request(1, at(1)), true);
  assert.equal(openTrip.active, false);
  assert.deepEqual(openTrip.pose, at(1));
  const closedTrip = createFloorTrip(floors, 1);
  closedTrip.request(1, at(1, { door: 0, brake: 1 }));
  while (closedTrip.active) { const pose = closedTrip.step(0.02); safe(pose); assert.equal(pose.y, floors[1]); }
  assert.deepEqual(closedTrip.pose, at(1));
});

test('invalid floor, pose and time inputs cannot change a running trip', () => {
  const trip = createFloorTrip(floors, 1);
  for (const index of [-1, 4, 1.1, '1', NaN, Infinity]) assert.equal(trip.request(index, at(0)), false);
  for (const pose of [null, { y: 99 }, { y: 3, door: 1 }, at(0, { door: 2 }), at(0, { brake: -1 }), at(0, { doorFloor: 4 })]) assert.equal(trip.request(1, pose), false);
  assert.equal(trip.active, false);
  trip.request(2, at(0)); trip.step(2.5);
  const previous = trip.pose;
  for (const dt of [-1, NaN, Infinity, 0]) assert.deepEqual(trip.step(dt), previous);
  assert.equal(trip.request(10), false);
  assert.deepEqual(trip.pose, previous);
  assert.throws(() => createFloorTrip([1, 1], 1), TypeError);
  assert.throws(() => createFloorTrip([], 1), TypeError);
  assert.throws(() => createFloorTrip(floors, 0), TypeError);
});

test('new requests during motion queue only the latest destination without teleporting', () => {
  const trip = createFloorTrip(floors, 1.5);
  trip.request(3, at(0));
  while (trip.phase !== 'moving') trip.step(0.01);
  trip.step(1);
  const midway = trip.pose;
  trip.request(0, at(0)); trip.request(1, at(0));
  assert.equal(trip.targetIndex, 3);
  assert.equal(trip.pendingIndex, 1);
  assert.deepEqual(trip.pose, midway, 'stale external pose does not reset an active trip');
  const openStops = new Set();
  let previous = trip.pose;
  for (let i = 0; trip.active && i < 5000; i++) {
    const pose = trip.step(0.01); safe(pose);
    assert.ok(Math.abs(pose.y - previous.y) <= 1.5 * 0.01 + 1e-9);
    if (pose.door > 0) openStops.add(pose.doorFloor);
    previous = pose;
  }
  assert.deepEqual(trip.pose, at(1));
  assert.deepEqual([...openStops], [3, 1]);
  assert.equal(trip.pendingIndex, null);
});

test('requesting the current destination cancels a pending redirect', () => {
  const trip = createFloorTrip(floors, 1);
  trip.request(2, at(0)); trip.step(3);
  trip.request(1); trip.request(2);
  assert.equal(trip.pendingIndex, null);
  assert.deepEqual(finish(trip), at(2));
});

test('pause/resume freezes position and resumes the same motion timeline', () => {
  const trip = createFloorTrip(floors, 1.5);
  trip.request(2, at(0)); trip.step(3.5);
  assert.equal(trip.phase, 'moving');
  const paused = trip.pose;
  trip.pause();
  for (let i = 0; i < 100; i++) assert.deepEqual(trip.step(1), paused);
  trip.resume();
  assert.deepEqual(trip.step(0), paused);
  const resumed = trip.step(0.02);
  assert.ok(resumed.y >= paused.y && resumed.y - paused.y <= 1.5 * 0.02 + 1e-9);
  assert.deepEqual(finish(trip), at(2));
});

test('taking over between floors preserves the supplied pose and opens only upon arrival', () => {
  const trip = createFloorTrip(floors, 1.75), start = { y: 3.2, door: 0, doorFloor: 0, brake: 1 };
  trip.request(2, start);
  assert.deepEqual(trip.step(0), start);
  let previous = trip.pose;
  while (trip.active) {
    const pose = trip.step(0.01); safe(pose);
    assert.ok(Math.abs(pose.y - previous.y) <= 1.75 * 0.01 + 1e-9);
    previous = pose;
  }
  assert.deepEqual(trip.pose, at(2));
});

test('time chunking does not alter position, doors or phase', () => {
  const a = createFloorTrip(floors, 1.75), b = createFloorTrip(floors, 1.75);
  a.request(3, at(0)); b.request(3, at(0));
  a.step(6.7);
  for (let i = 0; i < 670; i++) b.step(0.01);
  for (const key of ['y', 'door', 'brake']) assert.ok(Math.abs(a.pose[key] - b.pose[key]) < 1e-9);
  assert.equal(a.phase, b.phase);
  assert.equal(a.pose.doorFloor, b.pose.doorFloor);
  assert.deepEqual(a.step(100), at(3));
});
