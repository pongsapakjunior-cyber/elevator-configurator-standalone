// Render-space arrangement only. Saved dimensions and configuration are never
// written here; component sizes are schematic envelopes, not equipment ratings.
export function arrangeModel(THREE, model, reference) {
  const r = model.userData.rig, d = r.dims;
  if (r.layout?.version === 2) return model;
  const side = reference.counterweightSide === 'side';
  const oldCz = -d.sd / 2 + 0.14, halfW = d.sw / 2, halfD = d.sd / 2;
  const gap = (d.sw - d.cw) / 2;
  const cx = side ? -halfW + Math.min(0.16, gap / 2) : 0;
  const cz = side ? d.zc : oldCz;
  r.layout = { version: 2, counterweightSide: side ? 'side' : 'rear', counterweightX: cx, counterweightZ: cz };
  if (!side) return model;
  const twoOne = r.params.roping === 2, isMRL = r.params.elevatorType === 'mrl';
  const oldR = r.R, oldYS = r.ys, oldMid = (d.zc + oldCz) / 2;
  const quarterTurn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const get = name => model.getObjectByName(name);
  const replaceGeometry = (mesh, geometry) => {
    mesh.geometry.dispose(); mesh.geometry = geometry; mesh.scale.set(1, 1, 1);
  };
  const cylinderRadius = (mesh, radius, height = mesh.geometry.parameters.height) =>
    replaceGeometry(mesh, new THREE.CylinderGeometry(radius, radius, height, 48));
  const worldBox = (name, width, height, depth, x, y, z) => {
    const mesh = get(name);
    if (!mesh) return;
    replaceGeometry(mesh, new THREE.BoxGeometry(Math.max(0.001, width), Math.max(0.001, height), Math.max(0.001, depth)));
    mesh.quaternion.identity(); mesh.position.set(x, y, z);
  };
  const turn = (mesh, oldX, oldZ, newX, newZ, thickness = 1) => {
    const x = mesh.position.x - oldX, z = mesh.position.z - oldZ;
    mesh.position.x = newX + z * thickness; mesh.position.z = newZ - x;
    // All counterweight/frame members use their original local Z as depth.
    mesh.scale.z *= thickness;
    mesh.quaternion.premultiply(quarterTurn);
  };

  // Frame, rails and guards occupy the available side corridor. Keep their
  // detail children attached so bolts and buffer rings receive the same move.
  const frameThickness = Math.min(1, (cx + halfW - 0.025) / 0.15, (-d.cw / 2 - 0.025 - cx) / 0.18);
  for (const mesh of r.cwt.children) turn(mesh, 0, oldCz, cx, cz, /^cwt_diverter/.test(mesh.name) ? 1 : Math.max(0.2, frameThickness));
  for (const mesh of model.children) if (/^cwt_(rail|screen|buffer)/.test(mesh.name)) turn(mesh, 0, oldCz, cx, cz, Math.max(0.2, frameThickness));

  const face = d.cw / 2 + Math.min(0.105, Math.max(0.07, gap - 0.22));
  for (const mesh of model.children) if (/^car_rail_/.test(mesh.name)) {
    const sign = mesh.position.x < 0 ? -1 : 1;
    mesh.position.x += sign * face - sign * (halfW - 0.06);
  }
  for (const mesh of r.car.children.filter(mesh => /^car_guide_shoe_/.test(mesh.name))) {
    const sign = mesh.position.x < 0 ? -1 : 1, inside = d.cw / 2 + 0.07;
    replaceGeometry(mesh, new THREE.BoxGeometry(Math.max(0.035, face - inside + 0.04), 0.18, 0.2));
    mesh.position.x = sign * (inside + face) / 2;
  }
  r.car.children.filter(mesh => /^(car_diverter|rope_shackle)/.test(mesh.name)).forEach(mesh => turn(mesh, 0, d.zc, 0, d.zc));

  // 2:1 falls meet opposite tangents of each moving pulley, rather than its
  // centre. The CWT pulley fits between the shaft wall and the cabin envelope.
  const carRadius = twoOne ? Math.min(0.2, d.cw * 0.2) : 0;
  const cwtRadius = twoOne ? Math.max(0.025, Math.min(0.2, cx + halfW - 0.03, -d.cw / 2 - 0.05 - cx)) : 0;
  const carFallX = -carRadius, cwtFallX = cx + cwtRadius;
  const newR = (carFallX - cwtFallX) / 2, mid = (carFallX + cwtFallX) / 2;
  const newBR = Math.max(0.2, newR - 0.11) - 0.02;
  const newYS = isMRL ? Math.min(oldYS, d.TOP - Math.max(0.65, newR + 0.06)) : d.TOP + 0.55 + newR;
  const machineBaseY = isMRL ? newYS - newR - 0.22 : d.TOP + 0.375;
  const riseCar = r.floors.at(-1) - r.yc, riseCwt = r.yc - r.floors[0];
  let carSheaveY = twoOne ? get('car_diverter_sheave_0').position.y : r.yc + d.CH + 0.85;
  if (twoOne) {
    const previous = carSheaveY;
    carSheaveY = Math.min(previous, newYS - riseCar - 0.12);
    for (const mesh of r.car.children.filter(mesh => /^car_diverter/.test(mesh.name))) mesh.position.y += carSheaveY - previous;
    for (const [i, z] of [d.zc + 0.1, d.zc - 0.1].entries()) {
      const pulley = get(`car_diverter_sheave_${i}`);
      cylinderRadius(pulley, carRadius, 0.16); pulley.position.set(0, carSheaveY, z);
    }
    worldBox('car_diverter_bracket_0', 0.16, 0.25, 0.07, 0, carSheaveY - 0.15, d.zc + 0.22);
    worldBox('car_diverter_bracket_1', 0.16, 0.25, 0.07, 0, carSheaveY - 0.15, d.zc - 0.22);
    worldBox('car_diverter_beam', 0.16, 0.1, 0.6, 0, carSheaveY - 0.27, d.zc);
  }
  let cwtEndY = twoOne ? get('cwt_diverter_sheave').position.y : r.cy + 1.58;
  const cwtDrop = Math.min(0, newYS - riseCwt - 0.12 - cwtEndY);
  if (cwtDrop < 0) {
    r.cwt.children.forEach(mesh => { mesh.position.y += cwtDrop; });
    r.cy += cwtDrop; cwtEndY += cwtDrop;
    // Preserve a gap above the buffer throughout travel after lowering the CWT.
    const lowFrame = r.cy - riseCar - 1.3;
    const bufferTop = Math.max(0.2, lowFrame - 0.15), pedestalHeight = Math.max(0.05, bufferTop - 1.15);
    const strokeScale = Math.min(1, (bufferTop - pedestalHeight) / 1.15);
    const pedestalWidth = Math.min(0.22, 2 * (cx + halfW - 0.02), 2 * (-d.cw / 2 - 0.02 - cx));
    worldBox('cwt_buffer_pedestal', pedestalWidth, pedestalHeight, 0.5, cx, pedestalHeight / 2, cz);
    const body = get('cwt_buffer'), plunger = get('cwt_buffer_plunger');
    body.scale.y = strokeScale; body.position.y = pedestalHeight + 0.35 * strokeScale;
    plunger.scale.y = strokeScale; plunger.position.y = pedestalHeight + 0.925 * strokeScale;
  }
  if (twoOne) {
    const pulley = get('cwt_diverter_sheave');
    cylinderRadius(pulley, cwtRadius, 0.36); pulley.position.set(cx, cwtEndY, cz);
    worldBox('cwt_diverter_bracket', cwtRadius * 2, 0.06, 0.45, cx, cwtEndY + cwtRadius + 0.05, cz);
  }

  // Resize the drive as one assembly: disc, calipers, bed and supports share
  // the new radius. Axial compression keeps motor and encoder inside depth.
  const axialScale = Math.min(1, (d.zc + halfD - 0.04) / 1.2, (halfD - d.zc - 0.04) / 0.9);
  const radialSpace = Math.min(mid + halfW - 0.035, halfW - mid - 0.035);
  const motorScale = Math.min(1, radialSpace / 0.45);
  const machine = /^(machine_(?!slab)|traction_sheave|sheave_|bearing_|motor_|encoder$|brake_|rope_arc_|mrl_machine_|mrl_service_)/;
  for (const mesh of model.children) {
    if (!machine.test(mesh.name)) continue;
    const n = mesh.name;
    if (/^(traction_sheave|sheave_groove_rim_)/.test(n)) {
      const p = mesh.geometry.parameters;
      cylinderRadius(mesh, newR + ((p.radiusTop || oldR) - oldR));
    } else if (n === 'brake_disc') cylinderRadius(mesh, newBR + 0.02);
    else if (n === 'brake_disc_vent') mesh.scale.y = Math.max(0.3, newR * 1.1) / mesh.geometry.parameters.height;
    else if (/^rope_arc_/.test(n)) replaceGeometry(mesh, new THREE.TorusGeometry(newR, 0.008, 6, 40, Math.PI));
    else if (/^sheave_spoke_/.test(n)) mesh.scale.y = newR / oldR;
    mesh.position.y += newYS - oldYS;
    if (/^motor_/.test(n)) {
      mesh.position.y = newYS + (mesh.position.y - newYS) * motorScale;
      mesh.position.z = oldMid + (mesh.position.z - oldMid) * motorScale;
      if (mesh.geometry.type === 'CylinderGeometry') { mesh.scale.x *= motorScale; mesh.scale.z *= motorScale; }
      else { mesh.scale.y *= motorScale; mesh.scale.z *= motorScale; }
    }
    if (n === 'brake_caliper_top') mesh.position.y = newYS + newBR;
    if (n === 'brake_caliper_bottom') mesh.position.y = newYS - newBR;
    if (n === 'brake_frame') mesh.scale.y = (2 * newBR + 0.2) / (2 * r.bR + 0.2);
    // Rope groove pitch is shared with the four falls, never axially compressed.
    if (!/^rope_arc_|^(traction_sheave|sheave_groove_rim_)/.test(n)) mesh.applyMatrix4(new THREE.Matrix4().makeScale(axialScale, 1, 1));
    turn(mesh, 0, oldMid, mid, d.zc);
    delete mesh.userData.rot0;
  }
  const bedWidth = Math.min(2 * newR + 0.3, radialSpace * 2), bedDepth = Math.min(1.9, d.sd - 0.1);
  worldBox('machine_bedplate', bedWidth, 0.15, bedDepth, mid, machineBaseY, 0);
  const supportY = machineBaseY + 0.08;
  worldBox('bearing_pedestal_left', Math.min(0.42, radialSpace * 2), Math.max(0.1, newYS - supportY), 0.22 * axialScale,
    mid, (newYS + supportY) / 2, d.zc + 0.38 * axialScale);
  const footTop = newYS - 0.4 * motorScale, footBottom = machineBaseY + 0.05;
  worldBox('motor_foot', Math.min(0.9 * motorScale, bedWidth), Math.max(0.06, footTop - footBottom), 0.7 * axialScale,
    mid, (footTop + footBottom) / 2, d.zc - 0.62 * axialScale);
  if (isMRL) {
    worldBox('mrl_machine_beam', Math.min(0.28, bedWidth), 0.22, d.sd - 0.12, mid, machineBaseY - 0.15, 0);
    worldBox('mrl_service_platform', Math.min(0.65, bedWidth), 0.06, Math.min(1.2, d.sd - 0.12), mid, machineBaseY - 0.33, 0);
  }
  const brand = get('machine_brand_plate');
  if (brand) { brand.position.set(mid + bedWidth / 2 + 0.002, machineBaseY, 0); brand.rotation.set(0, Math.PI / 2, 0); }

  const deadTop = isMRL ? d.TOP - 0.1 : d.TOP + 0.14;
  const resetFall = (record, x, z, top, bottom) => {
    const length = top - bottom;
    replaceGeometry(record.mesh, new THREE.CylinderGeometry(0.008, 0.008, Math.max(0.001, length), 10));
    record.mesh.quaternion.identity(); record.mesh.position.set(x, top - length / 2, z);
    record.len = length; record.topY = top;
  };
  for (const records of [r.ropesCar, r.ropesCwt]) for (const record of records) {
    const name = record.mesh.name, i = Number(name.match(/_(\d+)$/)[1]);
    const isCar = name.startsWith('rope_car'), dead = name.includes('deadend');
    const x = isCar ? (dead ? carRadius : carFallX) : (dead ? cx - cwtRadius : cwtFallX);
    const z = d.zc - (-0.15 + i * 0.1);
    resetFall(record, x, z, dead ? deadTop : newYS, isCar ? carSheaveY : cwtEndY);
  }
  for (let i = 0; i < 4; i++) {
    const z = d.zc - (-0.15 + i * 0.1), arc = get(`rope_arc_${i}`);
    arc.position.set(mid, newYS, z);
    if (twoOne) for (const [name, parent, radius, x, y] of [
      ['car', r.car, carRadius, 0, carSheaveY], ['cwt', r.cwt, cwtRadius, cx, cwtEndY],
    ]) {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.008, 6, 32, Math.PI), r.ropesCar[0].mesh.material);
      wrap.name = `layout_${name}_rope_wrap_${i}`; wrap.position.set(x, y, z); wrap.rotation.z = Math.PI; parent.add(wrap);
    }
  }
  if (twoOne) {
    const deadLeft = cx - cwtRadius, deadRight = carRadius;
    const beamLeft = Math.max(-halfW + 0.01, deadLeft - 0.06), beamRight = deadRight + 0.06;
    worldBox('deadend_beam', beamRight - beamLeft, 0.1, 0.48, (beamLeft + beamRight) / 2, deadTop + 0.05, d.zc);
    worldBox('deadend_hitch_car', 0.12, 0.08, 0.4, deadRight, deadTop, d.zc);
    worldBox('deadend_hitch_cwt', deadLeft + 0.06 - beamLeft, 0.08, 0.4, (beamLeft + deadLeft + 0.06) / 2, deadTop, d.zc);
  }

  if (!isMRL) {
    // Rebuild the MR slab around all relocated live and dead rope falls.
    const falls = [...r.ropesCar, ...r.ropesCwt].map(o => o.mesh.position);
    const x0 = Math.min(...falls.map(p => p.x)) - 0.075, x1 = Math.max(...falls.map(p => p.x)) + 0.075;
    const z0 = Math.min(...falls.map(p => p.z)) - 0.075, z1 = Math.max(...falls.map(p => p.z)) + 0.075;
    const slabHalfW = Math.max(d.sw + 0.4, 2.8) / 2, slabBack = -halfD - 0.2, slabFront = halfD + 0.9;
    const slabY = d.TOP + 0.15;
    worldBox('machine_slab_front', slabHalfW * 2, 0.3, slabFront - z1, 0, slabY, (slabFront + z1) / 2);
    worldBox('machine_slab_back', slabHalfW * 2, 0.3, z0 - slabBack, 0, slabY, (z0 + slabBack) / 2);
    worldBox('machine_slab_left', x0 + slabHalfW, 0.3, z1 - z0, (x0 - slabHalfW) / 2, slabY, (z0 + z1) / 2);
    worldBox('machine_slab_right', slabHalfW - x1, 0.3, z1 - z0, (slabHalfW + x1) / 2, slabY, (z0 + z1) / 2);
    worldBox('rope_kerb_front', x1 - x0 + 0.08, 0.1, 0.04, (x0 + x1) / 2, d.TOP + 0.35, z1 + 0.02);
    worldBox('rope_kerb_back', x1 - x0 + 0.08, 0.1, 0.04, (x0 + x1) / 2, d.TOP + 0.35, z0 - 0.02);
    worldBox('rope_kerb_left', 0.04, 0.1, z1 - z0, x0 - 0.02, d.TOP + 0.35, (z0 + z1) / 2);
    worldBox('rope_kerb_right', 0.04, 0.1, z1 - z0, x1 + 0.02, d.TOP + 0.35, (z0 + z1) / 2);
    r.layout.slabOpening = { x0, x1, z0, z1 };
  }
  r.R = newR; r.bR = newBR; r.ys = newYS;
  Object.assign(r.layout, { carFallX, cwtFallX, carPulleyRadius: carRadius, cwtPulleyRadius: cwtRadius, cwtDrop,
    driveAxleY: newYS, driveRadius: newR, carSheaveY, cwtEndY });
  return model;
}
