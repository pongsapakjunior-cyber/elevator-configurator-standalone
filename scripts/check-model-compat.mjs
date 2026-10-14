// Regression checks for the model-only redesign. Customer URLs issued before
// this change must continue to carry and display the same configuration.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));
const baselineRevision = 'cd5ca44';
const before = execFileSync('git', ['show', `${baselineRevision}:index.html`], {
  cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
}).replace(/\r\n/g, '\n');
const after = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
let checks = 0;
const check = (label, run) => {
  try { run(); checks++; }
  catch (error) { throw new Error(`Compatibility failed: ${label}`, { cause: error }); }
};
const json = value => JSON.parse(JSON.stringify(value));
const span = (source, start, end) => {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `Missing source marker: ${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `Missing closing marker: ${end}`);
  return source.slice(from, to + end.length).trim();
};
const line = (source, start) => {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `Missing declaration: ${start}`);
  return source.slice(from, source.indexOf('\n', from)).trim();
};
const arrow = (source, name) => span(source, `const ${name} =`, '\n  };');
const defaults = source => span(source, 'const DEFAULTS = {', '\n};');
const normalizer = source => span(source, 'function normalize(opts = {}) {', '\n}');
const keys = source => span(source, 'const COMPACT_CONFIG_KEYS = [', '\n  ];');

// These are customer-data contracts, not geometry snapshots. Geometry is free
// to gain detail, while the existing defaults, coercions and protocol stay fixed.
check('default parameter values', () => assert.equal(defaults(after), defaults(before)));
check('existing sizing and normalization behavior', () => assert.equal(normalizer(after), normalizer(before)));
check('ordered compact v2 key schema', () => assert.equal(keys(after), keys(before)));
for (const name of ['ids', 'textIds', 'numericIds']) {
  check(`${name} parameter membership and types`, () => assert.equal(line(after, `const ${name} =`), line(before, `const ${name} =`)));
}
for (const name of [
  'encodeConfig', 'decodeConfig', 'compactConfigValue', 'encodeCompactConfig', 'decodeCompactConfig',
  'read', 'syncPanels', 'syncFloorMode', 'syncFloorList', 'updateUrls',
  'makeBridgeSnapshot', 'postBridgeSnapshot', 'applyBridgeConfig',
]) {
  check(`${name} customer-data behavior`, () => assert.equal(arrow(after, name), arrow(before, name)));
}
for (const [label, start, end] of [
  ['legacy and compact URL loading', '// Load a compact customer configuration', '\n  syncFloorMode();'],
  ['embed origin and instance validation', 'const search = new URLSearchParams(location.search);', '\n  let activePage ='],
  ['bridge event names, version and origin checks', "window.addEventListener('message', event => {", '\n  });'],
  ['QR creation uses the customer URL', 'const openQr =', '\n  };'],
]) {
  check(label, () => assert.equal(span(after, start, end), span(before, start, end)));
}

const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(m => [m[1], m[2] ?? '']));
const controls = source => {
  const result = {};
  for (const m of source.matchAll(/<input\b([^>]*)>|<select\b([^>]*)>([\s\S]*?)<\/select>/g)) {
    const tag = m[1] !== undefined ? 'input' : 'select';
    const attrs = attributes(m[1] ?? m[2]);
    if (!attrs.id) continue;
    result[attrs.id] = { tag, attributes: attrs, options: tag === 'select' ? (m[3] ?? '').trim() : undefined };
  }
  return result;
};
const originalControls = controls(before), currentControls = controls(after);
for (const [id, original] of Object.entries(originalControls)) {
  check(`input ${id}: values, units, limits and choices`, () => assert.deepEqual(currentControls[id], original));
}
const parameterLabels = source => [...source.matchAll(/<label\b[^>]*for="([^"]+)"[^>]*>([\s\S]*?)<\/label>/g)].map(m => [m[1], m[2].trim()]);
check('existing parameter labels', () => assert.deepEqual(parameterLabels(after), parameterLabels(before)));
const parameterUnits = source => [...source.matchAll(/<div\b[^>]*data-unit="([^"]+)"[^>]*>\s*<input\b[^>]*id="([^"]+)"/g)].map(m => [m[2], m[1]]);
check('parameter display units', () => assert.deepEqual(parameterUnits(after), parameterUnits(before)));
const specTemplate = source => span(source, '<dl class="spec"', '\n</dl>');
check('customer parameter specification template', () => assert.equal(specTemplate(after), specTemplate(before)));
const specSetters = source => [...source.matchAll(/\bset\('[^']+',[^\n]+/g)].map(m => m[0]);
check('customer parameter specification calculations', () => assert.deepEqual(specSetters(after), specSetters(before)));
const jobMetadata = source => [...source.matchAll(/card\.querySelector\('\[data-j="[^"]+"\]'\)\.textContent[^\n]+/g)].map(m => m[0]);
check('customer project metadata rendering', () => assert.deepEqual(jobMetadata(after), jobMetadata(before)));
for (const marker of [
  'const persons = Math.max', 'const travel = P.floorHeights.reduce',
  'currentCode = encodeConfig(', 'currentCompactCode = encodeCompactConfig(',
]) {
  check(`existing derived/serialized value: ${marker}`, () => assert.equal(line(after, marker), line(before, marker)));
}

// Execute the shipped codecs and normalizer from both revisions. Fixtures are
// encoded by the old release, then opened and re-encoded by the redesigned one.
const api = source => {
  const code = [defaults(source), normalizer(source), keys(source),
    ...['encodeConfig', 'decodeConfig', 'compactConfigValue', 'encodeCompactConfig', 'decodeCompactConfig'].map(name => arrow(source, name)),
    'globalThis.compatApi = { DEFAULTS, normalize, encodeConfig, decodeConfig, encodeCompactConfig, decodeCompactConfig };',
  ].join('\n');
  const context = vm.createContext({ TextEncoder, TextDecoder, btoa, atob });
  vm.runInContext(code, context, { timeout: 2000 });
  return context.compatApi;
};
const oldApi = api(before), newApi = api(after);
const fixtures = [];
for (const elevatorType of ['mr', 'mrl']) {
  for (const entrances of [1, 2]) {
    for (const roping of [1, 2]) {
      for (const [doorType, doorPanels] of [['center', 2], ['center', 4], ['side', 1], ['side', 2], ['side', 3]]) {
        for (const floorHeightMode of ['uniform', 'individual']) {
          fixtures.push({
            ...json(oldApi.DEFAULTS), project: 'อาคารทดสอบ ชไนเดอร์ / Tower A', modelName: 'SL-630 ทดสอบ',
            liftNo: 'L-02', location: 'พัทยา', elevatorType, entrances, roping, doorType, doorPanels,
            capacity: 630, speed: 1.75, carW: 1400, carD: 1500, carH: 2400,
            shaftW: 2100, shaftD: 2200, doorW: 800, doorH: 2100,
            overhead: 4500, pit: 1500, floors: 4, floorToFloor: 3400, floorHeightMode,
            floorHeights: floorHeightMode === 'individual' ? [3200, 3600, 4200] : [3400, 3400, 3400],
            cabinStyle: 'SC-C101', cabinSelected: 1, ceilingFinish: 'CD-003', floorFinish: 'FL-020',
            floorDimensionDisplay: floorHeightMode === 'individual' ? 'hide' : 'show',
          });
        }
      }
    }
  }
}
fixtures.push(
  { project: 'Legacy full payload', carW: 1800, carD: 1500, shaftW: 2500, shaftD: 2100, floorHeights: [3200, 3600], floors: 3, copFinish: 'COP-LISA20' },
  { ...json(oldApi.DEFAULTS), project: 'Existing clamp behavior', carW: 2200, carD: 2100, shaftW: 1800, shaftD: 1700, doorW: 1600, carH: 2200, pit: 900, overhead: 3200, floors: 4, floorHeights: [2200, 0, 3500] },
  { ...json(oldApi.DEFAULTS), project: 'MRL existing clamp behavior', elevatorType: 'mrl', overhead: 3800, floors: 45, floorHeights: [3400] },
);
for (const [i, fixture] of fixtures.entries()) {
  const full = oldApi.encodeConfig(fixture), compact = oldApi.encodeCompactConfig(fixture);
  check(`fixture ${i + 1}: old full URL decodes identically`, () => assert.deepEqual(json(newApi.decodeConfig(full)), json(oldApi.decodeConfig(full))));
  check(`fixture ${i + 1}: old compact QR decodes identically`, () => assert.deepEqual(json(newApi.decodeCompactConfig(compact)), json(oldApi.decodeCompactConfig(compact))));
  check(`fixture ${i + 1}: full URL code is unchanged`, () => assert.equal(newApi.encodeConfig(fixture), full));
  check(`fixture ${i + 1}: compact QR code is unchanged`, () => assert.equal(newApi.encodeCompactConfig(fixture), compact));
  for (const [kind, value] of [['full', full], ['compact', compact]]) {
    const decoder = kind === 'full' ? 'decodeConfig' : 'decodeCompactConfig';
    const prior = oldApi.normalize(oldApi[decoder](value));
    const current = newApi.normalize(newApi[decoder](value));
    check(`fixture ${i + 1}: ${kind} parameters and notes unchanged`, () => assert.deepEqual(json(current), json(prior)));
  }
}

// An old compact v2 link can predate cabinSelected and elevatorType, which were
// added at the tail. Omitting them must retain the original default behavior.
const earlierPacked = oldApi.decodeConfig(oldApi.encodeCompactConfig(fixtures[0]));
earlierPacked.length -= 2;
const oldShortCode = oldApi.encodeConfig(earlierPacked);
check('short legacy compact v2 payload still loads', () => {
  assert.deepEqual(json(newApi.decodeCompactConfig(oldShortCode)), json(oldApi.decodeCompactConfig(oldShortCode)));
  assert.deepEqual(json(newApi.normalize(newApi.decodeCompactConfig(oldShortCode))), json(oldApi.normalize(oldApi.decodeCompactConfig(oldShortCode))));
});
check('old QR retains the supplied Thai name and example dimensions', () => {
  const reopened = newApi.normalize(newApi.decodeCompactConfig(oldApi.encodeCompactConfig(fixtures[0]))).params;
  assert.equal(reopened.project, 'อาคารทดสอบ ชไนเดอร์ / Tower A');
  assert.deepEqual([reopened.carW, reopened.carD, reopened.shaftW, reopened.shaftD, reopened.doorW, reopened.capacity], [1400, 1500, 2100, 2200, 800, 630]);
});

console.log(`PASS: ${checks} compatibility checks; ${fixtures.length} full/compact fixtures; baseline ${baselineRevision}.`);
console.log('Existing serialization limitations remain outside this model-only change: compact links omit liftNo/location; the UI has no editable doorH field.');
