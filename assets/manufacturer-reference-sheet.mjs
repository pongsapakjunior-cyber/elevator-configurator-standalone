import {duplexReference} from './manufacturer-duplex-reference.mjs';
import {factoryReference} from './manufacturer-factory-reference.mjs';

const xml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const plain=value=>value==null||value===''?'TBC':String(value);
const numericKeys=new Set(['shaftW','shaftD','carW','carD','carH','doorW','doorH','capacity','speed','pit','overhead','travel','floors']);
const additionalFields=[
 ['elevatorName','Elevator application / name'],['contractNo','Contract number'],['productNo','Factory product number'],
 ['minimumFloorDistance','Minimum floor distance (mm)'],['lightingPower','Lighting supply / power'],
];
const fieldKeys=new Set(additionalFields.map(([key])=>key));
const humanize=value=>value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
for(const item of factoryReference.labels){
 if(item.field.startsWith('factory.')){const key=item.field.slice(8);if(!fieldKeys.has(key)){fieldKeys.add(key);additionalFields.push([key,humanize(key)+' (mm)']);}}
}
const suppliedCore=new Set(['carRG','counterweightRG','sheave','openingWidth','sillGap']);
for(const item of duplexReference.labels){
 const key=item.field;
 if(!numericKeys.has(key)&&!suppliedCore.has(key)&&!['divider','bankWidth'].includes(key)&&!fieldKeys.has(key)){fieldKeys.add(key);additionalFields.push([key,humanize(key)+' (mm)']);}
}
export const REFERENCE_FACTORY_FIELDS=Object.freeze(additionalFields.map(row=>Object.freeze(row)));

export function referenceValue(m,key){
 if(numericKeys.has(key))return plain(m[key]);
 if(key.startsWith('manufacturer.fields.'))return plain(m.manufacturer.fields[key.slice(20)]);
 if(key.startsWith('factory.'))return plain(m.manufacturer.fields[key.slice(8)]);
 if(key==='modelName')return m.model||m.elevatorType;
 if(key==='elevatorType')return m.elevatorType.startsWith('MRL')?'MRL':m.elevatorType.startsWith('MR ')?'MR':'TBC';
 if(key==='elevatorName')return plain(m.manufacturer.fields.elevatorName);
 if(key==='quotationNo')return plain(m.manufacturer.fields.contractNo);
 if(key==='liftNo')return plain(m.manufacturer.fields.productNo);
 if(key==='total')return plain(m.totalHeight);
 if(key==='roping')return m.roping?`${m.roping}: 1`:'TBC';
 if(key==='floorStopDoor')return m.floors&&m.entrances?`${m.floors} / ${m.floors} / ${m.floors*m.entrances}`:'TBC';
 if(key==='carDimensions')return `W${plain(m.carW)}×D${plain(m.carD)}×H${plain(m.carH)}`;
 if(key==='doorType')return m.doorType==='Center-opening'?'Center Open':m.doorType==='Side-opening'?'Side Open':'TBC';
 if(key==='divider')return plain(m.manufacturer.divider);
 if(key==='bankWidth')return plain(m.bankWidth);
 return plain(m.manufacturer.fields[key]);
}

function text(x,y,value,size=12,anchor='middle',extra=''){
 return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" ${extra}>${xml(value)}</text>`;
}
function binding(m,item){
 const value=referenceValue(m,item.field),shown=Array.from(value).length>20?'SEE DETAILS':value;
 const display=`${item.prefix||(item.field==='sheave'?'Φ':'')}${shown}${item.suffix||''}`;
 const transform=item.rotation?`transform="rotate(${item.rotation} ${item.x} ${item.y})"`:'';
 const available=item.box?(item.rotation?item.box[3]-item.box[1]:item.box[2]-item.box[0]):null;
 const size=available?Math.min(item.size,available/(Array.from(display).length*(/^[\d.]+$/.test(display)?.5:.65))):item.size;
 return text(item.x,item.y,display,size,item.anchor||'middle',`data-dimension="${xml(item.field)}" ${transform}`);
}
const widths={a:.444,b:.5,c:.444,d:.5,e:.444,f:.333,g:.5,h:.5,i:.278,j:.278,k:.5,l:.278,m:.778,n:.5,o:.5,p:.5,q:.5,r:.333,s:.389,t:.278,u:.5,v:.5,w:.722,x:.5,y:.5,z:.444,A:.722,B:.667,C:.667,D:.722,E:.611,F:.556,G:.722,H:.722,I:.333,J:.389,K:.722,L:.611,M:.889,N:.722,O:.722,P:.556,Q:.722,R:.667,S:.556,T:.611,U:.722,V:.722,W:.944,X:.722,Y:.722,Z:.611,' ':.25,'.':.25,',':.25,':':.278,'/':.278,'-':.333,'(':.333,')':.333};
const advance=(char,size)=>/\p{M}/u.test(char)?0:size*(widths[char]??(/\d/.test(char)?.5:.6));
function wrap(value,width,size){
 const out=[];
 for(const part of String(value).split(/\r?\n/)){
  const chars=Array.from(part);if(!chars.length)out.push('');
  while(chars.length){let cut=0,used=0;while(cut<chars.length&&(used+advance(chars[cut],size)<=width||cut===0)){used+=advance(chars[cut],size);cut++;}if(chars.length>cut){const space=chars.slice(0,cut).lastIndexOf(' ');if(space>cut*.5)cut=space+1;}out.push(chars.splice(0,cut).join('').trimEnd());}
 }return out;
}
function cell(x,y,value,width,height,size=12,key=''){
 const rows=wrap(value,width,size),maxRows=Math.max(1,Math.floor((height-3)/(size+1)));
 const lines=rows.length<=maxRows?rows:[...rows.slice(0,maxRows-1),(rows[maxRows-1]||'').slice(0,-1)+'…'];
 const first=y-(lines.length-1)*(size+1)/2;
 return lines.map((part,i)=>text(x,first+i*(size+1),part,size,'middle',`data-field="${xml(key)}"`)).join('');
}
const styles=`text{font-family:'Times New Roman',Times,Tahoma,serif;fill:#161616;stroke:none}path{stroke:none}.ref-note{font-family:Arial,Tahoma,sans-serif}`;

export function renderReferencePlan(m){
 if(m.duplex)return `<svg xmlns="http://www.w3.org/2000/svg" width="1145" height="869" viewBox="0 0 1145 869" role="img" aria-label="Duplex shaft plan from reference"><style>${styles}</style><rect width="1145" height="869" fill="white"/>${duplexReference.markup}${duplexReference.labels.map(item=>binding(m,item)).join('')}</svg>`;
 const [x,y,w,h]=[590,75,450,515];
 const labels=factoryReference.labels.filter(item=>item.x>=x&&item.x<=x+w&&item.y>=y&&item.y<=y+h);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="515" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="Single shaft plan from reference"><style>${styles}</style><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white"/>${factoryReference.markup}${labels.map(item=>binding(m,item)).join('')}</svg>`;
}

export function renderReferenceManufacturer(m,fieldDefinitions){
 const template=factoryReference,scale=1697/template.height,offset=(2400-template.width*scale)/2;
 const hiddenPlan=m.duplex?template.regions.shaftPlan:null;
 let geometry=template.markup,labels=template.labels;
 if(hiddenPlan){
  const p=hiddenPlan,[sx,sy,sw,sh]=duplexReference.regions.plan,s=Math.min(p.width/sw,p.height/sh);
  // Only this original view slot is replaced in Duplex mode. Both linework
  // templates retain their original aspect ratio and every original line.
  geometry+=`<defs><clipPath id="duplex-plan-slot"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}"/></clipPath></defs><rect x="${p.x-2}" y="${p.y-2}" width="${p.width+4}" height="${p.height+4}" fill="white"/><g data-reference="duplex-plan" transform="translate(${p.x} ${p.y}) scale(${s}) translate(${-sx} ${-sy})"><g clip-path="url(#duplex-plan-slot)">${duplexReference.markup}${duplexReference.labels.map(item=>binding(m,item)).join('')}</g></g>`;
  labels=labels.filter(item=>!(item.x>=p.x-2&&item.x<=p.x+p.width+2&&item.y>=p.y-2&&item.y<=p.y+p.height+2));
 }
 let body=geometry+labels.map(item=>binding(m,item)).join('');
 for(const row of template.table.rows){
  body+=cell(template.table.labelX,row.y,row.label,108,row.height,13,'label:'+row.field);
  body+=cell(template.table.valueX,row.y,referenceValue(m,row.field),144,row.height,13,row.field);
 }
 // Original floor grid: 22 reserved floor rows, followed by G and PIT. Floor
 // height is the rise to the next landing; the top row contains known overhead.
 const floor=template.floorTable,bounds=floor.boundaries,extraFloors=[];
 for(let f=1;f<=(m.floors||0);f++){
  const height=f===m.floors?m.overhead:m.heights[f-1];
  if(f>22){extraFloors.push([`F${f}${f<m.floors?' → F'+(f+1):' / OH'}`,plain(height)]);continue;}
  const row=22-f,y=(bounds[row]+bounds[row+1])/2+5;
  body+=`<g data-floor="${f}"><title>${xml(f<m.floors?`F${f} → F${f+1}`:`F${f} / overhead`)}</title>${text(floor.columns[0],y,f,14)}${text(floor.columns[2],y,plain(height),13)}</g>`;
 }
 body+=text(floor.columns[0],(bounds[23]+bounds[24])/2+5,'PIT',13)+text(floor.columns[2],(bounds[23]+bounds[24])/2+5,plain(m.pit),13);
 const project=m.project||'Project not entered',projectBox=template.titleBlock.project;
 body+=cell(projectBox.x,projectBox.y,project,projectBox.width,24,12,'project');
 body+=cell(1438,1181,'FOR MANUFACTURER REVIEW',160,23,10,'review-state');
 body+=cell(1438,1164,m.quotation||'Quotation not linked',160,22,11,'quotation');
 body+=cell(1637,1234,m.liftNo||'TBC',120,24,11,'configured-lift-number');
 // Keep complete supplied requirements in the reference's notes area. Overflow
 // extends this same sheet below the original frame, never shifts its views.
 const entries=[['Project',project],['Quotation',m.quotation||'Not linked'],['Location',m.location||'Not entered'],['Lift no.',m.liftNo||'Not entered']];
 const factoryKey=key=>key.startsWith('factory.')?key.slice(8):key.startsWith('manufacturer.fields.')?key.slice(20):({quotationNo:'contractNo',liftNo:'productNo'})[key]||key;
 const visibleFields=new Set(labels.filter(item=>Array.from(referenceValue(m,item.field)).length<=20).map(item=>factoryKey(item.field)));
 if(m.duplex)for(const item of duplexReference.labels)if(Array.from(referenceValue(m,item.field)).length<=20)visibleFields.add(factoryKey(item.field));
 for(const row of template.table.rows)if(wrap(referenceValue(m,row.field),144,13).length<=Math.max(1,Math.floor((row.height-3)/14)))visibleFields.add(factoryKey(row.field));
 // Do not repeat dimensions/specifications already legible in their original
 // slots. Complete long values and otherwise unmapped requirements stay here.
 for(const [key,label] of fieldDefinitions)if(m.manufacturer.fields[key]&&!visibleFields.has(key))entries.push([label,m.manufacturer.fields[key]]);
 entries.push(...m.known);
 const notes=template.table.technicalNotes,lines=entries.flatMap(([key,value])=>wrap(`${key}: ${value}`,notes.width,11));
 const capacity=Math.floor((notes.height-35)/13),visible=lines.slice(0,capacity),overflow=lines.slice(capacity);
 body+=text(notes.x,notes.y,'SUPPLIED PROJECT / FACTORY DETAILS',11,'start');
 body+=visible.map((value,i)=>text(notes.x,notes.y+20+i*13,value,11,'start')).join('');
 body+=text(996,1226,'FOR MANUFACTURER REVIEW',11,'start')+text(996,1243,'NOT FOR CONSTRUCTION / NTS',11,'start')+text(996,1260,'Factory to confirm all installation details.',10,'start');
 body+=text(1415,1275,m.quotationDate||'Date: __________________',10,'middle');
 let extra='';
 if(extraFloors.length||overflow.length){
  const y=template.height+20;
  extra=text(30,y,'CONTINUED SUPPLIED DETAILS - SAME DRAWING SHEET',14,'start');
  const continuation=[...extraFloors.map(([key,value])=>`${key}: ${value} mm`),...overflow];
  extra+=continuation.map((value,i)=>text(30,y+24+i*15,value,11,'start')).join('');
  const extensionHeight=60+continuation.length*15;
  const height=1697+Math.ceil(extensionHeight*scale),paperHeight=Number((height*594/2400).toFixed(2));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="594mm" height="${paperHeight}mm" viewBox="0 0 2400 ${height}" role="img" aria-label="Manufacturer reference drawing and specifications"><style>${styles}</style><rect width="2400" height="${height}" fill="white"/><g transform="translate(${offset} 0) scale(${scale})">${body}${extra}</g></svg>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="594mm" height="420mm" viewBox="0 0 2400 1697" role="img" aria-label="Manufacturer reference drawing and specifications"><style>${styles}</style><rect width="2400" height="1697" fill="white"/><g transform="translate(${offset} 0) scale(${scale})">${body}</g></svg>`;
}
