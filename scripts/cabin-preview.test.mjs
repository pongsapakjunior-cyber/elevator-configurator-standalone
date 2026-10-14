import assert from 'node:assert/strict';
import test from 'node:test';
import {homography,project,CEILING_CODES,FLOOR_CODES,CABIN_PLANES} from '../assets/cabin-preview.mjs';

test('perspective mapping preserves all four calibrated corners',()=>{
  const source=[[40,65],[480,65],[389,235],[132,235]];
  const target=CABIN_PLANES.ceiling;
  const map=homography(source,target),inverse=homography(target,source);
  for(let i=0;i<4;i++) {
    const actual=project(map,...source[i]);
    actual.forEach((value,j)=>assert.ok(Math.abs(value-target[i][j])<1e-6));
    const original=project(inverse,...actual);
    original.forEach((value,j)=>assert.ok(Math.abs(value-source[i][j])<1e-6));
  }
});
test('floor projection is invertible inside the plane',()=>{
  const source=[[0,0],[100,0],[100,100],[0,100]],target=CABIN_PLANES.floor;
  const map=homography(source,target),inverse=homography(target,source);
  for(const point of [[12,45],[50,50],[99,1]]) {
    const actual=project(inverse,...project(map,...point));
    actual.forEach((value,i)=>assert.ok(Math.abs(value-point[i])<1e-6));
  }
});
test('degenerate planes are rejected',()=>assert.throws(()=>homography([[0,0],[0,0],[0,0],[0,0]],CABIN_PLANES.floor)));
test('only supported catalogue codes are exposed',()=>{
  assert.equal(CEILING_CODES.length,12); assert.equal(FLOOR_CODES.length,60);
  assert.equal(new Set(FLOOR_CODES).size,60);
  assert.ok(CEILING_CODES.includes('CD-004'));assert.ok(FLOOR_CODES.includes('MG-03'));
});
