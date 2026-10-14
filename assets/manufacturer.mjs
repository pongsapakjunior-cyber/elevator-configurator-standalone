// Review drawings only. No motor sizing, rail selection, loads or installation
// clearances are inferred from capacity or copied from a reference project.
import { detailedPlan, detailedSection, detailedFactoryViews, cadStyles, cadDefs } from './manufacturer-drafting.mjs';
export const FACTORY_FIELDS = Object.freeze([
  ['motorModel', 'Motor / traction machine'], ['motorPower', 'Motor power (kW)'],
  ['ratedCurrent', 'Rated current (A)'], ['supply', 'Supply (V / Hz / phases)'],
  ['controller', 'Controller / drive'], ['carRail', 'Car guide rail'],
  ['counterweightRail', 'Counterweight guide rail'], ['carRG', 'Car rail gauge (mm)'],
  ['counterweightRG', 'CWT rail gauge (mm)'], ['ropes', 'Rope count / diameter'],
  ['sheave', 'Sheave diameter (mm)'], ['counterweight', 'Counterweight / position'],
  ['r1', 'R1 machine reaction (kN)'], ['r2', 'R2 machine reaction (kN)'],
  ['r3', 'R3 buffer reaction (kN)'], ['r4', 'R4 buffer reaction (kN)'],
  ['sillGap', 'Sill / running clearance (mm)'], ['opening', 'Reserved opening W × H (mm)'],
  ['openingWidth', 'Reserved opening width (mm)'], ['openingHeight', 'Reserved opening height (mm)'],
  ['beam', 'Beams / brackets / fixing'],
]);
const clean = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, 240) : '';
const positive = value => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
export const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const fmt = value => value == null ? 'TBC' : Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
export function sanitizeManufacturer(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const divider = positive(source.divider);
  return { layout: source.layout === 'single' ? 'single' : 'duplex', divider: divider && divider <= 2000 ? divider : '',
    fields: Object.fromEntries(FACTORY_FIELDS.map(([key]) => [key, clean(source.fields?.[key])])) };
}
export function manufacturerModel(config = {}) {
  const p = Object.fromEntries(['shaftW','shaftD','carW','carD','carH','doorW','doorH','pit','overhead','capacity','speed','floors','roping','entrances','doorPanels'].map(key => [key, positive(config[key])]));
  const count = p.floors && Number.isInteger(p.floors) && p.floors <= 40 ? p.floors : null;
  const heights = Array.from({length: count ? count - 1 : 0}, (_, i) => positive(config.floorHeightMode === 'individual' ? config.floorHeights?.[i] : config.floorToFloor));
  const travel = heights.length && heights.every(v => v != null) ? heights.reduce((a,b) => a+b,0) : null;
  const manufacturer = sanitizeManufacturer(config.manufacturer);
  const duplex = manufacturer.layout === 'duplex';
  const context = config.quotationContext || {};
  const known = Array.isArray(context.specifications) ? context.specifications.slice(0, 100).map(row => Array.isArray(row) ? [clean(row[0]),typeof row[1] === 'string' ? row[1].trim().slice(0,12000) : clean(row[1])] : []).filter(row => row.length === 2 && row[1]) : [];
  return { ...p, floors: count, heights, travel, manufacturer, duplex,
    totalHeight: travel != null && p.pit != null && p.overhead != null ? travel+p.pit+p.overhead : null,
    bankWidth: p.shaftW != null ? duplex ? manufacturer.divider ? p.shaftW*2+manufacturer.divider : null : p.shaftW : null,
    project: clean(config.project), model: clean(config.modelName), location: clean(config.location), liftNo: clean(config.liftNo),
    quotation: clean(context.quoteNo), quotationDate: clean(context.quoteDate), known,
    elevatorType: config.elevatorType === 'mrl' ? 'MRL — machine-room-less' : config.elevatorType === 'mr' ? 'MR — machine room' : 'TBC',
    doorType: config.doorType === 'side' ? 'Side-opening' : config.doorType === 'center' ? 'Center-opening' : 'TBC',
  };
}
const txt = (x,y,value,size=13,anchor='start',extra='') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" ${extra}>${escapeXml(value)}</text>`;
const line = (x1,y1,x2,y2,cls='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
const rect = (x,y,w,h,cls='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
function tableRows(rows,x,y,width,columns=3,rowHeight=35) {
  let out='';const count=Math.ceil(rows.length/columns), cw=width/columns;
  rows.forEach(([key,value],i)=>{const col=Math.floor(i/count), row=i%count, yy=y+row*rowHeight;
    const display=value||'Manufacturer to confirm', fit=Array.from(display).length*7>cw-16 ? ` textLength="${cw-16}" lengthAdjust="spacingAndGlyphs"` : '';
    out+=rect(x+col*cw,yy,cw,rowHeight,'cell')+txt(x+col*cw+8,yy+12,key,10)+txt(x+col*cw+8,yy+27,display,12,'start',`class="${value?'':'pending'}"${fit}`);
  });return out;
}
function shell(m,body,page,total,title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 1600 1132" role="img" aria-label="${escapeXml(title)}"><style>text{font-family:Arial,Tahoma,sans-serif;fill:#122b27}line,rect{stroke:#263d37;stroke-width:1;fill:none}.wall{fill:#eef2f0;stroke-width:2}.light,.extension{stroke:#81948e;stroke-width:.6}.center{stroke:#899c95;stroke-dasharray:10 4 2 4}.dimension{marker-start:url(#arrow);marker-end:url(#arrow);stroke-width:.8}.dim-label{paint-order:stroke;stroke:white;stroke-width:4;stroke-linejoin:round}.cell{stroke:#bdc8c2;stroke-width:.7}.pending{fill:#8b5b14}</style><defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 10 0 L 0 5 L 10 10 z" fill="#263d37"/></marker></defs><rect width="1600" height="1132" style="fill:white;stroke:none"/>${rect(24,24,1552,1084)}${txt(45,57,m.project||'Project not entered',24)}${txt(45,83,`${m.model||m.elevatorType} • ${m.quotation||'Quotation not linked'} • ${title}`,14)}${txt(1555,52,'SCHNEIDER LIFT',21,'end')}${txt(1555,77,'MANUFACTURER REVIEW',13,'end')}${line(24,100,1576,100)}${body}${line(24,1055,1576,1055)}${txt(44,1078,'FOR MANUFACTURER REVIEW — NOT FOR CONSTRUCTION',15)}${txt(44,1098,'Configured dimensions are requirements, not an engineering approval. All factory values and site dimensions require verification.',11)}${txt(1555,1078,`${page} / ${total}   •   mm   •   NTS   •   A3`,13,'end')}${txt(1555,1098,m.quotationDate||'Unconfirmed / no approval date',11,'end')}</svg>`;
}
export function renderManufacturerSheets(config) {
  const m=manufacturerModel(config);
  const configured=[['PROJECT',m.project||'Not entered'],['MODEL',m.model||m.elevatorType],['CAPACITY',`${fmt(m.capacity)} kg`],['SPEED',`${fmt(m.speed)} m/s`],['CAR W × D × H',`${fmt(m.carW)} × ${fmt(m.carD)} × ${fmt(m.carH)}`],['SHAFT W × D',`${fmt(m.shaftW)} × ${fmt(m.shaftD)}`],['DOOR W × H',`${fmt(m.doorW)} × ${fmt(m.doorH)}`],['DOOR SYSTEM',`${m.doorType} / ${fmt(m.doorPanels)} panels`],['OPENING SIDES',m.entrances===2?'Front + rear':m.entrances===1?'Front':'TBC'],['ROPING',`${fmt(m.roping)} : 1`],['LAYOUT',m.duplex?'Duplex / identical configured lifts':'Single'],['TRAVEL / STOPS',`${fmt(m.travel)} mm / ${fmt(m.floors)}`]];
  const factory=FACTORY_FIELDS.map(([key,label])=>[label,m.manufacturer.fields[key]]);
  const detailRows=[['LOCATION',m.location||'Not entered'],['LIFT NO.',m.liftNo||'Not entered'],...m.known];
  let level=0;
  const floors=m.heights.map((height,i)=>{const prior=level;level=height==null||level==null?null:level+height;return [`F${i+1} → F${i+2}`,`${fmt(height)} mm • level ${fmt(prior)} → ${fmt(level)}`];});
  const pages=[...floors,...detailRows];
  // Long quotation descriptions wrap onto continuation sheets; never crop them.
  const expanded=pages.flatMap(([label,value])=>{
    const chars=Array.from(value), pieces=[];
    while(chars.length){let cut=Math.min(92,chars.length);if(chars.length>cut){const space=chars.slice(0,cut).lastIndexOf(' ');if(space>46)cut=space+1;}pieces.push(chars.splice(0,cut).join(''));}
    return (pieces.length?pieces:['']).map((part,i)=>[i?`${label} (cont.)`:label,part]);
  });
  const chunks=[];for(let i=0;i<expanded.length;i+=22)chunks.push(expanded.slice(i,i+22));
  if(!chunks.length)chunks.push([]);
  const first=detailedPlan(m)+detailedSection(m)+txt(45,822,'CONFIGURED REQUIREMENTS — QUOTATION / CONFIGURATOR',16)+tableRows(configured,45,838,900,2,32);
  const second=detailedFactoryViews(m)+txt(45,830,'FACTORY DESIGN SCHEDULE — SUPPLIED VALUES ONLY; BLANKS REQUIRE MANUFACTURER DESIGN',16)+tableRows(factory,45,846,1510,4,31);
  const total=chunks.length+2;
  return [shell(m,first,1,total,'General arrangement'),shell(m,second,2,total,'Factory construction details'),...chunks.map((rows,i)=>shell(m,txt(45,140,'06 / FLOOR LEVELS & QUOTATION DETAILS',18)+txt(45,167,'Quotation descriptions below are supplied requirements, not certified manufacturer specifications.',13)+tableRows(rows,45,190,1510,1,36)+txt(45,1022,'Manufacturer: __________________  Drawing / revision: __________________  Checked by: __________________  Date: __________',14),i+3,total,'Requirements schedule'))].map(svg=>svg.replace('</style>',cadStyles+'</style>').replace('</defs>',cadDefs+'</defs>'));
}
export function createManufacturerUI(host, onChange) {
  let config={}, state=sanitizeManufacturer(), sheets=[];
  host.innerHTML=`<div class="manufacturer-tools" data-planning-only><div><h1>Manufacturer</h1><p>Live quotation / configurator dimensions. Factory design values remain unconfirmed.</p></div><div class="manufacturer-actions"><label>Arrangement<select id="manufacturerLayout"><option value="duplex">Duplex — identical lifts</option><option value="single">Single lift</option></select></label><label>Divider thickness (mm)<input id="manufacturerDivider" type="number" min="1" max="2000" placeholder="Manufacturer to confirm"></label><button type="button" id="manufacturerDownload">Download drawing SVGs</button><button type="button" id="manufacturerLink">Copy manufacturer link</button></div><details><summary>Factory-provided specifications (optional)</summary><p>Leave unknown values blank. These entries are supplied values, not an approval or automatic calculation.</p><div class="manufacturer-fields">${FACTORY_FIELDS.map(([key,label])=>`<label>${label}<input data-factory="${key}" placeholder="Manufacturer to confirm" maxlength="240"></label>`).join('')}</div></details><p id="manufacturerNotice" role="status"></p></div><div id="manufacturerSheets" class="manufacturer-sheets"></div>`;
  const layout=host.querySelector('#manufacturerLayout'),divider=host.querySelector('#manufacturerDivider'),notice=host.querySelector('#manufacturerNotice');
  const sheetSelect=document.createElement('select');sheetSelect.id='manufacturerSheet';sheetSelect.setAttribute('aria-label','Drawing sheet to download');
  const sheetLabel=document.createElement('label');sheetLabel.textContent='Drawing sheet';sheetLabel.append(sheetSelect);host.querySelector('#manufacturerDownload').before(sheetLabel);host.querySelector('#manufacturerDownload').textContent='Download SVG';
  const render=()=>{sheets=renderManufacturerSheets({...config,manufacturer:state});const selected=sheetSelect.value;sheetSelect.replaceChildren(...sheets.map((_,i)=>new Option(`Sheet ${i+1} — ${i===0?'General arrangement':i===1?'Factory construction details':'Requirements schedule'}`,String(i))));sheetSelect.value=selected!=='' && Number(selected)<sheets.length?selected:'0';host.querySelector('#manufacturerSheets').innerHTML=sheets.map(svg=>`<article class="manufacturer-sheet">${svg}</article>`).join('');};
  const change=()=>{state=sanitizeManufacturer({layout:layout.value,divider:divider.value,fields:Object.fromEntries([...host.querySelectorAll('[data-factory]')].map(input=>[input.dataset.factory,input.value]))});divider.setCustomValidity(divider.value && !state.divider?'Enter a positive divider thickness up to 2000 mm':'');render();onChange(state);};
  host.querySelector('.manufacturer-tools').addEventListener('input',event=>{if(event.target.matches('input,select') && event.target!==sheetSelect)change();});
  host.querySelector('#manufacturerDownload').onclick=()=>{if(!divider.reportValidity())return;const base=(config.project||'Schneider-Lift').replace(/[<>:"/\\|?*]/g,'-').slice(0,80),i=Number(sheetSelect.value)||0,svg=sheets[i];if(!svg)return;const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download=`${base}-manufacturer-${i+1}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notice.textContent=`Drawing sheet ${i+1} downloaded. Factory review required.`;};
  host.querySelector('#manufacturerLink').onclick=async()=>{if(!divider.reportValidity())return;try{const bytes=new TextEncoder().encode(JSON.stringify({...config,manufacturer:state}));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);const url=new URL(location.pathname,location.origin);url.searchParams.set('c',btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''));url.searchParams.set('page','manufacturer');await navigator.clipboard.writeText(url.href);notice.textContent='Manufacturer link copied with current project, dimensions and factory entries.';}catch{notice.textContent='Copy the current browser address to share this manufacturer view.';}};
  const enable=value=>{host.querySelector('#manufacturerDownload').disabled=!value;host.querySelector('#manufacturerLink').disabled=!value;};
  return { update(next, warnings=[]) {enable(true);config=next;state=sanitizeManufacturer(next.manufacturer);layout.value=state.layout;if(document.activeElement!==divider)divider.value=state.divider;host.querySelectorAll('[data-factory]').forEach(input=>{if(document.activeElement!==input)input.value=state.fields[input.dataset.factory];});notice.textContent=warnings.length?'Review notes — these drawings retain the entered requirements: '+warnings.join(' '):'Dimensions follow current input. Motor power, current, rail gauges and reactions are not inferred.';render();}, invalidate(message){enable(false);notice.textContent=message;host.querySelector('#manufacturerSheets').replaceChildren();}, get value(){return state;} };
}
