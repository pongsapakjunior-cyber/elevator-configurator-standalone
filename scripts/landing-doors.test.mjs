import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { LANDING_DOOR_OPTIONS, normalizeLandingDoorFinish } from '../assets/landing-doors.mjs';

test('landing door catalog contains the eight supplied catalog options and two photo references', () => {
  assert.deepEqual(LANDING_DOOR_OPTIONS.map(item => item.id), [
    'SD-005', 'SD-006', 'SD-007', 'SD-008', 'SD-101', 'SD-102', 'SD-103', 'SD-104', 'LD-GLASS', 'LD-STANDARD',
  ]);
  assert.ok(LANDING_DOOR_OPTIONS.every(item => !('price' in item) && !('dimensions' in item)));
});

test('missing/invalid legacy values remain optional, known values normalize safely', () => {
  for (const value of [undefined, null, '', 'none', 'unknown', '<img>', {}, 0]) assert.equal(normalizeLandingDoorFinish(value), 'none');
  for (const { id } of LANDING_DOOR_OPTIONS) assert.equal(normalizeLandingDoorFinish(` ${id.toLowerCase()} `), id);
});

test('compact v2 key positions stay backward compatible and unselected doors keep legacy payload', async () => {
  const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const match = source.match(/const COMPACT_CONFIG_KEYS = \[([\s\S]*?)\n  \];/);
  const keys = Array.from(match[1].matchAll(/'([a-zA-Z]+)'/g), item => item[1]);
  assert.equal(keys.length, 32);
  assert.deepEqual(keys.slice(-4), ['floorHeights', 'cabinSelected', 'elevatorType', 'landingDoorFinish']);
  assert.equal(keys[21], 'cabinStyle');
  assert.equal(keys[30], 'elevatorType');
  assert.match(source, /normalizeLandingDoorFinish\(source\.landingDoorFinish\) === 'none' \? COMPACT_CONFIG_KEYS\.slice\(0, -1\)/);
});

const span = (source, start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from !== -1 && to !== -1, start);
  return source.slice(from, to + end.length);
};
const codecs = source => {
  source = source.replace(/\r\n/g, '\n');
  const context = vm.createContext({ TextEncoder, TextDecoder, btoa, atob, normalizeLandingDoorFinish });
  const code = [
    span(source, 'const DEFAULTS = {', '\n};'),
    span(source, 'const COMPACT_CONFIG_KEYS = [', '\n  ];'),
    ...['encodeConfig', 'decodeConfig', 'compactConfigValue', 'encodeCompactConfig', 'decodeCompactConfig'].map(name => span(source, `const ${name} =`, '\n  };')),
    'globalThis.codecs = { encodeConfig, decodeConfig, encodeCompactConfig, decodeCompactConfig };',
  ].join('\n');
  vm.runInContext(code, context, { timeout: 1000 });
  return context.codecs;
};

test('shipped codecs retain old QR payloads and round-trip every landing door', async () => {
  const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const oldSource = execFileSync('git', ['show', 'cd5ca44:index.html'], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
  const old = codecs(oldSource), current = codecs(source);
  const original = { project: 'ประตูชั้น / Tower A', modelName: 'SEL-630', capacity: 630, cabinStyle: 'SC-C101', ceilingFinish: 'CD-003', floorFinish: 'MG-03', elevatorType: 'mrl', floors: 4 };
  const legacy = old.encodeCompactConfig(original);
  assert.equal(current.encodeCompactConfig(original), legacy);
  assert.equal(current.encodeCompactConfig({ ...original, landingDoorFinish: 'none' }), legacy);
  assert.deepEqual(JSON.parse(JSON.stringify(current.decodeCompactConfig(legacy))), JSON.parse(JSON.stringify(old.decodeCompactConfig(legacy))));
  for (const { id } of LANDING_DOOR_OPTIONS) {
    const encoded = current.encodeCompactConfig({ ...original, landingDoorFinish: id });
    const decoded = current.decodeCompactConfig(encoded);
    assert.equal(decoded.landingDoorFinish, id);
    assert.equal(decoded.project, original.project);
    assert.equal(decoded.elevatorType, 'mrl');
    assert.deepEqual(Array.from(current.decodeConfig(encoded)).slice(0, -1), Array.from(current.decodeConfig(legacy)));
    const full = current.decodeConfig(current.encodeConfig({ ...original, landingDoorFinish: id }));
    assert.equal(full.landingDoorFinish, id);
  }
});
