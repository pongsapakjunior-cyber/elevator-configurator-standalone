import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

const runtime = [process.env.MODEL_QA_THREE,
  fileURLToPath(new URL('../../Schneiderlift-live-portfolio/vendor/three.module.min.js', import.meta.url)),
  fileURLToPath(new URL('../../Schneiderlift-website/vendor/three.module.min.js', import.meta.url)),
].filter(Boolean).find(existsSync);
assert.ok(runtime, 'Set MODEL_QA_THREE to a local Three.js ES module.');
const THREE = await import(pathToFileURL(runtime).href);
let Stage;
runInNewContext(readFileSync(new URL('../assets/bundle/3d7f3d19-d30f-4ed1-8e49-9da8611ef3c7.js', import.meta.url), 'utf8'), {
  HTMLElement: class {}, customElements: { define(_name, implementation) { Stage = implementation; } },
});
const snapshotOf = object => Stage.prototype._objExportSnapshot.call({ _THREE: THREE, _object: object });
const approximately = (actual, expected) => actual.elements.forEach((n, i) => assert.ok(Math.abs(n - expected.elements[i]) < 1e-6));

test('OBJ snapshot expands all instances through nested world transforms without touching live state', () => {
  const scene = new THREE.Group(); scene.position.set(2, -1, 3); scene.rotation.y = 0.3;
  const model = new THREE.Group(); model.name = 'elevator'; model.position.y = 0.3; scene.add(model);
  // A rig is intentionally cyclic and cannot safely be JSON-cloned.
  model.userData.rig = { car: model, params: { shaftW: 1800, doorW: 800 } };
  const car = new THREE.Group(); car.position.set(-0.2, 4.2, 0.3); car.rotation.y = Math.PI / 2; model.add(car);
  const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshStandardMaterial();
  const details = new THREE.InstancedMesh(geometry, material, 3); details.name = 'hardware'; details.position.z = 0.07; car.add(details);
  for (let i = 0; i < details.count; i++) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(i * 0.2, 0.4, -0.1),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), i * 0.4), new THREE.Vector3(0.01, 0.03, 0.02));
    details.setMatrixAt(i, matrix);
  }
  scene.updateMatrixWorld(true);
  const before = { children: [...car.children], positions: details.position.toArray(), matrices: Array.from(details.instanceMatrix.array),
    world: details.matrixWorld.elements.slice(), params: JSON.stringify(model.userData.rig.params) };
  const snapshot = snapshotOf(model);
  assert.equal(snapshot.children.length, 3);
  snapshot.children.forEach((part, i) => {
    assert.equal(part.isInstancedMesh, undefined);
    assert.equal(part.geometry, geometry); assert.equal(part.material, material);
    const instance = new THREE.Matrix4(); details.getMatrixAt(i, instance);
    approximately(part.matrixWorld, new THREE.Matrix4().multiplyMatrices(details.matrixWorld, instance));
    assert.equal(part.name, `hardware_instance_${i}`);
  });
  assert.deepEqual(car.children, before.children);
  assert.deepEqual(details.position.toArray(), before.positions);
  assert.deepEqual(Array.from(details.instanceMatrix.array), before.matrices);
  assert.deepEqual(details.matrixWorld.elements, before.world);
  assert.equal(JSON.stringify(model.userData.rig.params), before.params);
  geometry.dispose(); material.dispose();
});

test('OBJ snapshot preserves ordinary geometry, hidden-object behavior and explicit matrices', () => {
  const model = new THREE.Group();
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 1, 1)]);
  const lineMaterial = new THREE.LineBasicMaterial();
  const line = new THREE.LineSegments(geometry, lineMaterial); line.name = 'guide'; line.visible = false;
  line.matrixAutoUpdate = false; line.matrix.makeTranslation(3, 5, 7); model.add(line);
  const points = new THREE.Points(geometry, new THREE.PointsMaterial()); points.name = 'ends'; points.position.y = 2; line.add(points);
  const snapshot = snapshotOf(model);
  assert.equal(snapshot.children.length, 2);
  const exportedLine = snapshot.getObjectByName('guide'), exportedPoints = snapshot.getObjectByName('ends');
  assert.ok(exportedLine.isLineSegments); assert.equal(exportedLine.visible, false);
  approximately(exportedLine.matrixWorld, new THREE.Matrix4().makeTranslation(3, 5, 7));
  assert.ok(exportedPoints.isPoints);
  approximately(exportedPoints.matrixWorld, new THREE.Matrix4().makeTranslation(3, 7, 7));
  geometry.dispose(); lineMaterial.dispose(); points.material.dispose();
});
