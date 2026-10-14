import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {manufacturerModel,renderManufacturerSheets,sanitizeManufacturer,FACTORY_FIELDS} from '../assets/manufacturer.mjs';
import {renderReferencePlan} from '../assets/manufacturer-reference-sheet.mjs';
import {duplexReference} from '../assets/manufacturer-duplex-reference.mjs';
import {factoryReference} from '../assets/manufacturer-factory-reference.mjs';

const fixture={project:'โครงการทดสอบ',modelName:'SEL(MRL)450',elevatorType:'mrl',shaftW:1600,shaftD:1800,carW:1200,carD:1200,carH:2400,doorW:700,doorH:2100,pit:1500,overhead:3700,capacity:450,speed:1,roping:2,entrances:1,doorType:'center',doorPanels:2,floors:3,floorToFloor:3400,manufacturer:{layout:'duplex',divider:200}};
const single={...fixture,manufacturer:{layout:'single'}};
const hash=value=>createHash('sha256').update(value).digest('hex');
const escapePattern=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const textContents=svg=>[...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(match=>match[1]);
const joinedText=svg=>textContents(svg).join('').replace(/\s/g,'');
function suppliedDetailsText(svg){
 const values=textContents(svg),start=values.indexOf('SUPPLIED PROJECT / FACTORY DETAILS')+1;
 const end=values.indexOf('FOR MANUFACTURER REVIEW',start);
 const continuation=values.indexOf('CONTINUED SUPPLIED DETAILS - SAME DRAWING SHEET');
 return [...values.slice(start,end),...(continuation<0?[]:values.slice(continuation+1))].join('').replace(/\s/g,'');
}
function fieldTexts(svg,attribute,field){
 return [...svg.matchAll(new RegExp(`<text\\b[^>]*\\b${attribute}="${escapePattern(field)}"[^>]*>([^<]*)<\\/text>`,'g'))].map(match=>match[1]);
}
function sheetGeometry(svg){
 const root=svg.match(/<svg\b[^>]*>/)?.[0];assert(root,'One SVG root is present');
 const attribute=name=>root.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
 const [x,y,width,height]=(attribute('viewBox')||'').trim().split(/\s+/).map(Number);
 assert.equal(x,0);assert.equal(y,0);assert(Number.isFinite(width)&&width>0);assert(Number.isFinite(height)&&height>0);
 return {width,height,physicalWidth:parseFloat(attribute('width')),physicalHeight:parseFloat(attribute('height'))};
}
function assertSingleSheet(sheets){
 assert.equal(sheets.length,1,'Manufacturer is one combined drawing, not continuation pages');
 const [svg]=sheets;
 assert.equal((svg.match(/<svg\b/g)||[]).length,1,'Only one root SVG is exported');
 assert.equal((svg.match(/<\/svg>/g)||[]).length,1);
 assert.doesNotMatch(svg,/NaN|undefined|Infinity/);
 return svg;
}
function fixedGeometry(svg){
 // Text (including font fitting) can change; construction paths, clipping and
 // view transforms must not stretch when entered dimensions change.
 return (svg.match(/<(?:path|line|rect|circle|ellipse|polygon|polyline)\b[^>]*>|<g\b[^>]*\btransform="[^"]*"[^>]*>/g)||[]).join('');
}
function assertValues(svg,attribute,expected){
 for(const [key,value] of Object.entries(expected)){
  const values=fieldTexts(svg,attribute,key);
  assert(values.length,`${key} has a live ${attribute} binding`);
  assert(values.every(text=>text.includes(value)),`${key}: every occurrence contains ${value}, got ${values.join(' / ')}`);
 }
}

test('reference linework is native vector geometry at the original image proportions',()=>{
 assert.deepEqual([duplexReference.width,duplexReference.height],[1145,869]);
 assert.deepEqual([factoryReference.width,factoryReference.height],[1847,1320]);
 assert.equal(duplexReference.sourceSha256,'cc6c91f8f69ac9cbc341d8b21cd2823d9f0a4457cdf8705cef2ac03ba3563c9f');
 assert.equal(factoryReference.sourceSha256,'914ed3de4833649b93a95acb87539498648fea7e3e2e921b1f9c06dcd7eb8357');
 // These fingerprints exclude live text. A changed reference trace requires
 // explicit visual review instead of silently substituting a generic redraw.
 assert.equal(hash(duplexReference.markup),'c3fa9064948872ba6fada6c9fbe115239b1670873768afad169038a90d1ded87');
 assert.equal(hash(factoryReference.markup),'0ed05e3030e2f6f79ba5c89cabf8344c3c9fd81ee3d6742b6508c3652776651f');
 for(const template of [duplexReference,factoryReference]){
  assert.match(template.markup,/<path\b/);
  assert.doesNotMatch(template.markup,/<image\b|<foreignObject\b|data:image|https?:\/\/|\.jpe?g|\.png/i);
 }
});

test('all original factory views and grids remain in one default A2 landscape sheet',()=>{
 for(const config of [fixture,single]){
  const svg=assertSingleSheet(renderManufacturerSheets(config));
  assert.deepEqual(sheetGeometry(svg),{width:2400,height:1697,physicalWidth:594,physicalHeight:420});
  assert(svg.includes(factoryReference.markup),'Complete original factory linework is retained');
  assert.doesNotMatch(svg,/<image\b|<foreignObject\b|data:image/i);
  assert.match(svg,/FOR MANUFACTURER REVIEW/);assert.match(svg,/NOT FOR CONSTRUCTION/);
 }
 assert.deepEqual(factoryReference.regions.shaftPlan,{x:606,y:87,width:422,height:394});
 assert.deepEqual(factoryReference.regions.section,{x:186,y:203,width:352,height:1028});
 assert.deepEqual(factoryReference.regions.supportPlan,{x:1053,y:91,width:363,height:374});
 assert.deepEqual(factoryReference.regions.isometric,{x:665,y:602,width:489,height:639});
 assert.deepEqual(factoryReference.regions.entrance,{x:1122,y:477,width:334,height:328});
 assert.deepEqual(factoryReference.regions.doorGlass,{x:1230,y:809,width:201,height:296});
});

test('duplex uses both source lifts and their original dimension-line geometry',()=>{
 const duplex=assertSingleSheet(renderManufacturerSheets(fixture));
 assert(duplex.includes(duplexReference.markup));assert.match(duplex,/data-reference="duplex-plan"/);
 assert.equal(fieldTexts(duplex,'data-dimension','bankWidth').length,1);
 assert.equal(fieldTexts(duplex,'data-dimension','carW').length,2,'Both duplex cabins have independent label locations');
 assert.equal(fieldTexts(duplex,'data-dimension','counterweightRG').length,2);
 const plan=renderReferencePlan(manufacturerModel(fixture));
 assert.match(plan,/viewBox="0 0 1145 869"/);
 assert(plan.includes(duplexReference.markup),'Enlarged plan contains the same native source linework');
 assert.equal(fieldTexts(plan,'data-dimension','shaftW').length,2);
 assert.equal(fieldTexts(plan,'data-dimension','shaftD').length,1);
 const one=renderManufacturerSheets(single)[0];
 assert.doesNotMatch(one,/data-reference="duplex-plan"|data-dimension="bankWidth"/);
 assert.match(renderReferencePlan(manufacturerModel(single)),/viewBox="590 75 450 515"/);
});

test('configurator changes numbers everywhere without moving paths or dimension lines',()=>{
 for(const layout of ['single','duplex']){
  const manufacturer={layout,divider:200,fields:{carRG:'1387',counterweightRG:'947',openingWidth:'1147',openingHeight:'2267'}};
  const before=renderManufacturerSheets({...fixture,manufacturer})[0];
  const after=renderManufacturerSheets({...fixture,shaftW:1937,shaftD:2179,carW:1433,carD:1517,carH:2461,doorW:973,doorH:2131,pit:1523,overhead:3911,capacity:537,speed:1.25,floors:4,floorHeightMode:'individual',floorHeights:[3011,3127,3239],manufacturer})[0];
  assert.equal(fixedGeometry(after),fixedGeometry(before),`${layout}: linework, clipping and transforms are invariant`);
  assertValues(after,'data-dimension',{shaftW:'1937',shaftD:'2179',carW:'1433',carD:'1517',doorW:'973',doorH:'2131',pit:'1523',overhead:'3911',travel:'9377'});
  assertValues(after,'data-field',{capacity:'537',speed:'1.25',doorW:'973',doorH:'2131',pit:'1523',overhead:'3911',travel:'9377',total:'14811'});
  if(layout==='duplex')assertValues(after,'data-dimension',{divider:'200',bankWidth:'4074',carRG:'1387',counterweightRG:'947',openingWidth:'1147'});
  else assertValues(after,'data-dimension',{'manufacturer.fields.carRG':'1387','manufacturer.fields.counterweightRG':'947','manufacturer.fields.openingWidth':'1147'});
 }
});

test('duplex arithmetic uses only supplied dimensions, without locking overhead',()=>{
 const model=manufacturerModel(fixture);assert.equal(model.bankWidth,3400);assert.equal(model.travel,6800);assert.equal(model.totalHeight,12000);
 const next=manufacturerModel({...fixture,shaftW:1900,floors:4,floorHeightMode:'individual',floorHeights:[3000,3100,3200],overhead:3000});
 assert.equal(next.bankWidth,4000);assert.equal(next.travel,9300);assert.equal(next.overhead,3000);assert.equal(next.totalHeight,13800);
 assert.equal(manufacturerModel({...fixture,manufacturer:{layout:'single'}}).bankWidth,1600);
});

test('unknown engineering values are TBC, not copied from the sample sheet or inferred',()=>{
 const config={...fixture,manufacturer:{layout:'duplex'}};
 const model=manufacturerModel(config);assert.equal(model.bankWidth,null);
 assert(FACTORY_FIELDS.every(([key])=>model.manufacturer.fields[key]===''));
 const svg=renderManufacturerSheets(config)[0];
 assertValues(svg,'data-dimension',{bankWidth:'TBC',divider:'TBC',carRG:'TBC',counterweightRG:'TBC',sheave:'TBC',openingWidth:'TBC'});
 assertValues(svg,'data-field',{'manufacturer.fields.motorModel':'TBC','manufacturer.fields.motorPower':'TBC','manufacturer.fields.ratedCurrent':'TBC','manufacturer.fields.supply':'TBC','manufacturer.fields.r1':'TBC','manufacturer.fields.r2':'TBC','manufacturer.fields.r3':'TBC','manufacturer.fields.r4':'TBC'});
 assert.doesNotMatch(textContents(svg).join(' '),/17610|23810|21\.9|380V|SUKHUMVIT|SUNHUMVIT/i,'Sample electrical/project data never becomes live text');
 assert.equal(sanitizeManufacturer({divider:-200}).divider,'');assert.equal(sanitizeManufacturer({divider:3000}).divider,'');
});

test('factory fields are unique optional entries, including reference offsets',()=>{
 assert.equal(new Set(FACTORY_FIELDS.map(([key])=>key)).size,FACTORY_FIELDS.length);
 for(const key of ['motorModel','ratedCurrent','contractNo','productNo','beamSpacing','carRearClearance','glassTotalHeight','rearOffsetLeft'])assert(FACTORY_FIELDS.some(([field])=>field===key),key);
 const source={layout:'single',divider:200,fields:{motorPower:' 4.5 ',ratedCurrent:'12.9',beamSpacing:1575,rearOffsetLeft:'812',unknown:'IGNORE',motorModel:'x'.repeat(300)}};
 const state=sanitizeManufacturer(source);
 assert.equal(state.fields.motorPower,'4.5');assert.equal(state.fields.ratedCurrent,'12.9');assert.equal(state.fields.beamSpacing,'1575');assert.equal(state.fields.rearOffsetLeft,'812');
 assert.equal(state.fields.motorModel.length,240);assert(!Object.hasOwn(state.fields,'unknown'));
 assert.deepEqual(sanitizeManufacturer(JSON.parse(JSON.stringify(state))),state,'Manufacturer link JSON round-trip preserves approved fields');
 assert.equal(manufacturerModel({...fixture,manufacturer:source}).capacity,450,'Factory text cannot replace live configurator dimensions');
});

test('contract/product identifiers are distinct from quotation/configured lift identifiers',()=>{
 const config={...single,liftNo:'CONFIG-LIFT-19',quotationContext:{quoteNo:'QUOTE-21'},manufacturer:{layout:'single',fields:{contractNo:'CONTRACT-73',productNo:'PRODUCT-89'}}};
 const svg=renderManufacturerSheets(config)[0];
 assert.equal(fieldTexts(svg,'data-field','quotationNo').join(''),'CONTRACT-73');
 assert.equal(fieldTexts(svg,'data-field','liftNo').join(''),'PRODUCT-89');
 assert.equal(fieldTexts(svg,'data-field','quotation').join(''),'QUOTE-21');
 assert.equal(fieldTexts(svg,'data-field','configured-lift-number').join(''),'CONFIG-LIFT-19');
 const without=renderManufacturerSheets({...config,manufacturer:{layout:'single'}})[0];
 assert.equal(fieldTexts(without,'data-field','quotationNo').join(''),'TBC');
 assert.equal(fieldTexts(without,'data-field','liftNo').join(''),'TBC');
});

test('project and supplied requirements update on every render with XML-safe text',()=>{
 const config={...fixture,project:'New & <Project>',quotationContext:{quoteNo:'ST.TEST',specifications:[['Requirements','<script>alert(1)</script> & "review"']]},manufacturer:{layout:'duplex',divider:200,fields:{beam:'<image onload="BAD"> & support'}}};
 const snapshot=JSON.stringify(config),svg=renderManufacturerSheets(config)[0];
 assert.match(svg,/New &amp; &lt;Project&gt;/);assert.match(svg,/ST.TEST/);
 assert.match(svg,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.match(svg,/&lt;image onload=&quot;BAD&quot;&gt;/);
 assert.doesNotMatch(svg,/<script\b|<image\b|onload="BAD"/);
 assert(!svg.includes(fixture.project));assert.equal(JSON.stringify(config),snapshot,'Rendering does not mutate caller configuration');
});

test('original floor grid follows each entered rise, top overhead and pit',()=>{
 const svg=renderManufacturerSheets({...single,floors:4,floorHeightMode:'individual',floorHeights:[3011,3127,3239],overhead:3911,pit:1523})[0];
 for(const [floor,value] of [[1,3011],[2,3127],[3,3239],[4,3911]]){
  const row=svg.match(new RegExp(`<g data-floor="${floor}">([\\s\\S]*?)<\\/g>`))?.[1];
  assert(row,`Floor ${floor} remains in the original schedule grid`);assert.match(row,new RegExp(`>${value}<`));
 }
 assert.match(svg,/F4 \/ overhead/);assert.match(svg,/>PIT<\/text><text[^>]*>1523<\/text>/);
 assert.equal(manufacturerModel({...fixture,floorHeightMode:'individual',floorHeights:[3000]}).travel,null);
 assert.equal(manufacturerModel({...fixture,floorHeightMode:'individual',floorHeights:[3000]}).totalHeight,null);
 assertValues(renderManufacturerSheets({...single,floorHeightMode:'individual',floorHeights:[3000]})[0],'data-field',{travel:'TBC',total:'TBC'});
});

test('more than 22 stops preserve all floor values on the same sheet without moving the reference views',()=>{
 const heights=Array.from({length:39},(_,index)=>2801+index*7);
 const config={...single,floors:40,floorHeightMode:'individual',floorHeights:heights,overhead:3937};
 const svg=assertSingleSheet(renderManufacturerSheets(config)),geometry=sheetGeometry(svg);
 assert(geometry.height>1697);assert.equal(geometry.width,2400);assert(geometry.physicalHeight>420);assert.equal(geometry.physicalWidth,594);
 assert(Math.abs(geometry.physicalHeight/geometry.height-geometry.physicalWidth/geometry.width)<0.001,'Extension keeps reference scale');
 const withoutBackground=value=>fixedGeometry(value).replace(/<rect width="2400" height="[^"]+" fill="white"\/>/,'');
 assert.equal(withoutBackground(svg),withoutBackground(renderManufacturerSheets(single)[0]));
 for(let floor=1;floor<=22;floor++)assert.match(svg,new RegExp(`<g data-floor="${floor}">[\\s\\S]*?>${heights[floor-1]}<\\/text><\\/g>`));
 for(let floor=23;floor<40;floor++)assert.match(svg,new RegExp(`F${floor} → F${floor+1}: ${heights[floor-1]} mm`));
 assert.match(svg,/F40 \/ OH: 3937 mm/);
});

test('long project/quotation details survive wrapping and same-sheet continuation',()=>{
 const long='รายละเอียด '.repeat(100)+'LAST REQUIREMENT';
 const svg=assertSingleSheet(renderManufacturerSheets({...fixture,quotationContext:{specifications:[['Long requirement',long]]}}));
 assert(suppliedDetailsText(svg).includes(long.replace(/\s/g,'')),'Complete supplied requirement survives text wrapping and continuation');
 assert.match(svg,/LAST REQUIREMENT/);assert(sheetGeometry(svg).height>1697);
 assert(svg.includes(factoryReference.markup));assert(svg.includes(duplexReference.markup));
});

test('every supplied factory entry remains represented without relying on unwrapped text',()=>{
 const fields=Object.fromEntries(FACTORY_FIELDS.map(([key],index)=>[key,`ENTRY_${index}_${key}`]));
 const svg=assertSingleSheet(renderManufacturerSheets({...fixture,manufacturer:{...fixture.manufacturer,fields},quotationContext:{quoteNo:'ST.SINGLE',specifications:[['Requirement A','FIRST REQUIREMENT'],['Requirement B','LAST REQUIREMENT']]}}));
 const all=joinedText(svg);
 for(const [key,value] of Object.entries(fields))assert(all.includes(value.replace(/\s/g,'')),`${key}: complete supplied value retained`);
 for(const value of ['ST.SINGLE','FIRSTREQUIREMENT','LASTREQUIREMENT'])assert(all.includes(value),value);
});

test('manufacturer excludes decoration choices and removed lifting-hook fields',()=>{
 const config={...fixture,cabinStyle:'SC-C-A',ceilingFinish:'CD-004',floorFinish:'MG-03',hallButtonFinish:'HB-01',copFinish:'COP-01',landingDoorFinish:'SD-006',manufacturer:{...fixture.manufacturer,fields:{hook:'LEGACY-HOOK-RATING-2000',beam:'Factory beam entry'}}};
 const snapshot=JSON.stringify(config),state=sanitizeManufacturer(config.manufacturer),svg=renderManufacturerSheets(config)[0];
 assert(!FACTORY_FIELDS.some(([key,label])=>/hook/i.test(`${key} ${label}`)));assert(!Object.hasOwn(state.fields,'hook'));
 assert.doesNotMatch(svg,/hook|LEGACY-HOOK-RATING-2000/i);assert.match(svg,/Factory beam entry/);
 for(const value of ['cabinStyle','ceilingFinish','floorFinish','hallButtonFinish','copFinish','landingDoorFinish','SC-C-A','CD-004','MG-03','HB-01','COP-01','SD-006'])assert(!svg.includes(value),value);
 assert.equal(JSON.stringify(config),snapshot);
});
