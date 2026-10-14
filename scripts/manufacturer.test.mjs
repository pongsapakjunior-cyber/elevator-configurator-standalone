import {test} from 'node:test';
import assert from 'node:assert/strict';
import {manufacturerModel,renderManufacturerSheets,sanitizeManufacturer,FACTORY_FIELDS} from '../assets/manufacturer.mjs';
const fixture={project:'โครงการทดสอบ',modelName:'SEL(MRL)450',elevatorType:'mrl',shaftW:1600,shaftD:1800,carW:1200,carD:1200,carH:2400,doorW:700,doorH:2100,pit:1500,overhead:3700,capacity:450,speed:1,roping:2,entrances:1,doorType:'center',doorPanels:2,floors:3,floorToFloor:3400,manufacturer:{layout:'duplex',divider:200}};
test('duplex dimension numbers follow inputs; known-only arithmetic',()=>{
 const model=manufacturerModel(fixture);assert.equal(model.bankWidth,3400);assert.equal(model.travel,6800);assert.equal(model.totalHeight,12000);
 const next=manufacturerModel({...fixture,shaftW:1900,floors:4,floorHeightMode:'individual',floorHeights:[3000,3100,3200],overhead:3000});
 assert.equal(next.bankWidth,4000);assert.equal(next.travel,9300);assert.equal(next.overhead,3000);
 const svg=renderManufacturerSheets({...fixture,shaftW:1900})[0];assert.match(svg,/01 Shaft Width 1,900/);assert.match(svg,/07 Overall 4,000/);
});
test('unknown divider, motor, current, rails and reactions are never copied or inferred',()=>{
 const model=manufacturerModel({...fixture,manufacturer:{}});assert.equal(model.bankWidth,null);
 assert(FACTORY_FIELDS.every(([key])=>model.manufacturer.fields[key]===''));
 assert.match(renderManufacturerSheets({...fixture,manufacturer:{}})[0],/divider TBC/);
 assert.equal(sanitizeManufacturer({divider:-200}).divider,'');assert.equal(sanitizeManufacturer({divider:3000}).divider,'');
});
test('factory entries are optional supplied text, preserved separately from live dimensions',()=>{
 const model=manufacturerModel({...fixture,manufacturer:{layout:'single',fields:{motorPower:'Factory entry 4.5',ratedCurrent:'Factory entry 12.9'}}});
 assert.equal(model.bankWidth,1600);assert.equal(model.manufacturer.fields.motorPower,'Factory entry 4.5');
 assert.equal(model.capacity,450);
});
test('project and quotation details update on every render, and XML is escaped',()=>{
 const next={...fixture,project:'New & <Project>',quotationContext:{quoteNo:'ST.TEST',specifications:[['Requirements','<script>alert(1)</script>']]}};
 const sheets=renderManufacturerSheets(next).join('');assert.match(sheets,/New &amp; &lt;Project&gt;/);assert.match(sheets,/ST.TEST/);assert(!sheets.includes('<script>'));
 assert(!sheets.includes(fixture.project));
});
test('40 stops and long descriptions continue onto bounded sheets without losing the last floor/text',()=>{
 const long='รายละเอียด '.repeat(100)+'LAST REQUIREMENT';
 const sheets=renderManufacturerSheets({...fixture,floors:40,quotationContext:{specifications:[['Long requirement',long]]}});
 assert(sheets.length>=4);assert.match(sheets.join(''),/F39 → F40/);assert.match(sheets.join(''),/LAST REQUIREMENT/);
 assert(sheets.every(svg=>!svg.includes('NaN')&&!svg.includes('undefined')));
});
test('incomplete floor data is TBC instead of an invented travel',()=>{
 const model=manufacturerModel({...fixture,floorHeightMode:'individual',floorHeights:[3000]});assert.equal(model.travel,null);assert.equal(model.totalHeight,null);
});
test('manufacturer schedule excludes decoration choices without modifying their configuration',()=>{
 const config={...fixture,cabinStyle:'SC-C-A',ceilingFinish:'CD-004',floorFinish:'MG-03',hallButtonFinish:'HB-01',copFinish:'COP-01',landingDoorFinish:'SD-006'};
 const snapshot=JSON.stringify(config),sheets=renderManufacturerSheets(config).join('');
 for(const value of ['cabinStyle','ceilingFinish','floorFinish','hallButtonFinish','copFinish','landingDoorFinish','SC-C-A','CD-004','MG-03','HB-01','COP-01','SD-006']) assert(!sheets.includes(value),value);
 assert.equal(JSON.stringify(config),snapshot);
});

test('factory redraw includes detailed hardware, a tall section and structural views',()=>{
 const [general,details]=renderManufacturerSheets(fixture);
 assert((general.match(/<(?:path|line|rect|circle|polygon)\b/g)||[]).length>700);
 for(const label of ['Traveling height 6,800','Pit + travel + OH 12,000','Pit ladder','CWT RG TBC','Car RG TBC'])assert(general.includes(label),label);
 for(const label of ['STRUCTURAL OPENING','DOOR ENTRANCE DETAIL','MACHINE / SUPPORT PLAN'])assert(details.includes(label),label);
 const single=renderManufacturerSheets({...fixture,doorType:'side',doorPanels:3,manufacturer:{layout:'single'}}).join('');
 assert(single.includes('SINGLE SHAFT PLAN'));assert(single.includes('Side-opening / 3 panels'));
 assert(!single.includes('DUPLEX SHAFT PLAN'));assert(!single.includes('07 Overall'));
});

test('lifting hooks are excluded from factory fields and drawings, including legacy links',()=>{
 const legacy={...fixture,manufacturer:{...fixture.manufacturer,fields:{hook:'LEGACY-HOOK-RATING-2000',beam:'Factory beam entry'}}};
 const state=sanitizeManufacturer(legacy.manufacturer);
 assert(!FACTORY_FIELDS.some(([key,label])=>/hook/i.test(`${key} ${label}`)));
 assert(!Object.hasOwn(state.fields,'hook'));
 assert.equal(state.fields.beam,'Factory beam entry');
 assert(!Object.hasOwn(manufacturerModel(legacy).manufacturer.fields,'hook'));
 const sheets=renderManufacturerSheets(legacy).join('');
 assert.doesNotMatch(sheets,/hook|LEGACY-HOOK-RATING-2000/i);
 assert.match(sheets,/Factory beam entry/);
 assert.match(sheets,/Frame anchorage/);
});
