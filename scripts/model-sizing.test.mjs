import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeModelSizing } from '../assets/model-sizing.mjs';

const original = {
  elevatorType: 'mrl', entrances: 1, doorType: 'center', doorPanels: 2,
  shaftW: 1800, shaftD: 1800, carW: 1400, carD: 1100, doorW: 800,
  overhead: 3300, pit: 900, carH: 2200, floorHeights: Object.freeze([2850, 3000]),
  project: 'Existing customer QR', unknownFutureField: { preserve: true },
};

test('photo comparisons preserve every input field, including dimensions outside existing app limits', () => {
  const config = Object.freeze({ ...original });
  const before = JSON.stringify(config);
  const result = analyzeModelSizing(config);
  assert.equal(JSON.stringify(config), before);
  assert.equal(result.mode, 'reference-only');
  assert.equal(result.heuristics.referenceCarWidthMm, 1100);
  assert.equal(result.heuristics.referenceCarDepthMm, 1300);
  assert.equal(result.heuristics.actualWidthAllowanceMm, 400);
  assert.equal(result.heuristics.actualDepthAllowanceMm, 700);
  assert.ok(result.observations.some(item => item.code === 'historical-variation'));
  result.heuristics.referenceCarWidthMm = 10;
  assert.equal(config.carW, 1400);
  assert.equal(analyzeModelSizing(config).heuristics.referenceCarWidthMm, 1100);
});

test('MR rear sketch and MRL side sketch are distinguished; a rear entrance gets a side layout', () => {
  assert.equal(analyzeModelSizing(original).counterweightSide, 'side');
  const mr = analyzeModelSizing({ ...original, elevatorType: 'mr' });
  assert.equal(mr.counterweightSide, 'rear');
  assert.equal(mr.heuristics.widthAllowanceMm, 600);
  assert.equal(mr.heuristics.depthAllowanceMm, 600);
  const through = analyzeModelSizing({ ...original, elevatorType: 'mr', entrances: 2 });
  assert.equal(through.counterweightSide, 'side');
  assert.equal(through.counterweightReason, 'rear-entrance-clearance');
  assert.ok(through.observations.some(item => item.code === 'two-entrance-side-layout'));
});

test('2C operator uses photographed sizes and does not equate assembly span with shaft width', () => {
  const result = analyzeModelSizing({ ...original, shaftW: 1750 });
  assert.deepEqual(result.operatorReference.referenceWidthsMm, [800]);
  assert.equal(result.operatorReference.match, 'tabulated');
  assert.equal(result.operatorReference.beamLengthMm, 1620);
  assert.equal(result.operatorReference.l1Mm, 425);
  assert.equal(result.operatorReference.l2Mm, 275);
  assert.ok(result.advisories.some(item => item.code === 'owner-800-door-shaft-guideline'));
  assert.ok(!result.advisories.some(item => item.code === 'operator-span-exceeds-shaft'));
});

test('operator references interpolate explicitly and never extrapolate or apply to 2S / 4C', () => {
  const between = analyzeModelSizing({ ...original, doorW: 1050 }).operatorReference;
  assert.equal(between.match, 'interpolated');
  assert.deepEqual(between.referenceWidthsMm, [1000, 1100]);
  assert.equal(between.beamLengthMm, 2120);
  assert.equal(analyzeModelSizing({ ...original, doorW: 600 }).operatorReference.beamLengthMm, 1220);
  assert.equal(analyzeModelSizing({ ...original, doorW: 1200 }).operatorReference.beamLengthMm, 2420);
  for (const doorW of [550, 1250, NaN, Infinity]) {
    assert.equal(analyzeModelSizing({ ...original, doorW }).operatorReference, null);
  }
  assert.equal(analyzeModelSizing({ ...original, doorType: 'side' }).operatorReference, null);
  assert.equal(analyzeModelSizing({ ...original, doorPanels: 4 }).operatorReference, null);
});

test('missing dimensions remain unknown and physical mismatches are observations without corrections', () => {
  const missing = analyzeModelSizing({ elevatorType: 'mr' });
  assert.equal(missing.heuristics.actualWidthAllowanceMm, null);
  assert.equal(missing.heuristics.referenceCarWidthMm, null);
  assert.equal(missing.operatorReference, null);
  const impossible = Object.freeze({ ...original, shaftW: 1000, shaftD: 1000 });
  const result = analyzeModelSizing(impossible);
  assert.ok(result.advisories.some(item => item.code === 'operator-span-exceeds-shaft'));
  assert.ok(result.advisories.some(item => item.code === 'nonpositive-shaft-car-space'));
  assert.equal(impossible.carW, 1400);
  assert.equal(impossible.carD, 1100);
  assert.equal(impossible.shaftW, 1000);
});
