import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(process.env.CONFIGURATOR_HTML || new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('const DEFAULTS = {');
const end = html.indexOf('\nfunction buildElevator', start);
assert.ok(start >= 0 && end > start, 'Find the actual configurator normalization code');
const normalize = runInNewContext(`${html.slice(start, end)}\nnormalize;`);

for (const elevatorType of ['mr', 'mrl']) {
  test(`${elevatorType}: car depth is preserved above the former shaft-clearance limit`, () => {
    for (const carD of [1340, 1500, 1700, 2200]) {
      const { params, notes } = normalize({ elevatorType, carD, shaftD: 1800 });
      assert.equal(params.carD, carD);
      assert.equal(params.shaftD, 1800);
      assert.ok(!notes.some(note => note.includes('Car depth limited')));
    }
  });
}

test('changing the shaft does not resize the car depth', () => {
  const first = normalize({ carD: 1700, shaftD: 2500 }).params;
  const second = normalize({ ...first, shaftD: 1800 }).params;
  assert.equal(second.carD, 1700);
});

test('unrelated width, door and minimum-height rules remain in effect', () => {
  const { params, notes } = normalize({ carW: 1800, shaftW: 1600, carD: 1700, shaftD: 1800, doorW: 1400, carH: 2000 });
  assert.equal(params.carW, 1240);
  assert.equal(params.doorW, 1040);
  assert.equal(params.carH, 2300);
  assert.equal(params.carD, 1700);
  assert.ok(notes.some(note => note.startsWith('Car width limited')));
});
