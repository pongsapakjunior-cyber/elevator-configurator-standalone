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
// Wrap text at a conservative glyph width; never squeeze or discard long specs.
function wrapText(value,width,size=14) {
  const limit=Math.max(1,Math.floor(width/(size*.68))),lines=[];
  for(const paragraph of String(value).split(/\r?\n/)){
    const chars=Array.from(paragraph);if(!chars.length)lines.push('');
    while(chars.length){let cut=Math.min(limit,chars.length);if(chars.length>cut){const space=chars.slice(0,cut).lastIndexOf(' ');if(space>limit*.5)cut=space+1;}lines.push(chars.splice(0,cut).join('').trimEnd());}
  }return lines;
}
function schedule(rows,title,x,y,width) {
  let out=txt(x,y,title,17),cursor=y+15;const keyWidth=240;
  for(const [key,value] of rows){
    const keys=wrapText(key,keyWidth-20,13),values=wrapText(value||'Manufacturer to confirm',width-keyWidth-20,13);
    const h=Math.max(30,Math.max(keys.length,values.length)*17+13);
    out+=rect(x,cursor,width,h,'cell')+line(x+keyWidth,cursor,x+keyWidth,cursor+h,'cell');
    keys.forEach((part,i)=>{out+=txt(x+10,cursor+21+i*17,part,13);});
    values.forEach((part,i)=>{out+=txt(x+keyWidth+10,cursor+21+i*17,part,13,'start',`class="${value?'':'pending'}"`);});
    cursor+=h;
  }return {markup:out,endY:cursor};
}
function view(fragment,x,y,width,height,source) {
  const [sx,sy,sw,sh]=source,scale=Math.min(width/sw,height/sh);
  return `<g transform="translate(${x} ${y}) scale(${scale}) translate(${-sx} ${-sy})">${fragment}</g>`;
}
function shell(m,body,height,header) {
  const paperHeight=height===1697?420:Number((height*594/2400).toFixed(2)),foot=height-80;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="594mm" height="${paperHeight}mm" viewBox="0 0 2400 ${height}" role="img" aria-label="Manufacturer complete drawing and specifications"><style>text{font-family:Arial,Tahoma,sans-serif;fill:#122b27}line,rect{stroke:#263d37;stroke-width:1;fill:none}.dimension{marker-start:url(#arrow);marker-end:url(#arrow);stroke-width:.8}.dim-label{paint-order:stroke;stroke:white;stroke-width:4;stroke-linejoin:round}${cadStyles}</style><defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 10 0 L 0 5 L 10 10 z" fill="#263d37"/></marker>${cadDefs}</defs><rect width="2400" height="${height}" style="fill:white;stroke:none"/>${rect(24,24,2352,height-48)}${header}${body}${line(24,foot,2376,foot)}${txt(44,foot+28,'FOR MANUFACTURER REVIEW — NOT FOR CONSTRUCTION',17)}${txt(44,foot+49,'Configured requirements only. Factory values, locations, loads and site dimensions require manufacturer verification.',13)}${txt(2355,foot+28,`1 / 1   •   mm   •   NTS   •   ${height===1697?'A2':'594 × '+paperHeight+' mm'}`,15,'end')}${txt(2355,foot+49,m.quotationDate||'Unconfirmed / no approval date',13,'end')}</svg>`;
}
export function renderManufacturerSheets(config) {
  const m=manufacturerModel(config);
  const configured=[['PROJECT',m.project||'Not entered'],['MODEL',m.model||m.elevatorType],['CAPACITY',`${fmt(m.capacity)} kg`],['SPEED',`${fmt(m.speed)} m/s`],['CAR W × D × H',`${fmt(m.carW)} × ${fmt(m.carD)} × ${fmt(m.carH)}`],['SHAFT W × D',`${fmt(m.shaftW)} × ${fmt(m.shaftD)}`],['DOOR W × H',`${fmt(m.doorW)} × ${fmt(m.doorH)}`],['DOOR SYSTEM',`${m.doorType} / ${fmt(m.doorPanels)} panels`],['OPENING SIDES',m.entrances===2?'Front + rear':m.entrances===1?'Front':'TBC'],['ROPING',`${fmt(m.roping)} : 1`],['LAYOUT',m.duplex?'Duplex / identical configured lifts':'Single'],['TRAVEL / STOPS',`${fmt(m.travel)} mm / ${fmt(m.floors)}`]];
  const factory=FACTORY_FIELDS.map(([key,label])=>[label,m.manufacturer.fields[key]]);
  const detailRows=[['LOCATION',m.location||'Not entered'],['LIFT NO.',m.liftNo||'Not entered'],...m.known];
  let level=0;
  const floors=m.heights.map((height,i)=>{const prior=level;level=height==null||level==null?null:level+height;return [`F${i+1} → F${i+2}`,`${fmt(height)} mm • level ${fmt(prior)} → ${fmt(level)}`];});
  const projectLines=wrapText(m.project||'Project not entered',1700,26);
  const subtitleLines=wrapText(`${m.model||m.elevatorType} • ${m.quotation||'Quotation not linked'} • Complete drawing and specifications`,1900,15);
  const headerBottom=45+projectLines.length*31+subtitleLines.length*21+14,shift=headerBottom-111;
  const header=projectLines.map((part,i)=>txt(44,60+i*31,part,26)).join('')+subtitleLines.map((part,i)=>txt(44,45+projectLines.length*31+i*21+15,part,15)).join('')+txt(2355,58,'SCHNEIDER LIFT',24,'end')+txt(2355,83,'MANUFACTURER REVIEW',14,'end')+line(24,headerBottom,2376,headerBottom);
  const configuredTable=schedule(configured,'CONFIGURED REQUIREMENTS',1740,145+shift,624);
  const factoryTable=schedule(factory,'FACTORY DESIGN SCHEDULE',1740,configuredTable.endY+35,624);
  const requirements=schedule([...floors,...detailRows],'FLOOR LEVELS & QUOTATION DETAILS',1740,factoryTable.endY+35,624);
  const height=Math.ceil(Math.max(1697+shift,requirements.endY+130));
  const drawings=view(detailedPlan(m),38,145+shift,1125,670,[0,110,980,700])+view(detailedSection(m),1168,145+shift,520,760,[975,110,570,930])+view(detailedFactoryViews(m),38,890+shift,1664,708,[20,110,1540,710]);
  const body=drawings+line(1715,headerBottom,1715,height-80,'cell')+configuredTable.markup+factoryTable.markup+requirements.markup+txt(1740,requirements.endY+28,'Manufacturer / revision: ______________________________',13);
  return [shell(m,body,height,header)];
}
export function createManufacturerUI(host, onChange) {
  let config={}, state=sanitizeManufacturer(), sheets=[],valid=false,exporting=false,pdfUrl=null;
  host.innerHTML=`<div class="manufacturer-tools" data-planning-only><div><h1>Manufacturer</h1><p>Live quotation / configurator dimensions. Factory design values remain unconfirmed.</p></div><div class="manufacturer-actions"><label>Arrangement<select id="manufacturerLayout"><option value="duplex">Duplex — identical lifts</option><option value="single">Single lift</option></select></label><label>Divider thickness (mm)<input id="manufacturerDivider" type="number" min="1" max="2000" placeholder="Manufacturer to confirm"></label><button type="button" id="manufacturerDownload">Download drawing SVGs</button><button type="button" id="manufacturerLink">Copy manufacturer link</button></div><details><summary>Factory-provided specifications (optional)</summary><p>Leave unknown values blank. These entries are supplied values, not an approval or automatic calculation.</p><div class="manufacturer-fields">${FACTORY_FIELDS.map(([key,label])=>`<label>${label}<input data-factory="${key}" placeholder="Manufacturer to confirm" maxlength="240"></label>`).join('')}</div></details><p id="manufacturerNotice" role="status"></p></div><div id="manufacturerSheets" class="manufacturer-sheets"></div>`;
  const layout=host.querySelector('#manufacturerLayout'),divider=host.querySelector('#manufacturerDivider'),notice=host.querySelector('#manufacturerNotice');
  const pdfButton=document.createElement('button');pdfButton.id='manufacturerPdf';pdfButton.type='button';pdfButton.textContent='Export PDF';host.querySelector('#manufacturerDownload').before(pdfButton);host.querySelector('#manufacturerDownload').textContent='Download SVG';
  const printStyle=document.createElement('style');host.append(printStyle);
  const clearPdf=()=>{if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;}notice.querySelector('a')?.remove();};
  const render=()=>{clearPdf();sheets=renderManufacturerSheets({...config,manufacturer:state});host.querySelector('#manufacturerSheets').innerHTML=`<article class="manufacturer-sheet">${sheets[0]}</article>`;const svg=host.querySelector('#manufacturerSheets svg');printStyle.textContent=`@media print{@page manufacturer{size:${svg.getAttribute('width')} ${svg.getAttribute('height')};margin:0}}`;};
  const change=()=>{state=sanitizeManufacturer({layout:layout.value,divider:divider.value,fields:Object.fromEntries([...host.querySelectorAll('[data-factory]')].map(input=>[input.dataset.factory,input.value]))});divider.setCustomValidity(divider.value && !state.divider?'Enter a positive divider thickness up to 2000 mm':'');render();onChange(state);};
  host.querySelector('.manufacturer-tools').addEventListener('input',event=>{if(event.target.matches('input,select'))change();});
  const filename=()=>`${(config.project||'Schneider-Lift').replace(/[<>:"/\\|?*]/g,'-').slice(0,80)}-manufacturer`;
  host.querySelector('#manufacturerDownload').onclick=()=>{if(!valid||!divider.reportValidity())return;const svg=sheets[0];if(!svg)return;const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download=`${filename()}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notice.textContent='Complete drawing downloaded as one SVG sheet. Factory review required.';};
  pdfButton.onclick=async()=>{if(exporting||!valid||!divider.reportValidity()||!sheets[0])return;clearPdf();exporting=true;enable(valid);notice.textContent='Preparing one-page PDF at print resolution…';const svg=sheets[0],name=filename();try{const {exportManufacturerPdf}=await import('./manufacturer-pdf.mjs');const result=await exportManufacturerPdf(svg,{filename:`${name}.pdf`,download:false});if(svg!==sheets[0]||!valid)throw new Error('Configuration changed. Please export the current drawing again.');pdfUrl=URL.createObjectURL(result.blob);notice.textContent='One-page PDF ready. Factory review required. ';const link=document.createElement('a');link.href=pdfUrl;link.download=result.filename;link.textContent='Download PDF';notice.append(link);link.click();}catch(error){notice.textContent='PDF export failed: '+(error?.message||'Please try again.');}finally{exporting=false;enable(valid);}};
  host.querySelector('#manufacturerLink').onclick=async()=>{if(!divider.reportValidity())return;try{const bytes=new TextEncoder().encode(JSON.stringify({...config,manufacturer:state}));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);const url=new URL(location.pathname,location.origin);url.searchParams.set('c',btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''));url.searchParams.set('page','manufacturer');await navigator.clipboard.writeText(url.href);notice.textContent='Manufacturer link copied with current project, dimensions and factory entries.';}catch{notice.textContent='Copy the current browser address to share this manufacturer view.';}};
  const enable=value=>{valid=value;pdfButton.disabled=!value||exporting;host.querySelector('#manufacturerDownload').disabled=!value;host.querySelector('#manufacturerLink').disabled=!value;};
  return { update(next, warnings=[]) {enable(true);config=next;state=sanitizeManufacturer(next.manufacturer);layout.value=state.layout;if(document.activeElement!==divider)divider.value=state.divider;host.querySelectorAll('[data-factory]').forEach(input=>{if(document.activeElement!==input)input.value=state.fields[input.dataset.factory];});notice.textContent=warnings.length?'Review notes — these drawings retain the entered requirements: '+warnings.join(' '):'One sheet contains every drawing and specification. A2 landscape; extensive requirements enlarge the same sheet. Factory ratings are not inferred.';render();}, invalidate(message){enable(false);clearPdf();sheets=[];notice.textContent=message;host.querySelector('#manufacturerSheets').replaceChildren();}, get value(){return state;} };
}
