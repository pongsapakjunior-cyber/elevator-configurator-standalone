import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { arrangeModel } from '../assets/model-layout.mjs';
import { enhanceModelDetails } from '../assets/model-detail.mjs';
import { analyzeModelSizing } from '../assets/model-sizing.mjs';
import { normalizeLandingDoorFinish } from '../assets/landing-doors.mjs';
import { inspectOverhead } from '../assets/overhead-policy.mjs';

// Use an existing local Three runtime; this check neither installs dependencies
// nor changes the browser's pinned import map. MODEL_QA_THREE can point to r184.
const candidates = [process.env.MODEL_QA_THREE,
  fileURLToPath(new URL('../../Schneiderlift-live-portfolio/vendor/three.module.min.js', import.meta.url)),
  fileURLToPath(new URL('../../Schneiderlift-website/vendor/three.module.min.js', import.meta.url)),
].filter(Boolean);
const runtime = candidates.find(existsSync);
assert.ok(runtime, 'Set MODEL_QA_THREE to a local Three.js ES module to run geometry QA.');
const THREE = await import(pathToFileURL(runtime).href);
console.log(`Geometry QA uses real Three.js r${THREE.REVISION}; production import map remains unchanged.`);
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const build = new Function('THREE', 'normalizeLandingDoorFinish', 'inspectOverhead', html.slice(html.indexOf('const DEFAULTS ='), html.indexOf('// Pose the rig')) + ';return buildElevator;')(THREE, normalizeLandingDoorFinish, inspectOverhead);
const pose = new Function('THREE', html.slice(html.indexOf('function poseElevator'), html.indexOf('// Shared motion cycle')) + ';return poseElevator;')(THREE);
const close = (actual, expected, description) => assert.ok(Math.abs(actual - expected) < 1e-5, `${description}: ${actual} vs ${expected}`);
const bounds = object => new THREE.Box3().setFromObject(object, true);
const dispose = model => {
  model.userData.disposeModelDetails?.();
  const materials = new Set();
  model.traverse(o => {
    o.geometry?.dispose();
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) if (material) materials.add(material);
  });
  for (const material of materials) material.dispose();
};
const sizes = [
  { label: 'default', values: {} },
  { label: 'compact', values: { shaftW: 1200, carW: 800, shaftD: 1600, carD: 900, doorW: 600 } },
  { label: 'wide-shallow', values: { shaftW: 3800, carW: 3000, shaftD: 1600, carD: 1100 } },
  { label: 'historical', values: { shaftW: 1800, carW: 1100, shaftD: 1800, carD: 1300, doorW: 800, carH: 2300, overhead: 4500, pit: 1500 } },
];
for (const elevatorType of ['mr', 'mrl']) for (const entrances of [1, 2]) for (const roping of [1, 2]) for (const size of sizes) {
  test(`${elevatorType}/${entrances} entrances/${roping}:1/${size.label}: component bounds, rope endpoints and saved dimensions`, () => {
    const model = build({ ...size.values, elevatorType, entrances, roping });
    const r = model.userData.rig, d = r.dims;
    const parameters = JSON.stringify(r.params), dimensionData = JSON.stringify(d);
    Object.freeze(r.params.floorHeights); Object.freeze(r.params);
    enhanceModelDetails(THREE, model);
    arrangeModel(THREE, model, analyzeModelSizing(r.params));
    assert.equal(JSON.stringify(r.params), parameters);
    assert.equal(JSON.stringify(d), dimensionData);
    const initialChildren = model.children.length;
    arrangeModel(THREE, model, analyzeModelSizing(r.params));
    assert.equal(model.children.length, initialChildren, 'arrangement is idempotent');
    if (r.layout.counterweightSide !== 'side') { dispose(model); return; }
    const mesh = name => model.getObjectByName(name);
    model.updateMatrixWorld(true);
    close(mesh('brake_disc').geometry.parameters.radiusTop, r.bR + 0.02, 'brake disc follows caliper radius');
    for (const name of ['machine_bedplate', 'bearing_pedestal_left', 'motor_foot', ...(roping === 2 ? ['deadend_beam', 'deadend_hitch_car', 'deadend_hitch_cwt'] : []), ...(elevatorType === 'mrl' ? ['mrl_machine_beam', 'mrl_service_platform'] : [])]) {
      const b = bounds(mesh(name));
      assert.ok(b.min.x >= -d.sw / 2 - 1e-5 && b.max.x <= d.sw / 2 + 1e-5, `${name} stays inside shaft width`);
      assert.ok(b.min.z >= -d.sd / 2 - 1e-5 && b.max.z <= d.sd / 2 + 1e-5, `${name} stays inside shaft depth`);
    }
    if (elevatorType === 'mrl') for (const name of ['traction_sheave', 'sheave_groove_rim_0', 'sheave_groove_rim_4']) {
      assert.ok(bounds(mesh(name)).max.y <= d.TOP + model.position.y + 1e-5, `${name} remains below shaft top`);
    }
    if (roping === 2) {
      const b = bounds(mesh('cwt_diverter_sheave'));
      assert.ok(b.min.x >= -d.sw / 2 + 0.02, 'counterweight pulley clears shaft wall');
      assert.ok(b.max.x <= -d.cw / 2 - 0.035, 'counterweight pulley clears cabin envelope');
      for (const owner of ['car', 'cwt']) for (let i = 0; i < 4; i++) {
        const wrap = mesh(`layout_${owner}_rope_wrap_${i}`), radius = wrap.geometry.parameters.radius;
        const tangentX = [new THREE.Vector3(radius, 0, 0), new THREE.Vector3(-radius, 0, 0)]
          .map(p => p.applyMatrix4(wrap.matrixWorld).x).sort((a, b) => a - b);
        const records = owner === 'car' ? r.ropesCar : r.ropesCwt;
        const falls = records.filter(o => o.mesh.name.endsWith(`_${i}`)).map(o => o.mesh.position.x).sort((a, b) => a - b);
        close(tangentX[0], falls[0], `${owner} left pulley tangent`);
        close(tangentX[1], falls[1], `${owner} right pulley tangent`);
      }
    }
    for (let i = 0; i < 4; i++) {
      const arc = mesh(`rope_arc_${i}`), radius = arc.geometry.parameters.radius;
      const endpoints = [new THREE.Vector3(radius, 0, 0), new THREE.Vector3(-radius, 0, 0)].map(p => p.applyMatrix4(arc.matrixWorld));
      const primary = [r.ropesCar, r.ropesCwt].map(records => records.find(o => o.mesh.name === `rope_${records === r.ropesCar ? 'car' : 'cwt'}_${i}`));
      for (const record of primary) assert.ok(endpoints.some(p => Math.abs(p.x - record.mesh.position.x) < 1e-5 && Math.abs(p.z - record.mesh.position.z) < 1e-5), 'drive arc meets each primary fall');
    }
    const originalAxes = r.rotors.map(m => {
      const local = /^(sheave_spoke_[ab]|brake_disc_vent)$/.test(m.name) ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      return { mesh: m, local, axle: local.clone().applyQuaternion(m.quaternion) };
    });
    for (const floor of [r.floors[0], r.floors[Math.floor(r.floors.length / 2)], r.floors.at(-1)]) {
      const dy = floor - r.yc;
      pose(model, floor, 0.5, r.floors.indexOf(floor), 1);
      model.updateMatrixWorld(true);
      for (const records of [r.ropesCar, r.ropesCwt]) for (const record of records) {
        const actualLength = record.mesh.geometry.parameters.height * record.mesh.scale.y;
        assert.ok(Number.isFinite(actualLength) && actualLength > 0, `${record.mesh.name} stays positive at floor ${floor}`);
        close(record.mesh.position.y + actualLength / 2, record.topY, `${record.mesh.name} top remains anchored`);
        const expectedBottom = records === r.ropesCar ? r.layout.carSheaveY + dy : r.layout.cwtEndY - dy;
        close(record.mesh.position.y - actualLength / 2, expectedBottom, `${record.mesh.name} follows its moving attachment`);
      }
      for (const { mesh: m, local, axle } of originalAxes) close(Math.abs(local.clone().applyQuaternion(m.quaternion).dot(axle)), 1, `${m.name} rotates around its axle`);
    }
    if (elevatorType === 'mr') {
      const slabs = ['front', 'back', 'left', 'right'].map(n => bounds(mesh(`machine_slab_${n}`)));
      for (const record of [...r.ropesCar, ...r.ropesCwt]) {
        const p = new THREE.Vector3(record.mesh.position.x, d.TOP + 0.15 + model.position.y, record.mesh.position.z);
        assert.ok(slabs.every(slab => !slab.containsPoint(p)), `${record.mesh.name} passes through the relocated slab opening`);
      }
    }
    assert.equal(JSON.stringify(r.params), parameters, 'animation preserves every parameter');
    dispose(model);
  });
}
