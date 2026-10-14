// Factory-review vector drawings. Geometry is illustrative/NTS; dimension text
// comes only from the configuration or explicitly supplied factory fields.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const fmt=v=>v==null||v===''?'TBC':typeof v==='number'?v.toLocaleString('en-US',{maximumFractionDigits:2}):String(v);
const field=(m,k)=>m.manufacturer.fields[k]||'TBC';
const num=v=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):null;
const text=(x,y,s,size=12,anchor='start',cls='')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" class="${cls}">${esc(s)}</text>`;
const line=(x,y,X,Y,cls='')=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" class="${cls}"/>`;
const rect=(x,y,w,h,cls='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
const path=(d,cls='')=>`<path d="${d}" class="${cls}"/>`;
const circle=(x,y,r,cls='')=>`<circle cx="${x}" cy="${y}" r="${r}" class="${cls}"/>`;
const polygon=(pts,cls='')=>`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" class="${cls}"/>`;
const horizontal=(x1,x2,y,from,label,size=12)=>line(x1,from,x1,y+7,'extension')+line(x2,from,x2,y+7,'extension')+line(x1,y,x2,y,'dimension')+text((x1+x2)/2,y-7,label,size,'middle','dim-label');
const vertical=(y1,y2,x,from,label,size=12)=>line(from,y1,x-7,y1,'extension')+line(from,y2,x-7,y2,'extension')+line(x,y1,x,y2,'dimension')+`<text transform="translate(${x-7} ${(y1+y2)/2}) rotate(-90)" font-size="${size}" text-anchor="middle" class="dim-label">${esc(label)}</text>`;
const leader=(x,y,X,Y,label,side=1)=>circle(x,y,2.3)+line(x,y,X,Y)+line(X,Y,X+side*12,Y)+text(X+side*16,Y+4,label,11,side===1?'start':'end');
const title=(x,y,number,label)=>text(x,y,`${number}  ${label}`,18,'start','cad-title');
const bolt=(x,y,r=2.5)=>circle(x,y,r)+line(x-r-1,y,x+r+1,y,'cad-fine')+line(x,y-r-1,x,y+r+1,'cad-fine');
const bolts=(x,y,w,h)=>bolt(x,y)+bolt(x+w,y)+bolt(x,y+h)+bolt(x+w,y+h);
const channel=(x,y,w,h)=>rect(x,y,w,h,'cad-heavy')+line(x+3,y+3,x+w-3,y+3,'cad-fine')+line(x+3,y+h-3,x+w-3,y+h-3,'cad-fine');
const guide=(x,y,side=1)=>`<g transform="translate(${x} ${y}) scale(${side} 1)">${rect(-15,-23,7,46,'cad-section')}${path('M-8 -19h13v13h9v12H5v13H-8','cad-heavy')}${rect(-3,-11,11,22)}${rect(8,-3,10,6,'cad-section')}${bolts(-12,-17,0,34)}${line(-20,0,25,0,'cad-center')}</g>`;
function springBuffer(x,y,h=58){
 let s=channel(x-20,y+h,40,5)+rect(x-7,y+8,14,h-8)+rect(x-18,y,36,6,'cad-heavy')+rect(x-11,y-4,22,4);
 for(let i=0;i<7;i++)s+=path(`M${x-12} ${y+10+i*(h-13)/7}l24 4l-24 3`,'cad-fine');
 s+=bolts(x-15,y+h+3,30,0)+line(x,y-15,x,y+h+15,'cad-center');return s;
}
function machine(x,y,scale=1){
 let s=circle(0,0,24,'cad-heavy')+circle(0,0,20)+circle(0,0,16,'cad-fine')+circle(0,0,5,'cad-section');
 for(const a of [0,60,120]){const r=a*Math.PI/180;s+=line(Math.cos(r)*7,Math.sin(r)*7,Math.cos(r)*17,Math.sin(r)*17)+line(-Math.cos(r)*7,-Math.sin(r)*7,-Math.cos(r)*17,-Math.sin(r)*17);}
 s+=rect(20,-19,47,38,'cad-heavy')+rect(67,-14,9,28)+rect(26,-25,17,6)+rect(29,-29,11,4);
 for(let i=0;i<8;i++)s+=line(24+i*5,-16,24+i*5,16,'cad-fine');
 s+=rect(-24,25,101,8,'cad-heavy')+path('M-16 24l5 -10h8l5 10M48 24l5 -7h8l5 7')+bolts(-16,29,82,0);
 return `<g transform="translate(${x} ${y}) scale(${scale})">${s}</g>`;
}
export const cadStyles=`.cad-title{font-family:Georgia,'Times New Roman',serif;fill:#111}text{fill:#161616}line,rect,path,circle,polygon{stroke:#171717;stroke-width:.85;fill:none}.cad-heavy{stroke-width:1.65}.cad-fine{stroke:#444;stroke-width:.55}.cad-wall{fill:url(#concrete);stroke-width:1.4}.cad-section{fill:#181818;stroke-width:.7}.cad-white{fill:#fff}.cad-hidden{stroke:#666;stroke-width:.7;stroke-dasharray:5 3}.cad-center{stroke:#555;stroke-width:.65;stroke-dasharray:17 4 3 4}.extension{stroke:#666;stroke-width:.55}.dimension{stroke:#333;stroke-width:.7}.dim-label{paint-order:stroke;stroke:white;stroke-width:3}.cell{stroke:#777;stroke-width:.65}.pending{fill:#7b592d}`;
export const cadDefs=`<pattern id="concrete" width="13" height="13" patternUnits="userSpaceOnUse"><rect width="13" height="13" style="fill:#fff;stroke:none"/><path d="M0 11L11 0M9 13L13 9" style="stroke:#aaa;stroke-width:.45"/><path d="M2 5l2 1l-1 2zM9 10l2 -1" style="stroke:#888;stroke-width:.4"/></pattern>`;

export function detailedPlan(m){
 let s=title(50,133,'01',`${m.duplex?'DUPLEX':'SINGLE'} SHAFT PLAN LAYOUT`)+text(50,153,'Dimensions in mm. Rear counterweight arrangement is a reference, subject to factory design.',11);
 const count=m.duplex?2:1,divider=num(m.manufacturer.divider),gap=m.duplex?30:0;
 const scale=Math.min((790-gap)/(count*(m.shaftW||2500)),330/(m.shaftD||2100));
 const sw=(m.shaftW||2500)*scale,sd=(m.shaftD||2100)*scale,x0=100+(790-count*sw-gap)/2,y=278;
 for(let i=0;i<count;i++){
  const x=x0+i*(sw+gap),mid=x+sw/2,cw=(m.carW||1800)*scale,cd=(m.carD||1500)*scale,cx=mid-cw/2,cy=y+sd-cd-27;
  const dw=(m.doorW||1100)*scale,dx=mid-dw/2,railY=cy+cd*.54,carGauge=num(m.manufacturer.fields.carRG),cwGauge=num(m.manufacturer.fields.counterweightRG);
  const cg=cwGauge?cwGauge*scale:sw*.55,cwtY=y+27,cwtX=mid-cg/2;
  s+=rect(x-12,y-12,sw+24,sd+24,'cad-wall')+rect(x,y,sw,sd,'cad-white');
  // Outer civil returns and lintel/sill pocket; no unlabeled numeric clearance.
  s+=rect(dx-20,y+sd-1,dw+40,14,'cad-white')+path(`M${x-12} ${y+sd+12}v25h${dx-x-8}v-25M${dx+dw+20} ${y+sd+12}v25h${x+sw-dx-dw-8}v-25`,'cad-heavy');
  s+=text(mid,194,`${m.liftNo||'LIFT'}${count===2?' '+(i+1):''}`,13,'middle');
  // Counterweight frame, cross-head, fill plates, rail shoes and reaction point.
  s+=rect(cwtX+8,cwtY-14,cg-16,28,'cad-heavy')+rect(cwtX+14,cwtY-9,cg-28,18)+rect(mid-27,cwtY-19,54,38);
  for(const yy of [-6,0,6])s+=line(cwtX+16,cwtY+yy,cwtX+cg-16,cwtY+yy,'cad-fine');
  s+=guide(cwtX-9,cwtY)+guide(cwtX+cg+9,cwtY,-1)+bolts(cwtX+18,cwtY-10,cg-36,20);
  s+=line(x-22,cwtY,x+sw+22,cwtY,'cad-center')+line(mid,y-76,mid,y+sd+47,'cad-center');
  s+=leader(mid,cwtY,mid+34,cwtY-37,'R4');
  s+=horizontal(cwtX-9,cwtX+cg+9,230,cwtY,`CWT RG ${field(m,'counterweightRG')}`,12);
  // Cabin wall skins, sling channels, buffer/rope center and actual guide symbols.
  s+=rect(cx-6,cy-6,cw+12,cd+12,'cad-heavy')+rect(cx,cy,cw,cd)+rect(cx+4,cy+4,cw-8,cd-8,'cad-fine');
  const gl=carGauge?mid-carGauge*scale/2:cx-25,gr=carGauge?mid+carGauge*scale/2:cx+cw+25;
  s+=guide(gl,railY)+guide(gr,railY,-1)+line(x-32,railY,x+sw+32,railY,'cad-center');
  s+=rect(mid-36,railY-31,49,62)+rect(mid-28,railY-24,30,48)+circle(mid,railY,6)+leader(mid,railY,mid+29,railY-36,'R3');
  s+=horizontal(cx,cx+cw,cy+35,cy,`03 Car N/Width ${fmt(m.carW)}`,12);
  s+=vertical(cy,cy+cd,cx+cw-18,cx+cw,`04 Car N/Depth ${fmt(m.carD)}`,11);
  s+=horizontal(gl,gr,railY+49,railY,`Car RG ${field(m,'carRG')}`,12);
  // Door hanger rail, landing/car sills, rollers, panel shoes and opening arrows.
  const sy=y+sd-19,panels=Math.max(1,Math.min(4,m.doorPanels||2));
  s+=channel(cx-18,sy,cw+36,8)+channel(cx-18,sy+14,cw+36,8)+rect(dx-4,sy+8,dw+8,6,'cad-white');
  for(let j=0;j<panels;j++){
   const px=dx+j*dw/panels,pw=dw/panels;
   s+=rect(px,sy-12,pw,10)+line(px+2,sy-9,px+pw-2,sy-9,'cad-fine')+circle(px+pw*.25,sy-3,2)+circle(px+pw*.75,sy-3,2);
  }
  const dir=m.doorType==='Side-opening'?1:0;
  s+=line(mid-7,sy-21,mid-dw*.36,sy-21)+path(`M${mid-dw*.36+5} ${sy-24}l-5 3l5 3`);
  if(!dir)s+=line(mid+7,sy-21,mid+dw*.36,sy-21)+path(`M${mid+dw*.36-5} ${sy-24}l5 3l-5 3`);
  if(m.entrances===2)s+=rect(dx,y-3,dw,6,'cad-white')+text(mid,y+11,'REAR OPENING — factory to relocate CWT',8,'middle');
  s+=horizontal(dx,dx+dw,y+sd+59,y+sd,`05 N/D.Open ${fmt(m.doorW)}`,12);
  s+=horizontal(dx-20,dx+dw+20,y+sd+91,y+sd+37,`Reserved Ent. ${field(m,'openingWidth')}`,11);
  s+=horizontal(x,x+sw,y+sd+124,y+sd,`01 Shaft Width ${fmt(m.shaftW)}`,13);
  if(!i)s+=vertical(y,y+sd,x-39,x,`02 Shaft Depth ${fmt(m.shaftD)}`,13)+vertical(sy+8,sy+14,x-72,x,`Sill gap ${field(m,'sillGap')}`,10);
 }
 if(m.duplex)s+=horizontal(x0,x0+sw*2+gap,y+sd+165,y+sd,`07 Overall ${m.bankWidth==null?'2 × '+fmt(m.shaftW)+' + divider TBC':fmt(m.bankWidth)}`,14)+text(x0+sw+gap/2,y+sd+145,`06 ${fmt(divider)}`,11,'middle');
 return s+text(475,793,'Rails / reaction points / clearances and structural separation: manufacturer to confirm.',11,'middle');
}

export function detailedSection(m){
 let s=title(990,133,'02','HOISTWAY SECTION')+text(990,153,'Longitudinal section · interrupted travel · NTS',11);
 const x=1172,w=178,roof=234,top=502,low=790,bottom=932,mr=m.elevatorType.startsWith('MR —');
 const carTop=335,carBase=top-10,cx=x+31,cw=114,cwtX=x+w-23;
 s+=rect(x-12,roof-12,w+24,bottom-roof+24,'cad-wall')+rect(x,roof,w,bottom-roof,'cad-white');
 // Continuous car/CWT rails with splice plates and rail bracket anchor bolts.
 s+=rect(x+15,roof+15,3,bottom-roof-20)+rect(x+w-15,roof+15,3,bottom-roof-20);
 for(const yy of [285,460,590,735,885]){
  s+=path(`M${x-9} ${yy-7}h19v14h-19M${x+w+9} ${yy-7}h-19v14h19`)+bolts(x-6,yy-4,0,8)+bolts(x+w+6,yy-4,0,8);
  s+=rect(x+12,yy-18,9,36,'cad-fine')+bolts(x+16,yy-12,0,24);
 }
 s+=line(x+w/2,roof-35,x+w/2,bottom+18,'cad-center');
 // Traction machine and support beams. No motor rating or support span inferred.
 const mx=mr?x+64:x+122,my=mr?roof-45:roof+43;
 if(mr)s+=path(`M${x-12} ${roof-12}v-48h${w+24}v48`,'cad-hidden')+text(x+w/2,173,'MACHINE ROOM · dimensions by factory',10,'middle');
 s+=machine(mx,my,.65)+channel(x+10,my+23,w-20,8)+bolts(x+20,my+27,w-40,0);
 s+=leader(mx+44,my,x+w+30,my-7,'Traction machine');
 // Multi-line rope paths, hitch points and 2:1 diverter sheaves where selected.
 for(let j=0;j<4;j++){
  const ropeX=mx-13+j*2.3;
  s+=line(ropeX,my+8,ropeX,carTop-23,'cad-fine');
  s+=path(`M${mx+13+j*2.3} ${my+8}H${cwtX+j*1.8}V758`,'cad-fine');
 }
 if(m.roping===2){
  for(const px of [cx+22,cx+cw-22])s+=circle(px,carBase+16,12,'cad-heavy')+circle(px,carBase+16,9,'cad-fine')+bolt(px,carBase+16);
  s+=line(cx+22,carBase+28,cx+cw-22,carBase+28,'cad-heavy')+line(cx+10,roof+13,cx+10,carBase+16)+line(cx+cw-10,roof+13,cx+cw-10,carBase+16);
 }else s+=rect(mx-18,carTop-23,40,6)+path(`M${mx-11} ${carTop-23}v12M${mx-5} ${carTop-23}v12M${mx+1} ${carTop-23}v12M${mx+7} ${carTop-23}v12`);
 // Car sling, channel uprights, cross-head, safeties and detailed guide shoes.
 s+=channel(cx-9,carTop-14,cw+18,9)+channel(cx-9,carBase+9,cw+18,11);
 s+=channel(cx-4,carTop-5,5,carBase-carTop+14)+channel(cx+cw-1,carTop-5,5,carBase-carTop+14);
 s+=rect(cx+6,carTop+2,cw-12,carBase-carTop-4,'cad-heavy')+rect(cx+10,carTop+6,cw-20,carBase-carTop-12,'cad-fine');
 s+=line(cx,carTop+5,cx+cw,carBase-4)+line(cx+cw,carTop+5,cx,carBase-4);
 for(const yy of [carTop+12,carBase-24])s+=rect(cx-12,yy,12,20)+rect(cx+cw,yy,12,20)+bolts(cx-9,yy+4,0,12)+bolts(cx+cw+9,yy+4,0,12);
 s+=bolts(cx+4,carTop-10,cw-8,0)+bolts(cx+4,carBase+15,cw-8,0)+rect(cx+16,carBase+20,cw-32,6,'cad-heavy');
 // Landing frames, door panel cross-sections and civil sill supports.
 for(const yy of [top,low]){
  s+=rect(x-20,yy-142,21,142)+rect(x-15,yy-136,7,132)+rect(x-7,yy-137,4,134,'cad-fine');
  s+=channel(x-25,yy-5,58,8)+rect(x-31,yy+3,38,14,'cad-wall')+path(`M${x+8} ${yy+3}l16 17h-30`);
  s+=rect(x-23,yy-146,30,5)+circle(x-11,yy-140,3)+line(x-56,yy,x+35,yy,'cad-center');
 }
 // Counterweight is opposite the car, near the lower landing in this reference.
 s+=rect(cwtX-11,758,22,101,'cad-heavy')+rect(cwtX-7,765,14,86)+rect(cwtX-14,756,28,6)+rect(cwtX-14,858,28,6);
 for(let i=0;i<11;i++)s+=line(cwtX-7,768+i*7,cwtX+7,768+i*7,'cad-fine');
 s+=rect(cwtX-15,766,4,13)+rect(cwtX+11,766,4,13)+rect(cwtX-15,840,4,13)+rect(cwtX+11,840,4,13);
 // Car and counterweight buffers with anchors, ladder, pit light and stop switch.
 s+=springBuffer(x+88,bottom-68,58)+springBuffer(cwtX,bottom-49,39);
 s+=rect(x+3,low+7,3,bottom-low-15)+rect(x+21,low+7,3,bottom-low-15);
 for(let i=0;i<12;i++)s+=line(x+3,low+12+i*9,x+24,low+12+i*9,'cad-heavy');
 s+=path(`M${x+3} ${bottom-12}h-10v-9M${x+3} ${low+26}h-10v-9`)+circle(x+7,low-35,6)+line(x+7,low-42,x+7,low-28)+line(x,low-35,x+14,low-35)+rect(x+4,low-58,8,12);
 s+=leader(x+88,bottom-56,x+52,bottom-86,'R3',-1)+leader(cwtX,bottom-39,x+w+32,bottom-30,'R4');
 s+=leader(x+14,bottom-30,x-40,bottom-27,'Pit ladder',-1);
 // Conventional interrupted-shaft break: dimension labels retain full travel.
 const by=645;
 s+=polygon([[x-14,by],[x+45,by-6],[x+112,by+6],[x+w+14,by],[x+w+14,by+13],[x+112,by+19],[x+45,by+7],[x-14,by+13]],'cad-white');
 s+=vertical(roof,top,x+w+52,x+w,`10 OH ${fmt(m.overhead)}`,12)+vertical(top,low,x+w+52,x+w,`09 Traveling height ${fmt(m.travel)}`,12)+vertical(low,bottom,x+w+52,x+w,`08 Pit ${fmt(m.pit)}`,12);
 s+=vertical(roof,bottom,x+w+119,x+w,`Pit + travel + OH ${fmt(m.totalHeight)}`,12);
 s+=vertical(carTop+2,carBase-2,x-51,cx,`11 Car H ${fmt(m.carH)}`,11)+vertical(top-136,top,x-87,x-20,`12 Door H ${fmt(m.doorH)}`,11);
 s+=text(x-46,top+21,`TOP / F${m.floors||'?'}`,11,'end')+text(x-46,low+21,'F1 / ±0',11,'end');
 s+=text(x+w/2,975,`${fmt(m.floors)} stops · ${fmt(m.roping)} : 1 roping`,12,'middle')+text(x+w/2,994,'R1 / R2 machine supports · R3 / R4 buffers',10,'middle')+text(x+w/2,1012,'Loads, fixings and rail positions by manufacturer',10,'middle');
 return s;
}

function overhead(m){
 const P=(a,b,z)=>[145+a*290+b*165,650+a*93-b*150-z*310];
 const A=P(0,0,0),B=P(1,0,0),C=P(1,1,0),D=P(0,1,0),a=P(0,0,1),b=P(1,0,1),cc=P(1,1,1),d=P(0,1,1);
 let s=title(50,135,'03','OVERHEAD / STRUCTURAL OPENING')+text(50,156,'Cut-away isometric. Structural member sizes and fixing design by manufacturer.',11);
 // Open cage shows internal dimensions; concrete pier faces have proper depth.
 s+=polygon([A,B,C,D],'cad-fine');
 for(const [v0,v1] of [[D,d],[C,cc],[B,b]]){
  s+=polygon([v0,[v0[0]+15,v0[1]-9],[v1[0]+15,v1[1]-9],v1],'cad-wall')+polygon([v0,[v0[0]-12,v0[1]-4],[v1[0]-12,v1[1]-4],v1],'cad-white');
 }
 // Three reinforced perimeter beams; front is intentionally open for review.
 for(const [one,two] of [[a,d],[d,cc],[cc,b]]){
  s+=polygon([one,two,[two[0],two[1]+23],[one[0],one[1]+23]],'cad-wall')+line(one[0]+2,one[1]-5,two[0]+2,two[1]-5,'cad-heavy');
  s+=line(one[0],one[1]+6,two[0],two[1]+6,'cad-fine');
 }
 // Front entrance piers and lintel, not a pair of free-standing door rectangles.
 const opening=.48,lo=(1-opening)/2,hi=1-lo,head=.61;
 for(const [u,v] of [[0,lo],[hi,1]])s+=polygon([P(u,0,0),P(v,0,0),P(v,0,1),P(u,0,1)],'cad-wall');
 s+=polygon([P(lo,0,head),P(hi,0,head),P(hi,0,1),P(lo,0,1)],'cad-wall');
 s+=polygon([P(lo,0,head),P(hi,0,head),P(hi,.07,head),P(lo,.07,head)],'cad-section');
 // I-section support beams with flanges, webs and end plates, shown in cut-away.
 for(const u of [.30,.73]){
  const p=P(u,.04,1),q=P(u,.94,1);
  s+=polygon([[p[0]-7,p[1]-2],[q[0]-7,q[1]-2],[q[0]+7,q[1]+2],[p[0]+7,p[1]+2]],'cad-section');
  s+=line(p[0],p[1]+2,q[0],q[1]+2,'cad-heavy')+line(p[0],p[1]+15,q[0],q[1]+15,'cad-heavy');
  s+=polygon([[p[0]-7,p[1]+13],[q[0]-7,q[1]+13],[q[0]+7,q[1]+17],[p[0]+7,p[1]+17]],'cad-white');
  s+=bolts(p[0]-4,p[1],8,0)+bolts(q[0]-4,q[1],8,0);
 }
 s+=leader(...P(.73,.45,1),505,255,m.manufacturer.fields.beam?'Support beam: see schedule':'Support beam section: factory');
 // Dimension strings are parallel to isometric axes, with extension ticks.
 const ob=[0,36],od=[30,12];
 s+=line(A[0],A[1],A[0]+ob[0],A[1]+ob[1]+8,'extension')+line(B[0],B[1],B[0]+ob[0],B[1]+ob[1]+8,'extension')+line(A[0],A[1]+36,B[0],B[1]+36,'dimension');
 s+=`<text transform="translate(${(A[0]+B[0])/2} ${(A[1]+B[1])/2+30}) rotate(17.8)" text-anchor="middle" font-size="13" class="dim-label">Shaft Width ${fmt(m.shaftW)}</text>`;
 s+=line(B[0],B[1],B[0]+od[0]+7,B[1]+od[1],'extension')+line(C[0],C[1],C[0]+od[0]+7,C[1]+od[1],'extension')+line(B[0]+30,B[1]+12,C[0]+30,C[1]+12,'dimension');
 s+=`<text transform="translate(${(B[0]+C[0])/2+27} ${(B[1]+C[1])/2+1}) rotate(-42.3)" text-anchor="middle" font-size="13" class="dim-label">Depth ${fmt(m.shaftD)}</text>`;
 s+=vertical(a[1],A[1],A[0]-35,A[0],`OH ${fmt(m.overhead)}`,13);
 s+=text(340,798,'Opening / beam / slab / anchorage sizes: TBC unless supplied in the factory schedule.',10,'middle');return s;
}
function entrance(m){
 const x=800,y=258,w=178,h=425;
 let s=title(680,135,'04','DOOR ENTRANCE DETAIL')+text(680,156,'Front elevation · clear opening from Configurator',11);
 s+=rect(x-22,y-30,w+44,h+30,'cad-wall')+rect(x,y,w,h,'cad-white');
 // Entrance frame returns, transom, individual panel reveals and floor sill.
 s+=rect(x+8,y+12,w-16,h-12,'cad-heavy')+rect(x+13,y+17,w-26,h-17)+rect(x+19,y+28,w-38,h-28,'cad-fine');
 s+=channel(x+5,y+8,w-10,10)+channel(x-10,y+h,w+20,8)+rect(x-32,y+h+8,w+64,16,'cad-wall');
 const panels=Math.max(1,Math.min(4,m.doorPanels||2)),clear=w-38;
 for(let i=0;i<panels;i++){
  const px=x+19+i*clear/panels,pw=clear/panels;
  s+=rect(px+1,y+28,pw-2,h-29)+line(px+4,y+32,px+4,y+h-4,'cad-fine');
  const sy=y+h*.52,dir=m.doorType==='Side-opening'?-1:(i<panels/2?-1:1),middle=px+pw/2;
  s+=line(middle-dir*12,sy,middle+dir*12,sy)+path(`M${middle+dir*7} ${sy-4}l${dir*5} 4l${-dir*5} 4`);
 }
 // Floor datum, hall cut-outs, center line, frame fixings and structural returns.
 s+=line(x+w/2,y-50,x+w/2,y+h+42,'cad-center')+line(x-80,y+h,x+w+95,y+h,'cad-center');
 for(const yy of [y+60,y+190,y+320])s+=path(`M${x+8} ${yy}h-23v8M${x+w-8} ${yy}h23v8`,'cad-fine')+bolt(x-15,yy+8,2)+bolt(x+w+15,yy+8,2);
 s+=rect(x+w+43,y+200,14,29)+circle(x+w+50,y+218,3)+rect(x+w+43,y+118,14,18);
 s+=leader(x+w+50,y+127,x+w+66,y+90,'Fire / hall cut-outs',-1);
 s+=horizontal(x+19,x+w-19,y+h+45,y+h,`Door W ${fmt(m.doorW)}`,12)+horizontal(x,x+w,y+h+80,y+h+24,`Reserved W ${field(m,'openingWidth')}`,12);
 s+=vertical(y+28,y+h,x-43,x+19,`Door H ${fmt(m.doorH)}`,12)+vertical(y,y+h,x+w+85,x+w,`Reserved H ${field(m,'openingHeight')}`,12);
 s+=text(x+w/2,798,'Frame anchorage / sill support / cut-out positions by factory',10,'middle');return s;
}
function support(m){
 const x=1240,y=245,w=210,d=285;
 let s=title(1170,135,'05','MACHINE / SUPPORT PLAN')+text(1170,156,'Symbolic equipment arrangement · factory to locate',11);
 s+=rect(x-11,y-11,w+22,d+22,'cad-wall')+rect(x,y,w,d,'cad-white');
 s+=channel(x+32,y+22,16,d-44)+channel(x+w-48,y+22,16,d-44)+channel(x+24,y+56,w-48,17)+channel(x+24,y+d-74,w-48,17);
 s+=bolts(x+36,y+63,w-72,d-130)+rect(x+69,y+44,75,141,'cad-heavy')+rect(x+76,y+51,61,127)+bolts(x+73,y+49,67,130);
 // Motor/sheave top view: grooved pulley, shaft, cooling fins, brake and cable box.
 s+=rect(x+78,y+64,57,23,'cad-heavy');
 for(let i=0;i<9;i++)s+=line(x+81+i*6,y+65,x+81+i*6,y+86,'cad-fine');
 s+=rect(x+93,y+87,28,13)+circle(x+107,y+132,29,'cad-heavy')+circle(x+107,y+132,22)+circle(x+107,y+132,8)+rect(x+130,y+118,18,26);
 for(let a=0;a<360;a+=30){const rad=a*Math.PI/180;s+=line(x+107+23*Math.cos(rad),y+132+23*Math.sin(rad),x+107+28*Math.cos(rad),y+132+28*Math.sin(rad),'cad-fine');}
 s+=line(x+107,y-25,x+107,y+d+23,'cad-center')+line(x-24,y+132,x+w+24,y+132,'cad-center');
 s+=leader(x+40,y+64,x-28,y+30,'R1',-1)+leader(x+w-40,y+d-65,x+w+21,y+d-28,'R2');
 s+=horizontal(x,x+w,y+d+48,y+d,`Shaft W ${fmt(m.shaftW)}`,12)+vertical(y,y+d,x+w+48,x+w,`Depth ${fmt(m.shaftD)}`,12);
 s+=text(x+w/2,610,'R1 / R2 reactions: see supplied factory schedule',10,'middle');
 return s;
}
export function detailedFactoryViews(m){return overhead(m)+entrance(m)+support(m);}
