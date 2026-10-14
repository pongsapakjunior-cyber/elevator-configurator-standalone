import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../../Schneiderlift-live-portfolio/vendor/three.module.min.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const build=new Function('THREE',html.slice(html.indexOf('const DEFAULTS ='),html.indexOf('// Pose the rig'))+';return buildElevator;')(THREE);
const pose=new Function('THREE',html.slice(html.indexOf('function poseElevator'),html.indexOf('// Shared motion cycle'))+';return poseElevator;')(THREE);
for(const [doorType,doorPanels] of [['center',2],['center',4],['side',1],['side',2],['side',3],['side',4]])for(const entrances of [1,2]){
  test(`${doorType}/${doorPanels} panels/${entrances} entrances: door stacks separate and align at every landing`,()=>{
    const input={doorType,doorPanels,entrances,carW:1800,carD:1500,shaftW:2500,shaftD:1800,doorW:1100};
    const source=JSON.stringify(input),model=build(input),r=model.userData.rig;
    const cars=r.carDoors.filter(o=>/^(rear_)?car_door_\d+$/.test(o.mesh.name));
    for(const [floor,y] of r.floors.entries())for(const open of [0,.5,1]){
      pose(model,y,open,floor);model.updateMatrixWorld(true);
      for(const car of cars){
        const rear=car.mesh.name.startsWith('rear_'),index=car.mesh.name.match(/(\d+)$/)[1];
        const landing=model.getObjectByName(`${rear?'rear_':''}hoistway_door_${floor}_${index}`);
        const a=new THREE.Box3().setFromObject(car.mesh),b=new THREE.Box3().setFromObject(landing);
        assert.ok(Math.abs(a.min.x-b.min.x)<1e-5&&Math.abs(a.max.x-b.max.x)<1e-5,'inner and outer opening stay aligned');
        assert.ok(Math.abs(a.min.y-b.min.y)<1e-5&&Math.abs(a.max.y-b.max.y)<1e-5,'inner and outer door heights align');
        for(const other of r.hoistDoors.filter(o=>new RegExp(`^${rear?'rear_':''}hoistway_door_${floor}_\\d+$`).test(o.mesh.name))){
          const outside=new THREE.Box3().setFromObject(other.mesh);
          assert.ok(rear?outside.max.z<a.min.z:a.max.z<outside.min.z,'all car leaves clear all landing leaves');
        }
      }
      for(const door of r.hoistDoors)if(door.floor!==floor)assert.ok(Math.abs(door.mesh.position.x-(door.x0+(door.dx||0)))<1e-5,'other floors stay closed');
    }
    assert.equal(JSON.stringify(input),source);
    model.traverse(o=>o.geometry?.dispose());
  });
}
