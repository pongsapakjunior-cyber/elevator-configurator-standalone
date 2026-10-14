import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSpeedRecommendation, estimateFlightSeconds } from '../assets/speed-recommendation.mjs';

const config = { capacity: 630, floors: 6, floorHeights: [3400, 3400, 3400, 3400, 3400], speed: 1 };
const planning = { buildingUse: 'residential', population: 120, liftCount: 2 };
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('existing customer parameters and planning inputs remain unchanged, including QR-related unknown fields', () => {
  const input = Object.freeze({ ...config, floorHeights: Object.freeze([...config.floorHeights]), speed: 1.25, project: 'Existing QR', extra: Object.freeze({ token: 'unchanged' }) });
  const plan = Object.freeze({ ...planning });
  const before = JSON.stringify([input, plan]);
  const result = analyzeSpeedRecommendation(input, plan);
  assert.equal(JSON.stringify([input, plan]), before);
  assert.equal(result.current.speedMps, 1.25);
  assert.deepEqual(result.candidates.map(candidate => candidate.speedMps), [1, 1.5, 1.75, 2.5]);
  assert.equal(result.mode, 'advice-only');
  assert.match(result.methodLabel, /Independent/);
  assert.ok(result.sources.some(source => source.url.includes('peters-research.com')));
  assert.doesNotMatch(JSON.stringify(result), /otis/i);
});

test('population alone produces no invented recommendation or group count', () => {
  const result = analyzeSpeedRecommendation({}, { population: 300 });
  assert.equal(result.status, 'needs-input');
  assert.equal(result.recommendationSpeedMps, null);
  assert.deepEqual(result.candidates, []);
  assert.ok(result.missingFields.includes('liftCount'));
  assert.ok(result.missingFields.includes('capacity'));
  assert.ok(result.missingFields.includes('buildingUse'));
  assert.equal(analyzeSpeedRecommendation(config, { ...planning, population: 0 }).status, 'needs-input');
  assert.equal(analyzeSpeedRecommendation(config, { ...planning, liftCount: 1.5 }).status, 'needs-input');
});

test('flight includes acceleration and jerk, and speed above the short-trip peak provides no fictitious saving', () => {
  near(estimateFlightSeconds(10, 1, 1, 1), 12);
  near(estimateFlightSeconds(0.2, 1, 0.7, 0.8), estimateFlightSeconds(0.2, 2.5, 0.7, 0.8));
  assert.ok(estimateFlightSeconds(10, 2) < estimateFlightSeconds(10, 1));
  assert.ok(estimateFlightSeconds(3.4, 1) > 3.4);
  assert.equal(estimateFlightSeconds(0, 1), 0);
  assert.throws(() => estimateFlightSeconds(2, 0), RangeError);
});

test('single-destination trip agrees with independently assembled two flights, doors and transfers', () => {
  const input = { capacity: 150, floors: 2, floorHeights: [10000], speed: 1 };
  const result = analyzeSpeedRecommendation(input, { ...planning, population: 100, liftCount: 1 });
  // 150/75 = 2 rated-person estimate; floor(80% × 2) = 1 passenger per trip.
  const flight = estimateFlightSeconds(10, 1, 0.7, 0.8);
  const rtt = (2 * flight + 2 * (2.5 + 3 + 0.5) + 2 * 1.5) * 1.1;
  near(result.current.roundTripSeconds, rtt);
  near(result.current.handlingPeoplePer5Minutes, 300 / rtt);
  near(result.current.intervalSeconds, rtt);
  near(result.expectedStops, 1);
  near(result.expectedHighestFloor, 1);
  near(result.expectedReversalHeightM, 10);
});

test('probability-weighted travel agrees with enumerating two passengers over three unequal-height floors', () => {
  const input = { capacity: 225, floors: 4, floorHeights: [3000, 4000, 5000], speed: 1.5 };
  const result = analyzeSpeedRecommendation(input, { ...planning, population: 80, liftCount: 1 });
  assert.equal(result.passengersPerTrip, 2);
  const levels = [0, 3, 7, 12];
  let expectedMotion = 0, expectedStops = 0, expectedHighest = 0;
  for (let a = 1; a <= 3; a++) for (let b = 1; b <= 3; b++) {
    const stops = [...new Set([a, b])].sort((x, y) => x - y);
    let previous = 0, duration = 0;
    for (const stop of [...stops, 0]) {
      duration += estimateFlightSeconds(Math.abs(levels[stop] - levels[previous]), 1.5, 0.7, 0.8);
      previous = stop;
    }
    expectedMotion += duration / 9;
    expectedStops += stops.length / 9;
    expectedHighest += stops.at(-1) / 9;
  }
  near(result.current.motionSeconds, expectedMotion);
  near(result.expectedStops, expectedStops);
  near(result.expectedHighestFloor, expectedHighest);
  assert.equal(result.totalTravelM, 12);
});

test('for the same trip load, doubling group size halves interval and doubles HC', () => {
  const one = analyzeSpeedRecommendation(config, { ...planning, liftCount: 1 });
  const two = analyzeSpeedRecommendation(config, planning);
  for (let index = 0; index < one.current.payloadOptions.length; index++) {
    const single = one.current.payloadOptions[index], paired = two.current.payloadOptions[index];
    near(single.roundTripSeconds, paired.roundTripSeconds);
    near(single.intervalSeconds / 2, paired.intervalSeconds);
    near(single.handlingPeoplePer5Minutes * 2, paired.handlingPeoplePer5Minutes);
  }
  const morePeople = analyzeSpeedRecommendation(config, { ...planning, population: 240 });
  near(morePeople.current.handlingPeoplePer5Minutes, two.current.handlingPeoplePer5Minutes);
  near(morePeople.current.handlingPercent, two.current.handlingPercent / 2);
});

test('light-demand single-lift case is assessed with partial loads rather than always saturated to 80%', () => {
  const input = Object.freeze({ capacity: 630, floors: 5, floorHeights: Object.freeze([3657.5, 3657.5, 3657.5, 3657.5]), speed: 1 });
  const result = analyzeSpeedRecommendation(input, { buildingUse: 'residential', population: 100, liftCount: 1 });
  assert.equal(result.status, 'preliminary');
  assert.equal(result.recommendationSpeedMps, 1);
  assert.equal(result.suggestedMinLiftCount, 1);
  assert.equal(result.current.passengersPerTrip, 2);
  assert.equal(result.maximumScreeningPassengersPerTrip, 6);
  assert.equal(result.current.partialLoadRequired, true);
  assert.ok(result.current.intervalSeconds <= 60);
  assert.ok(result.current.handlingPercent >= 7);
  assert.ok(result.current.fullLoad.intervalSeconds > 60);
  // Keep our independently derived result; do not calibrate to OTIS's 12.3%.
  near(result.current.handlingPercent, 600 / result.current.roundTripSeconds);
  assert.equal(input.speed, 1);
  assert.match(result.assumptions.dispatch, /actual dispatch not simulated/);
});

test('each speed chooses the best handling result inside the interval target over its entire payload envelope', () => {
  const result = analyzeSpeedRecommendation(config, { ...planning, liftCount: 1 });
  for (const candidate of result.candidates) {
    assert.deepEqual(candidate.payloadOptions.map(option => option.passengersPerTrip), [1, 2, 3, 4, 5, 6]);
    const feasible = candidate.payloadOptions.filter(option => option.intervalSeconds <= result.targets.intervalSeconds);
    near(candidate.handlingPeoplePer5Minutes, Math.max(...feasible.map(option => option.handlingPeoplePer5Minutes)));
    near(candidate.fullLoad.roundTripSeconds, candidate.payloadOptions.at(-1).roundTripSeconds);
  }
  const strict = analyzeSpeedRecommendation(config, { ...planning, liftCount: 1, targetIntervalSeconds: 1 });
  for (const candidate of strict.candidates) {
    assert.equal(candidate.meetsInterval, false);
    near(candidate.intervalSeconds, Math.min(...candidate.payloadOptions.map(option => option.intervalSeconds)));
  }
});

test('group-count suggestion considers each partial-load option rather than only the full-load interval', () => {
  const result = analyzeSpeedRecommendation(config, { ...planning, liftCount: 1 });
  const fastest = result.candidates.at(-1);
  const minimum = Math.min(...fastest.payloadOptions.map(option => Math.ceil(Math.max(
    option.roundTripSeconds / result.targets.intervalSeconds,
    (result.population * result.targets.handlingPercent / 100) * option.roundTripSeconds / (300 * option.passengersPerTrip),
  ))));
  assert.equal(result.suggestedMinLiftCount, minimum);
});

test('recommendation is the lowest listed candidate meeting both stated targets', () => {
  const result = analyzeSpeedRecommendation(config, planning);
  assert.equal(result.status, 'preliminary');
  assert.equal(result.recommendationSpeedMps, result.candidates.find(candidate => candidate.meetsTargets).speedMps);
  for (const candidate of result.candidates) {
    assert.equal(candidate.meetsTargets, candidate.handlingPercent >= result.targets.handlingPercent && candidate.intervalSeconds <= result.targets.intervalSeconds);
  }
});

test('overloaded group is distinguished from a need for a higher speed', () => {
  const result = analyzeSpeedRecommendation(config, { buildingUse: 'office', population: 10000, liftCount: 1 });
  assert.equal(result.status, 'group-review');
  assert.equal(result.recommendationSpeedMps, null);
  assert.equal(result.diagnosis.beyondSpeedOnly, true);
  assert.ok(result.diagnosis.requiredLiftsAtFastestCandidate > 1);
  assert.ok(result.issues.some(issue => issue.code === 'capacity-quantity-or-service-time'));
});

test('unsupported use and traffic patterns are comparisons, never validated speed recommendations', () => {
  for (const buildingUse of ['hotel-business', 'hotel-resort', 'hotel', 'hospital', 'retail', 'mixed', 'other']) {
    const result = analyzeSpeedRecommendation(config, { ...planning, buildingUse });
    assert.equal(result.status, 'traffic-study');
    assert.equal(result.recommendationSpeedMps, null);
    assert.equal(result.candidates.length, 4);
  }
  assert.equal(analyzeSpeedRecommendation(config, { ...planning, destinationControl: true }).status, 'traffic-study');
});

test('five OTIS-style uses keep the observed US up-peak targets distinct from the independent model', () => {
  for (const [buildingUse, handling, interval] of [
    ['residential', 7, 60], ['office-fixed', 13, 30], ['office-flexible', 11, 30],
    ['hotel-business', 12, 40], ['hotel-resort', 11, 50],
  ]) {
    const result = analyzeSpeedRecommendation(config, { ...planning, buildingUse });
    assert.equal(result.buildingUse, buildingUse);
    assert.equal(result.targets.handlingPercent, handling);
    assert.equal(result.targets.intervalSeconds, interval);
    assert.equal(result.targets.handlingSource, 'reference-planning-goal');
    assert.equal(result.suggestedMinLiftCount, result.diagnosis.requiredLiftsAtFastestCandidate);
  }
});

test('incomplete individual heights and invalid custom targets are not silently repaired', () => {
  const broken = { ...config, floorHeightMode: 'individual', floorToFloor: 3400, floorHeights: [3400] };
  assert.ok(analyzeSpeedRecommendation(broken, planning).missingFields.includes('floorHeights'));
  assert.equal(broken.floorHeights.length, 1);
  assert.ok(analyzeSpeedRecommendation(config, { ...planning, targetHandlingPercent: 101 }).missingFields.includes('targetHandlingPercent'));
  assert.ok(analyzeSpeedRecommendation(config, { ...planning, targetIntervalSeconds: -2 }).missingFields.includes('targetIntervalSeconds'));
  const uniform = analyzeSpeedRecommendation({ ...config, floorHeightMode: 'uniform', floorToFloor: 4000 }, planning);
  assert.equal(uniform.totalTravelM, 20);
});
