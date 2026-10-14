/**
 * Presentation geometry only. This module never writes configurator parameters.
 * The supplied GNL two-panel centre-opening reference gives L = 2 × JJ + 20 mm
 * for JJ 600–1200 mm. Other operators are schematic motion envelopes, not a
 * manufacturer selection or an installation-clearance approval.
 */
export function enhanceModelDetails(THREE, model) {
  const r = model?.userData?.rig;
  if (!r?.car || model.userData.modelDetails) return model;
  const P = r.params, d = r.dims;
  const { cw, cd, dw, dh, CH, zc, zF } = d;
  const yc = r.yc, fz = zc + cd / 2;
  const geometries = new Set(), materials = new Set(), caches = new Map();
  const ownGeometry = geo => (geometries.add(geo), geo);
  const material = (name, color, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = `detail_${name}`; materials.add(m); return m;
  };
  const M = {
    dark: material('powder_coat', 0x252c30, 0.62, 0.35),
    black: material('rubber', 0x151c20, 0.87),
    steel: material('satin_steel', 0xbac5ca, 0.36, 0.4),
    polished: material('machined_edge', 0xe0e5e7, 0.22, 0.45),
    yellow: material('operator_wheel', 0xe5b72f, 0.46, 0.3),
    red: material('stop_button', 0xc9352c, 0.52),
    lens: material('indicator_lens', 0x9ac9b4, 0.3, 0.1),
  };
  M.lens.emissive.set(0x396c53); M.lens.emissiveIntensity = 0.3;
  const unitBox = ownGeometry(new THREE.BoxGeometry(1, 1, 1));
  const unitCylinder = ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 20));
  const unitHex = ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 6));
  const batches = new Map();
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  const group = (name, parent) => {
    const g = new THREE.Group(); g.name = name; parent.add(g); return g;
  };
  const stationary = group('model_detail_stationary', model);
  const car = group('model_detail_car', r.car);
  // Instance repeated geometry by parent/material; the parent supplies its motion.
  function instance(parent, name, geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    if (![x, y, z, sx, sy, sz].every(Number.isFinite) || Math.min(sx, sy, sz) <= 0) return;
    const key = `${parent.uuid}:${geo.uuid}:${mat.uuid}`;
    let batch = batches.get(key);
    if (!batch) { batch = { parent, geo, mat, matrices: [], names: [] }; batches.set(key, batch); }
    position.set(x, y, z); scale.set(sx, sy, sz);
    quaternion.setFromEuler(euler.set(rx, ry, rz));
    batch.matrices.push(matrix.compose(position, quaternion, scale).clone());
    batch.names.push(name);
  }
  const box = (parent, name, mat, w, h, depth, x, y, z, rx = 0, ry = 0, rz = 0) =>
    instance(parent, name, unitBox, mat, x, y, z, w, h, depth, rx, ry, rz);
  const cylinder = (parent, name, mat, radius, length, x, y, z, axis = 'y') =>
    instance(parent, name, unitCylinder, mat, x, y, z, radius, length, radius,
      axis === 'z' ? Math.PI / 2 : 0, 0, axis === 'x' ? Math.PI / 2 : 0);
  const bolt = (parent, name, x, y, z, axis = 'z', radius = 0.009) => {
    const rx = axis === 'z' ? Math.PI / 2 : 0, rz = axis === 'x' ? Math.PI / 2 : 0;
    instance(parent, name, unitHex, M.polished, x, y, z, radius, radius * 0.7, radius, rx, 0, rz);
  };
  function torus(parent, name, mat, radius, tube, x, y, z, axis = 'z') {
    const key = `torus:${radius}:${tube}`;
    let geo = caches.get(key);
    if (!geo) { geo = ownGeometry(new THREE.TorusGeometry(radius, tube, 6, 28)); caches.set(key, geo); }
    instance(parent, name, geo, mat, x, y, z, 1, 1, 1,
      axis === 'y' ? Math.PI / 2 : 0, axis === 'x' ? Math.PI / 2 : 0);
  }
  const line = (parent, name, mat, a, b, width = 0.006, depth = 0.012) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    box(parent, name, mat, Math.hypot(dx, dy), width, depth,
      (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2], 0, 0, Math.atan2(dy, dx));
  };
  const entrances = [{ label: 'front', sign: 1, z: fz }];
  if (Number(P.entrances) === 2) entrances.push({ label: 'rear', sign: -1, z: zc - cd / 2 });
  const doorRecords = r.carDoors.filter(o => /^(?:rear_)?car_door_\d+$/.test(o.mesh.name));
  const frontDoorRecords = doorRecords.filter(o => /^car_door_\d+$/.test(o.mesh.name));
  let envelopeMin = -dw / 2, envelopeMax = dw / 2;
  for (const o of frontDoorRecords) {
    const w = o.mesh.geometry.parameters.width;
    envelopeMin = Math.min(envelopeMin, o.x0 - w / 2, o.x0 + o.travel - w / 2);
    envelopeMax = Math.max(envelopeMax, o.x0 + w / 2, o.x0 + o.travel + w / 2);
  }
  const photoOperator = P.doorType === 'center' && Number(P.doorPanels) === 2 && dw >= 0.6 && dw <= 1.2;
  const operatorLength = photoOperator ? 2 * dw + 0.02 : envelopeMax - envelopeMin + 0.12;
  const operatorX = photoOperator ? 0 : (envelopeMin + envelopeMax) / 2;
  // Existing tracks remain named meshes, but use the same visible hardware
  // envelope as the detailed operator instead of the former guessed overhang.
  const existingTracks = [r.car.getObjectByName('car_door_track')];
  for (let i = 0; i < r.floors.length; i++) {
    existingTracks.push(model.getObjectByName(`door_hanger_track_${i}`), model.getObjectByName(`door_track_rail_${i}`));
  }
  for (const track of existingTracks) {
    const width = track?.geometry?.parameters?.width;
    if (!Number.isFinite(width) || width <= 0) continue;
    track.scale.x = operatorLength / width;
    track.position.x = operatorX;
    track.userData.operatorLengthMM = Math.round(operatorLength * 1000);
  }
  for (const oldName of ['car_door_operator', 'car_door_motor']) {
    const old = r.car.getObjectByName(oldName);
    if (old) {
      old.removeFromParent();
      // These two original meshes each own their geometry, while their material
      // is shared with the rest of the rig and must remain available.
      old.geometry?.dispose();
    }
  }
  for (const entrance of entrances) {
    const op = group(`detail_${entrance.label}_door_operator`, r.car);
    op.position.set(operatorX, yc + dh + 0.19, entrance.z + entrance.sign * 0.085);
    if (entrance.sign < 0) op.rotation.y = Math.PI;
    op.userData.reference = photoOperator ? 'GNL photo: two-panel centre opening; JJ 600–1200 mm' : 'Schematic door-motion envelope';
    op.userData.operatorLengthMM = Math.round(operatorLength * 1000);
    const half = operatorLength / 2, wheelX = half - 0.145, returnX = -half + 0.065;
    box(op, 'operator_backing_panel', M.dark, operatorLength, 0.32, 0.025, 0, 0.045, 0);
    box(op, 'operator_folded_top', M.dark, operatorLength, 0.026, 0.095, 0, 0.21, -0.027);
    box(op, 'operator_bottom_flange', M.steel, operatorLength, 0.023, 0.08, 0, -0.115, 0.025);
    box(op, 'hanger_running_rail', M.polished, operatorLength - 0.035, 0.022, 0.026, 0, -0.01, 0.051);
    box(op, 'hanger_rail_recess', M.black, operatorLength - 0.05, 0.006, 0.005, 0, -0.021, 0.069);
    cylinder(op, 'yellow_drive_wheel', M.yellow, 0.114, 0.027, wheelX, 0.054, 0.089, 'z');
    torus(op, 'drive_wheel_rim', M.yellow, 0.106, 0.008, wheelX, 0.054, 0.108);
    cylinder(op, 'drive_wheel_hub', M.dark, 0.027, 0.046, wheelX, 0.054, 0.1, 'z');
    bolt(op, 'drive_wheel_axle', wheelX, 0.054, 0.126, 'z', 0.012);
    cylinder(op, 'belt_return', M.dark, 0.032, 0.025, returnX, 0.054, 0.073, 'z');
    bolt(op, 'return_axle', returnX, 0.054, 0.094);
    // Common external tangents keep the belt connected to unequal pulleys.
    const tangent = Math.acos((0.032 - 0.114) / Math.max(0.25, wheelX - returnX));
    for (const s of [-1, 1]) {
      const nx = Math.cos(tangent), ny = s * Math.sin(tangent);
      line(op, `operator_belt_${s}`, M.black,
        [returnX + 0.032 * nx, 0.054 + 0.032 * ny, 0.077],
        [wheelX + 0.114 * nx, 0.054 + 0.114 * ny, 0.077]);
    }
    torus(op, 'drive_belt_groove', M.black, 0.114, 0.004, wheelX, 0.054, 0.077);
    torus(op, 'return_belt_groove', M.black, 0.032, 0.004, returnX, 0.054, 0.077);
    const motorX = wheelX - Math.min(0.29, operatorLength * 0.2);
    cylinder(op, 'door_motor_body', M.dark, 0.061, 0.128, motorX, 0.281, -0.005, 'z');
    cylinder(op, 'door_motor_endplate', M.steel, 0.064, 0.012, motorX, 0.281, 0.065, 'z');
    cylinder(op, 'motor_pulley', M.dark, 0.025, 0.027, motorX, 0.281, 0.095, 'z');
    bolt(op, 'motor_axle', motorX, 0.281, 0.114);
    box(op, 'motor_bracket', M.steel, 0.17, 0.19, 0.018, motorX, 0.205, -0.066);
    for (const s of [-1, 1]) line(op, `motor_drive_belt_${s}`, M.black,
      [motorX + s * 0.022, 0.281, 0.087], [wheelX + s * 0.071, 0.073, 0.087], 0.007);
    box(op, 'door_control_enclosure', M.dark, 0.19, 0.16, 0.10, -Math.min(0.16, half * 0.3), 0.29, -0.042);
    box(op, 'door_control_label', M.steel, 0.085, 0.034, 0.002, -Math.min(0.16, half * 0.3), 0.29, 0.01);
    box(op, 'door_cable_duct', M.black, Math.max(0.15, operatorLength * 0.35), 0.02, 0.018, 0, 0.178, 0.023);
    for (const x of [-half + 0.09, half - 0.09]) {
      box(op, 'operator_mount_bracket', M.steel, 0.065, 0.21, 0.11, x, -0.10, -0.045);
      for (const y of [-0.04, 0.13]) bolt(op, 'operator_fixing', x, y, 0.022);
    }
    for (let k = 1; k < 6; k++) bolt(op, 'rail_fixing', -half + operatorLength * k / 6, -0.072, 0.027, 'z', 0.006);
    // Rear entrances use the same reference hardware, positioned at their own sill.
    if (entrance.sign < 0) box(op, 'rear_car_track', M.polished, operatorLength, 0.022, 0.028, 0, 0.01, 0.027);
  }

  // Sill channels and machined nosings, retaining the exact clear opening.
  function sill(parent, label, width, y, z, direction) {
    box(parent, `${label}_nosing`, M.polished, width, 0.009, 0.009, 0, y + 0.052, z + direction * 0.045);
    for (const k of [-1, 0, 1]) box(parent, `${label}_groove_${k}`, M.black, width - 0.045, 0.002, 0.005, 0, y + 0.051, z + k * 0.022);
    for (const x of [-width / 2 + 0.07, width / 2 - 0.07]) bolt(parent, `${label}_fixing`, x, y + 0.053, z - direction * 0.036, 'y', 0.006);
  }
  for (const e of entrances) sill(car, `${e.label}_car_sill`, dw + 0.3, yc, e.z + e.sign * 0.03, e.sign);
  for (let i = 0; i < r.floors.length; i++) {
    const y = r.floors[i];
    sill(stationary, `landing_sill_${i}`, dw + 0.2, y, zF - 0.05, 1);
    if (Number(P.entrances) === 2) sill(stationary, `rear_landing_sill_${i}`, dw + 0.2, y, d.zB + 0.05, -1);
  }
  // Moving details inherit existing door meshes; existing rig records stay intact.
  for (const o of [...doorRecords, ...r.hoistDoors.filter(o => /^(?:rear_)?hoistway_door_\d+_\d+$/.test(o.mesh.name))]) {
    const mesh = o.mesh, rear = mesh.name.startsWith('rear_'), sign = rear ? -1 : 1;
    const { width: w, height: h, depth: skin } = mesh.geometry.parameters;
    const detail = group(`detail_${mesh.name}`, mesh);
    const isCar = doorRecords.includes(o);
    box(detail, 'door_bottom_return', M.steel, Math.max(0.06, w - 0.025), 0.026, 0.003, 0, -h / 2 + 0.025, sign * (skin / 2 + 0.002));
    box(detail, 'door_edge_reveal', M.black, 0.003, h - 0.06, 0.002, -w / 2 + 0.005, 0, sign * (skin / 2 + 0.0015));
    box(detail, 'door_upper_fold', M.steel, Math.max(0.06, w - 0.028), 0.018, 0.003, 0, h / 2 - 0.023, sign * (skin / 2 + 0.002));
    if (isCar) {
      for (const s of [-1, 1]) {
        box(detail, 'car_hanger_plate', M.steel, 0.055, 0.17, 0.009, s * w * 0.28, h / 2 + 0.085, sign * 0.043);
        for (const y of [h / 2 + 0.033, h / 2 + 0.13]) bolt(detail, 'hanger_adjustment', s * w * 0.28, y, sign * 0.052);
        if (rear) {
          cylinder(detail, 'rear_hanger_roller', M.dark, 0.035, 0.022, s * w * 0.28, h / 2 + 0.165, sign * 0.041, 'z');
          bolt(detail, 'rear_hanger_axle', s * w * 0.28, h / 2 + 0.165, sign * 0.057);
        }
      }
    }
  }

  // Cabin finish details sit inside the existing CW/CD envelope.
  for (const s of [-1, 1]) {
    const x = s * (cw / 2 - 0.015);
    box(car, 'side_skirting_shadow', M.black, 0.003, 0.007, cd - 0.05, x, yc + 0.124, zc);
    box(car, 'side_ceiling_reveal', M.black, 0.004, 0.014, cd - 0.06, x, yc + CH - 0.085, zc);
    for (const f of [1 / 3, 2 / 3]) box(car, 'satin_panel_edge', M.polished, 0.002, CH - 0.24, 0.003,
      s * (cw / 2 - 0.002), yc + CH / 2, zc - cd / 2 + cd * f + 0.006);
    for (let k = 0; k < 8; k++) box(car, 'cabin_lower_vent', M.black, 0.0025, 0.009, Math.min(0.18, cd * 0.15),
      s * (cw / 2 - 0.002), yc + 0.17 + k * 0.018, zc - cd * 0.22);
  }
  if (Number(P.entrances) === 1) {
    for (const s of [-1, 1]) box(car, 'rear_panel_reveal', M.black, 0.006, CH - 0.18, 0.003,
      s * cw / 3, yc + CH / 2, zc - cd / 2 + 0.002);
    box(car, 'rear_skirting_shadow', M.black, cw - 0.05, 0.007, 0.003, 0, yc + 0.124, zc - cd / 2 + 0.015);
  }
  for (const s of [-1, 1]) box(car, 'floor_perimeter_reveal', M.dark, 0.005, 0.002, cd - 0.08,
    s * (cw / 2 - 0.036), yc + 0.022, zc);
  // The roof station gains tactile controls and the sling gains its joint plates.
  const station = r.car.getObjectByName('car_top_station');
  if (station) {
    const p = station.position;
    box(car, 'roof_station_face', M.steel, 0.23, 0.007, 0.10, p.x, p.y + 0.084, p.z);
    cylinder(car, 'roof_stop_collar', M.yellow, 0.025, 0.009, p.x - 0.065, p.y + 0.094, p.z);
    cylinder(car, 'roof_stop_mushroom', M.red, 0.021, 0.019, p.x - 0.065, p.y + 0.108, p.z);
    for (const x of [0.005, 0.065]) cylinder(car, 'roof_inspection_button', M.black, 0.013, 0.013, p.x + x, p.y + 0.098, p.z);
  }
  for (const s of [-1, 1]) {
    const x = s * (cw / 2 + 0.045);
    for (const y of [yc - 0.2, yc + CH + 0.43]) {
      box(car, 'sling_joint_plate', M.steel, 0.12, 0.2, 0.012, x, y, zc + 0.08);
      for (const dx of [-0.032, 0.032]) for (const dy of [-0.06, 0.06]) bolt(car, 'sling_plate_bolt', x + dx, y + dy, zc + 0.091);
    }
  }
  // Fixture details stay on their existing faces and retain indicator animation.
  for (let i = 0; i < r.floors.length; i++) {
    const y = r.floors[i], x = dw / 2 + 0.6, z = zF + 0.238;
    for (const dy of [1.04, 1.16]) {
      torus(stationary, 'hall_button_bezel', M.polished, 0.027, 0.004, x, y + dy, z);
      const up = dy > 1.1;
      const tipY = y + dy + (up ? 0.008 : -0.008), tailY = y + dy + (up ? -0.005 : 0.005);
      for (const s of [-1, 1]) line(stationary, 'hall_button_arrow', M.lens, [x + s * 0.008, tailY, z + 0.004], [x, tipY, z + 0.004], 0.003, 0.003);
    }
    for (const dy of [0.99, 1.21]) bolt(stationary, 'hall_fixture_screw', x, y + dy, zF + 0.223, 'z', 0.0035);
    const lamp = model.getObjectByName(`position_indicator_lamp_${i}`);
    if (lamp) {
      // Frame the existing live lamp without inventing a floor number or changing
      // its animated material; floor labels remain owned by the original UI.
      const face = group(`detail_indicator_mask_${i}`, lamp);
      for (const s of [-1, 1]) {
        box(face, 'display_side_reveal', M.black, 0.005, 0.066, 0.001, s * 0.127, 0, 0.003);
        box(face, 'display_edge_reveal', M.black, 0.25, 0.004, 0.001, 0, s * 0.032, 0.003);
      }
    }
  }
  for (let k = 0; k < Math.min(r.floors.length, 6); k++) torus(car, 'cop_button_bezel', M.polished, 0.020, 0.003,
    cw / 2 - 0.031, yc + 0.95 + k * 0.1, fz - 0.15, 'x');
  for (const z of [fz - 0.19, fz - 0.11]) torus(car, 'cop_auxiliary_bezel', M.polished, 0.020, 0.003,
    cw / 2 - 0.031, yc + 0.85, z, 'x');

  // Bolt details are children of rail plates so later layout transforms carry them.
  const railPlates = [];
  model.traverse(o => { if (/^(?:car|cwt)_rail_fishplate_/.test(o.name) && o.isMesh) railPlates.push(o); });
  for (const plate of railPlates) {
    const g = group(`detail_${plate.name}`, plate), carRail = plate.name.startsWith('car');
    for (const a of [-0.027, 0.027]) for (const y of [-0.115, 0.115]) {
      if (carRail) bolt(g, 'rail_joint_bolt', plate.position.x < 0 ? 0.011 : -0.011, y, a, 'x', 0.009);
      else bolt(g, 'rail_joint_bolt', a, y, 0.011, 'z', 0.009);
    }
  }
  // Buffer gland rings and accordion sleeves describe the existing stroke only.
  for (const name of ['car_buffer_0', 'car_buffer_1', 'cwt_buffer']) {
    const body = model.getObjectByName(name), plunger = model.getObjectByName(`${name.startsWith('car') ? 'car_buffer_plunger_' + name.slice(-1) : 'cwt_buffer_plunger'}`);
    if (!body?.geometry?.parameters || !plunger?.geometry?.parameters) continue;
    const detail = group(`detail_${name}`, body);
    const h = body.geometry.parameters.height;
    cylinder(detail, 'buffer_gland', M.dark, 0.098, 0.029, 0, h / 2, 0);
    torus(detail, 'buffer_gland_rim', M.polished, 0.087, 0.005, 0, h / 2 + 0.016, 0, 'y');
    const sleeve = group(`detail_${name}_bellows`, plunger);
    const ph = plunger.geometry.parameters.height, sleeveHeight = Math.min(0.12, ph * 0.42);
    if (sleeveHeight > 0.01) for (let k = 0; k < 6; k++) torus(sleeve, 'buffer_dust_bellows', M.black,
      0.052, 0.006, 0, -ph / 2 + 0.018 + k * sleeveHeight / 6, 0, 'y');
    cylinder(sleeve, 'buffer_contact_cap', M.black, 0.08, 0.014, 0, ph / 2 + 0.007, 0);
  }
  for (const [name, b] of batches) {
    const mesh = new THREE.InstancedMesh(b.geo, b.mat, b.matrices.length);
    mesh.name = `${b.parent.name}_${b.mat.name}_${b.geo === unitHex ? 'fasteners' : 'parts'}`;
    b.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = false;
    mesh.userData.partNames = b.names;
    b.parent.add(mesh);
  }
  model.userData.modelDetails = {
    version: 1, parameterChanges: false, operatorLengthMM: Math.round(operatorLength * 1000),
    operatorBasis: photoOperator ? 'supplied-two-panel-center-table' : 'schematic-motion-envelope',
    instances: [...batches.values()].reduce((n, b) => n + b.matrices.length, 0),
  };
  let disposed = false;
  model.userData.disposeModelDetails = () => {
    if (disposed) return;
    disposed = true;
    for (const geo of geometries) geo.dispose();
    for (const mat of materials) mat.dispose();
  };
  return model;
}
