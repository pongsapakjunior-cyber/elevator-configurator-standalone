import {REFERENCE_FACTORY_FIELDS,renderReferenceManufacturer,renderReferencePlan} from './manufacturer-reference-sheet.mjs';
export const FACTORY_FIELDS=Object.freeze([
 ['motorModel','Motor / traction machine'],['motorPower','Motor power (kW)'],['ratedCurrent','Rated current (A)'],['supply','Supply (V / Hz / phases)'],
 ['controller','Controller / drive'],['carRail','Car guide rail'],['counterweightRail','Counterweight guide rail'],['carRG','Car rail gauge (mm)'],['counterweightRG','CWT rail gauge (mm)'],
 ['ropes','Rope count / diameter'],['sheave','Sheave diameter (mm)'],['counterweight','Counterweight / position'],['r1','R1 machine reaction (kN)'],['r2','R2 machine reaction (kN)'],['r3','R3 buffer reaction (kN)'],['r4','R4 buffer reaction (kN)'],
 ['sillGap','Sill / running clearance (mm)'],['opening','Reserved opening W × H (mm)'],['openingWidth','Reserved opening width (mm)'],['openingHeight','Reserved opening height (mm)'],['beam','Beams / brackets / fixing'],
 ...REFERENCE_FACTORY_FIELDS,
]);
const clean=value=>typeof value==='string'||typeof value==='number'?String(value).trim().slice(0,240):'';
const positive=value=>value!==''&&value!=null&&Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;
export const escapeXml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function sanitizeManufacturer(value={}){
 const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{},divider=positive(source.divider);
 return {layout:source.layout==='single'?'single':'duplex',divider:divider&&divider<=2000?divider:'',fields:Object.fromEntries(FACTORY_FIELDS.map(([key])=>[key,clean(source.fields?.[key])]))};
}
export function manufacturerModel(config={}){
 const p=Object.fromEntries(['shaftW','shaftD','carW','carD','carH','doorW','doorH','pit','overhead','capacity','speed','floors','roping','entrances','doorPanels'].map(key=>[key,positive(config[key])]));
 const count=p.floors&&Number.isInteger(p.floors)&&p.floors<=40?p.floors:null;
 const heights=Array.from({length:count?count-1:0},(_,i)=>positive(config.floorHeightMode==='individual'?config.floorHeights?.[i]:config.floorToFloor));
 const travel=heights.length&&heights.every(v=>v!=null)?heights.reduce((a,b)=>a+b,0):null;
 const manufacturer=sanitizeManufacturer(config.manufacturer),duplex=manufacturer.layout==='duplex',context=config.quotationContext||{};
 const known=Array.isArray(context.specifications)?context.specifications.slice(0,100).map(row=>Array.isArray(row)?[clean(row[0]),typeof row[1]==='string'?row[1].trim().slice(0,12000):clean(row[1])]:[]).filter(row=>row.length===2&&row[1]):[];
 return {...p,floors:count,heights,travel,manufacturer,duplex,
  totalHeight:travel!=null&&p.pit!=null&&p.overhead!=null?travel+p.pit+p.overhead:null,
  bankWidth:p.shaftW!=null?duplex?manufacturer.divider?p.shaftW*2+manufacturer.divider:null:p.shaftW:null,
  project:clean(config.project),model:clean(config.modelName),location:clean(config.location),liftNo:clean(config.liftNo),quotation:clean(context.quoteNo),quotationDate:clean(context.quoteDate),known,
  elevatorType:config.elevatorType==='mrl'?'MRL — machine-room-less':config.elevatorType==='mr'?'MR — machine room':'TBC',
  doorType:config.doorType==='side'?'Side-opening':config.doorType==='center'?'Center-opening':'TBC',
 };
}
export function renderManufacturerSheets(config){return [renderReferenceManufacturer(manufacturerModel(config),FACTORY_FIELDS)];}

export function createManufacturerUI(host,onChange){
 let config={},state=sanitizeManufacturer(),sheets=[],valid=false,exporting=false,pdfUrl=null;
 const advanced=new Set(REFERENCE_FACTORY_FIELDS.map(([key])=>key));
 const inputs=fields=>fields.map(([key,label])=>`<label>${escapeXml(label)}<input data-factory="${key}" placeholder="TBC" maxlength="240"></label>`).join('');
 host.innerHTML=`<div class="manufacturer-tools" data-planning-only><div><h1>Manufacturer</h1><p>Reference drawing layout. Dimensions and project details follow current inputs.</p></div><div class="manufacturer-actions"><label>Arrangement<select id="manufacturerLayout"><option value="duplex">Duplex — identical lifts</option><option value="single">Single lift</option></select></label><label>Divider thickness (mm)<input id="manufacturerDivider" type="number" min="1" max="2000" placeholder="Manufacturer to confirm"></label><button type="button" id="manufacturerPdf">Export PDF</button><button type="button" id="manufacturerDownload">Download SVG</button><button type="button" id="manufacturerPlan">Enlarge shaft plan</button><button type="button" id="manufacturerLink">Copy manufacturer link</button></div><details><summary>Factory-provided specifications (optional)</summary><p>Leave unknown values blank for manufacturer design.</p><div class="manufacturer-fields">${inputs(FACTORY_FIELDS.filter(([key])=>!advanced.has(key)))}</div><details><summary>Reference dimension offsets and construction details</summary><div class="manufacturer-fields">${inputs(REFERENCE_FACTORY_FIELDS)}</div></details></details><p id="manufacturerNotice" role="status"></p></div><div id="manufacturerSheets" class="manufacturer-sheets"></div><dialog id="manufacturerPlanDialog" class="manufacturer-plan-dialog"><button type="button" id="manufacturerPlanClose">Close</button><div id="manufacturerPlanDrawing"></div></dialog>`;
 const layout=host.querySelector('#manufacturerLayout'),divider=host.querySelector('#manufacturerDivider'),notice=host.querySelector('#manufacturerNotice'),pdfButton=host.querySelector('#manufacturerPdf'),dialog=host.querySelector('#manufacturerPlanDialog');
 const printStyle=document.createElement('style');host.append(printStyle);
 const clearPdf=()=>{if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;}notice.querySelector('a')?.remove();};
 const render=()=>{clearPdf();const current={...config,manufacturer:state};sheets=renderManufacturerSheets(current);host.querySelector('#manufacturerSheets').innerHTML=`<article class="manufacturer-sheet">${sheets[0]}</article>`;if(dialog.open)host.querySelector('#manufacturerPlanDrawing').innerHTML=renderReferencePlan(manufacturerModel(current));const svg=host.querySelector('#manufacturerSheets svg');printStyle.textContent=`@media print{@page manufacturer{size:${svg.getAttribute('width')} ${svg.getAttribute('height')};margin:0}}`;};
 const enable=value=>{valid=value;pdfButton.disabled=!value||exporting;for(const id of ['manufacturerDownload','manufacturerLink','manufacturerPlan'])host.querySelector('#'+id).disabled=!value;};
 const change=()=>{state=sanitizeManufacturer({layout:layout.value,divider:divider.value,fields:Object.fromEntries([...host.querySelectorAll('[data-factory]')].map(input=>[input.dataset.factory,input.value]))});divider.setCustomValidity(divider.value&&!state.divider?'Enter a positive divider thickness up to 2000 mm':'');render();onChange(state);};
 host.querySelector('.manufacturer-tools').addEventListener('input',event=>{if(event.target.matches('input,select'))change();});
 const filename=()=>`${(config.project||'Schneider-Lift').replace(/[<>:"/\\|?*]/g,'-').slice(0,80)}-manufacturer`;
 host.querySelector('#manufacturerDownload').onclick=()=>{if(!valid||!divider.reportValidity()||!sheets[0])return;const url=URL.createObjectURL(new Blob([sheets[0]],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download=filename()+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notice.textContent='Complete drawing downloaded as one SVG sheet.';};
 pdfButton.onclick=async()=>{if(exporting||!valid||!divider.reportValidity()||!sheets[0])return;clearPdf();exporting=true;enable(valid);notice.textContent='Preparing one-page PDF…';const svg=sheets[0],name=filename();try{const {exportManufacturerPdf}=await import('./manufacturer-pdf.mjs');const result=await exportManufacturerPdf(svg,{filename:name+'.pdf',download:false});if(svg!==sheets[0]||!valid)throw new Error('Configuration changed. Please export the current drawing again.');pdfUrl=URL.createObjectURL(result.blob);notice.textContent='One-page PDF ready. ';const link=document.createElement('a');link.href=pdfUrl;link.download=result.filename;link.textContent='Download PDF';notice.append(link);link.click();}catch(error){notice.textContent='PDF export failed: '+(error?.message||'Please try again.');}finally{exporting=false;enable(valid);}};
 host.querySelector('#manufacturerPlan').onclick=()=>{if(!valid||!divider.reportValidity())return;host.querySelector('#manufacturerPlanDrawing').innerHTML=renderReferencePlan(manufacturerModel({...config,manufacturer:state}));dialog.showModal();};
 host.querySelector('#manufacturerPlanClose').onclick=()=>dialog.close();
 host.querySelector('#manufacturerLink').onclick=async()=>{if(!valid||!divider.reportValidity())return;try{const bytes=new TextEncoder().encode(JSON.stringify({...config,manufacturer:state}));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);const url=new URL(location.pathname,location.origin);url.searchParams.set('c',btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''));url.searchParams.set('page','manufacturer');await navigator.clipboard.writeText(url.href);notice.textContent='Manufacturer link copied with current project, dimensions and factory entries.';}catch{notice.textContent='Copy the current browser address to share this manufacturer view.';}};
 return {update(next,warnings=[]){enable(true);config=next;state=sanitizeManufacturer(next.manufacturer);layout.value=state.layout;if(document.activeElement!==divider)divider.value=state.divider;host.querySelectorAll('[data-factory]').forEach(input=>{if(document.activeElement!==input)input.value=state.fields[input.dataset.factory];});notice.textContent=warnings.length?'Review notes: '+warnings.join(' '):'Reference proportions and dimension lines are fixed. Numbers follow current inputs; unknown factory values are TBC.';render();},invalidate(message){enable(false);clearPdf();sheets=[];notice.textContent=message;host.querySelector('#manufacturerSheets').replaceChildren();if(dialog.open)dialog.close();},get value(){return state;}};
}
