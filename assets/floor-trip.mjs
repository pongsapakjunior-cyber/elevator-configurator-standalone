// Viewer motion only: floor heights and configured speed are copied, never
// written back to the configurator or its customer URL.
export function createFloorTrip(floors, speed = 1) {
  if (!Array.isArray(floors) || floors.length === 0 || floors.some((y, i) => !Number.isFinite(y) || (i > 0 && y <= floors[i - 1]))) {
    throw new TypeError('Floor heights must be a nonempty, strictly increasing array.');
  }
  if (!Number.isFinite(speed) || speed <= 0) throw new TypeError('Trip speed must be positive and finite.');
  const stops = floors.slice(), ACCELERATION = 0.7, DOOR_SECONDS = 1.6, BRAKE_SECONDS = 0.5;
  const ease = u => u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2;
  const profile = distance => {
    const ramp = speed / ACCELERATION, rampDistance = 0.5 * ACCELERATION * ramp * ramp;
    if (2 * rampDistance >= distance) {
      const half = Math.sqrt(distance / ACCELERATION), duration = 2 * half;
      return { duration, at: t => t < half ? 0.5 * ACCELERATION * t * t : distance - 0.5 * ACCELERATION * (duration - t) ** 2 };
    }
    const cruise = (distance - 2 * rampDistance) / speed, duration = 2 * ramp + cruise;
    return { duration, at: t => t < ramp ? 0.5 * ACCELERATION * t * t
      : t < ramp + cruise ? rampDistance + speed * (t - ramp)
        : distance - 0.5 * ACCELERATION * (duration - t) ** 2 };
  };
  const validIndex = index => Number.isInteger(index) && index >= 0 && index < stops.length;
  const snapshot = () => current ? { ...current } : null;
  let current = null, stages = [], stageIndex = 0, elapsed = 0, paused = false;
  let target = null, pending = null, active = false;

  const readPose = input => {
    if (!input || !Number.isFinite(input.y) || input.y < stops[0] || input.y > stops.at(-1)) return null;
    const door = input.door ?? 0, brake = input.brake ?? 0;
    if (![door, brake].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) return null;
    const exactStop = stops.indexOf(input.y);
    const doorFloor = input.doorFloor ?? (exactStop >= 0 ? exactStop : 0);
    if (!validIndex(doorFloor)) return null;
    // Reject inconsistent input instead of moving an open car between landings.
    if (door > 0 && (exactStop !== doorFloor || brake > 0)) return null;
    return { y: input.y, door, doorFloor, brake };
  };
  function begin(index, start) {
    target = index; current = { ...start }; stages = []; stageIndex = 0; elapsed = 0;
    let from = { ...start };
    const transition = (phase, to, seconds) => {
      if (seconds > 0) stages.push({ phase, duration: seconds, from: { ...from }, to: { ...to } });
      from = { ...to };
    };
    if (start.y !== stops[index]) {
      transition('closing', { ...from, door: 0 }, DOOR_SECONDS * from.door);
      transition('releasing', { ...from, brake: 1 }, BRAKE_SECONDS * (1 - from.brake));
      const motion = profile(Math.abs(stops[index] - start.y));
      stages.push({ phase: 'moving', duration: motion.duration, from: { ...from },
        to: { y: stops[index], door: 0, doorFloor: index, brake: 1 }, motion,
        direction: Math.sign(stops[index] - start.y) });
      from = { y: stops[index], door: 0, doorFloor: index, brake: 1 };
    }
    transition('braking', { ...from, brake: 0, doorFloor: index }, BRAKE_SECONDS * from.brake);
    transition('opening', { y: stops[index], door: 1, doorFloor: index, brake: 0 }, DOOR_SECONDS * (1 - from.door));
    active = stages.length > 0;
    if (!active) current = from;
  }
  function finish() {
    active = false;
    if (pending !== null) {
      const next = pending; pending = null;
      if (next !== target) begin(next, current);
    }
  }
  const api = {
    request(index, currentPose = current) {
      if (!validIndex(index)) return false;
      // A newer request changes only the queue; the running leg remains
      // continuous and reaches its safe, open-door stop before another starts.
      if (active) { pending = index === target ? null : index; return true; }
      const start = readPose(currentPose);
      if (!start) return false;
      pending = null; begin(index, start); return true;
    },
    step(dt = 0) {
      if (paused || !active || !Number.isFinite(dt) || dt <= 0) return snapshot();
      let remaining = dt;
      while (active && remaining > 0) {
        const stage = stages[stageIndex], advance = Math.min(remaining, stage.duration - elapsed);
        elapsed += advance; remaining -= advance;
        const u = Math.min(1, elapsed / stage.duration);
        if (stage.phase === 'moving') {
          current = { ...stage.from, y: stage.from.y + stage.direction * stage.motion.at(elapsed), door: 0, brake: 1 };
        } else {
          const amount = ease(u);
          current = { y: stage.from.y, doorFloor: stage.from.doorFloor,
            door: stage.from.door + (stage.to.door - stage.from.door) * amount,
            brake: stage.from.brake + (stage.to.brake - stage.from.brake) * amount };
        }
        if (elapsed >= stage.duration) {
          // Exact endpoint assignment keeps landing coordinates and door-floor
          // indices aligned, without accumulating floating-point drift.
          current = { ...stage.to }; elapsed = 0; stageIndex++;
          if (stageIndex >= stages.length) finish();
        }
      }
      return snapshot();
    },
    pause() { paused = true; },
    resume() { paused = false; },
    get active() { return active; },
    get paused() { return paused; },
    get targetIndex() { return target; },
    get pendingIndex() { return pending; },
    get phase() { return active ? stages[stageIndex].phase : 'idle'; },
    get pose() { return snapshot(); },
  };
  return api;
}
