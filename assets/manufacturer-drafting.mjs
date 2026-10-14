// Reference-led factory drawings. Graphic positions are NTS; dimension values
// are entered requirements or supplied factory data, never measured from a JPG.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const fmt=v=>v==null||v===''?'TBC':typeof v==='number'?v.toLocaleString('en-US',{maximumFractionDigits:2}):String(v);
// Long supplied entries stay complete in the schedule, with a short drawing call-out.
const field=(m,k)=>{const value=m.manufacturer.fields[k];return value?Array.from(value).length>18?'SEE SCHEDULE':value:'TBC';};
const number=v=>v!==''&&v!=null&&Number.isFinite(Number(v))&&Number(v)>0?Number(v):null;
const text=(x,y,s,size=14,anchor='start',cls='')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" class="${cls}">${esc(s)}</text>`;
const line=(x,y,X,Y,cls='')=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" class="${cls}"/>`;
const rect=(x,y,w,h,cls='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
const path=(d,cls='')=>`<path d="${d}" class="${cls}"/>`;
const circle=(x,y,r,cls='')=>`<circle cx="${x}" cy="${y}" r="${r}" class="${cls}"/>`;
const polygon=(p,cls='')=>`<polygon points="${p.map(v=>v.join(',')).join(' ')}" class="${cls}"/>`;
const horizontal=(x1,x2,y,from,label,size=16)=>line(x1,from,x1,y+8,'extension')+line(x2,from,x2,y+8,'extension')+line(x1,y,x2,y,'dimension')+text((x1+x2)/2,y-7,label,size,'middle','dim-label');
const vertical=(y1,y2,x,from,label,size=16)=>line(from,y1,x-8,y1,'extension')+line(from,y2,x-8,y2,'extension')+line(x,y1,x,y2,'dimension')+`<text transform="translate(${x-8} ${(y1+y2)/2}) rotate(-90)" font-size="${size}" text-anchor="middle" class="dim-label">${esc(label)}</text>`;
const leader=(x,y,X,Y,label,side=1)=>circle(x,y,2.5)+line(x,y,X,Y)+line(X,Y,X+side*13,Y)+text(X+side*18,Y+5,label,13,side===1?'start':'end');
const viewTitle=(x,y,label,number)=>text(x,y,label,25,'middle','cad-title')+line(x-110,y+8,x+110,y+8,'cad-fine')+text(x,y+31,`${number} / DIMENSIONS IN mm / NTS`,11,'middle','cad-sans');
const bolt=(x,y,r=2.4)=>circle(x,y,r)+line(x-r-1,y,x+r+1,y,'cad-fine')+line(x,y-r-1,x,y+r+1,'cad-fine');
const bolts=(x,y,w,h)=>bolt(x,y)+bolt(x+w,y)+bolt(x,y+h)+bolt(x+w,y+h);
const channel=(x,y,w,h)=>rect(x,y,w,h,'cad-heavy')+line(x+3,y+3,x+w-3,y+3,'cad-fine')+line(x+3,y+h-3,x+w-3,y+h-3,'cad-fine');
function rail(x,y,side=1){return `<g transform="translate(${x} ${y}) scale(${side} 1)">${rect(-13,-22,8,44,'cad-heavy')}${path('M-5 -15h15v9h9v12h-9v9H-5')}${rect(-2,-11,9,22)}${rect(15,-3,12,6,'cad-section')}${line(-20,0,32,0,'cad-center')}</g>`;}
function sheave(x,y,r=22){let out=circle(x,y,r,'cad-heavy')+circle(x,y,r-4)+circle(x,y,4,'cad-section');for(const offset of [-5,0,5])out+=line(x+offset,y-r+2,x+offset,y+r-2,'cad-fine');return out;}
function machine(x,y,scale=1){
 let out=sheave(0,0,22)+rect(19,-19,42,38,'cad-heavy')+rect(61,-14,13,28)+rect(25,-26,17,7)+rect(29,-30,9,4);
 for(let i=0;i<7;i++)out+=line(24+i*5,-16,24+i*5,16,'cad-fine');
 out+=rect(-24,24,103,8,'cad-heavy')+path('M-17 23l6 -10h8l6 10M48 23l6 -8h8l6 8')+bolts(-17,28,88,0);
 return `<g transform="translate(${x} ${y}) scale(${scale})">${out}</g>`;
}
function buffer(x,y,height=62){
 let out=channel(x-20,y+height,40,5)+rect(x-6,y+8,12,height-8)+rect(x-18,y,36,6,'cad-heavy')+rect(x-11,y-4,22,4);
 for(let i=0;i<8;i++)out+=path(`M${x-12} ${y+10+i*(height-14)/8}l24 3l-24 3`,'cad-fine');
 return out+bolts(x-15,y+height+3,30,0)+line(x,y-16,x,y+height+16,'cad-center');
}
export const cadStyles=`text{font-family:'Times New Roman',Georgia,Tahoma,serif;fill:#111}.cad-sans{font-family:Arial,Tahoma,sans-serif}.cad-title{font-family:'Times New Roman',Georgia,Tahoma,serif;fill:#111}line,rect,path,circle,polygon{stroke:#111;stroke-width:.85;fill:none;stroke-linecap:square;stroke-linejoin:miter}.cad-heavy{stroke-width:1.65}.cad-fine{stroke:#444;stroke-width:.5}.cad-wall{fill:url(#concrete);stroke-width:1.4}.cad-section{fill:#111;stroke-width:.7}.cad-white{fill:#fff}.cad-panel{fill:url(#panel-hatch)}.cad-hidden{stroke:#555;stroke-width:.65;stroke-dasharray:6 4}.cad-center{stroke:#333;stroke-width:.65;stroke-dasharray:22 5 3 5}.extension{stroke:#555;stroke-width:.55}.dimension{stroke:#222;stroke-width:.7}.dim-label{paint-order:stroke;stroke:white;stroke-width:3;stroke-linejoin:round}.cell{stroke:#555;stroke-width:.65}.pending{fill:#555}`;
export const cadDefs=`<pattern id="concrete" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" style="fill:white;stroke:none"/><path d="M-2 14L14 -2M7 17L17 7" style="stroke:#888;stroke-width:.45"/><path d="M3 5l2 1l-1 2zM10 11l2 -1" style="stroke:#666;stroke-width:.35"/></pattern><pattern id="panel-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" style="stroke:#777;stroke-width:.45"/></pattern>`;

// 1040 × 810: dimension chains and paired shafts follow the supplied plan.
export function detailedPlan(m){
 const count=m.duplex?2:1,divider=number(m.manufacturer.divider);
 const scale=Math.min(680/(count*(m.shaftW||1600)+(count===2?(divider||180):0)),360/(m.shaftD||1800));
 const sw=(m.shaftW||1600)*scale,sd=(m.shaftD||1800)*scale,gap=count===2?Math.max(24,(divider||180)*scale):0;
 const bank=count*sw+gap,start=190+(680-bank)/2,y=185;
 let out=text(30,35,`01 / ${m.duplex?'DUPLEX':'SINGLE'} SHAFT PLAN LAYOUT`,16,'start','cad-sans');
 for(let i=0;i<count;i++){
  const x=start+i*(sw+gap),mid=x+sw/2,base=y+sd;
  const carW=Math.min(sw-34,(m.carW||1200)*scale),carD=Math.min(sd-65,(m.carD||1200)*scale),cx=mid-carW/2,cy=base-carD-24;
  const doorW=Math.min(carW-12,(m.doorW||700)*scale),dx=mid-doorW/2,sy=base-20,railY=cy+carD*.54;
  const carGauge=number(field(m,'carRG')),displayGauge=carGauge?Math.min(sw+12,carGauge*scale):carW+44,gl=mid-displayGauge/2,gr=mid+displayGauge/2;
  const cwtGauge=number(field(m,'counterweightRG')),gauge=Math.min(sw-40,cwtGauge?cwtGauge*scale:sw*.55),cwtY=y+35,cwtX=mid-gauge/2;
  out+=path(`M${dx-18} ${base+34}H${x-14}V${y-14}H${x+sw+14}V${base+34}H${dx+doorW+18}`,'cad-heavy');
  out+=path(`M${dx-18} ${base}H${x}V${y}H${x+sw}V${base}H${dx+doorW+18}`,'cad-heavy');
  out+=line(dx-18,base,dx-18,base+34)+line(dx+doorW+18,base,dx+doorW+18,base+34)+text(mid,69,`${m.liftNo||'LIFT'}${count===2?' '+(i+1):''}`,14,'middle','cad-sans');
  out+=rect(cwtX+5,cwtY-15,gauge-10,30,'cad-heavy')+rect(cwtX+13,cwtY-9,gauge-26,18)+rect(mid-28,cwtY-20,56,40);
  for(const dy of [-5,0,5])out+=line(cwtX+16,cwtY+dy,cwtX+gauge-16,cwtY+dy,'cad-fine');
  out+=rail(cwtX-9,cwtY)+rail(cwtX+gauge+9,cwtY,-1)+line(x-28,cwtY,x+sw+28,cwtY,'cad-center')+leader(mid,cwtY,mid+25,cwtY-31,'R4');
  out+=horizontal(cwtX-9,cwtX+gauge+9,112,cwtY,`CWT RG ${field(m,'counterweightRG')}`,16)+horizontal(x,mid,146,y,'TBC',14)+horizontal(mid,x+sw,146,y,'TBC',14);
  // Open front and returned jambs, rather than overlapping closed boxes.
  out+=path(`M${dx-6} ${sy}H${cx-6}V${cy-6}H${cx+carW+6}V${sy}H${dx+doorW+6}`,'cad-heavy')+path(`M${dx-6} ${sy-7}H${cx}V${cy}H${cx+carW}V${sy-7}H${dx+doorW+6}`);
  out+=path(`M${cx} ${sy-20}h37v20M${cx+carW} ${sy-20}h-37v20`,'cad-heavy');
  out+=rail(gl,railY)+rail(gr,railY,-1)+line(x-37,railY,x+sw+37,railY,'cad-center')+line(mid,y-43,mid,base+53,'cad-center');
  out+=rect(mid-35,railY-31,46,62)+rect(mid-28,railY-24,29,48)+circle(mid,railY,6)+leader(mid,railY,mid+26,railY-31,'R3');
  out+=horizontal(cx,cx+carW,cy+35,cy,`03 Car N/Width ${fmt(m.carW)}`,17)+vertical(cy,sy-7,cx+carW-18,cx+carW,`04 Car N/Depth ${fmt(m.carD)}`,15)+horizontal(gl,gr,railY+46,railY,`Car RG ${field(m,'carRG')}`,17);
  out+=channel(cx-18,sy,carW+36,9)+channel(cx-18,sy+15,carW+36,9)+rect(dx-5,sy+9,doorW+10,6,'cad-white');
  const panels=Math.max(1,Math.min(4,m.doorPanels||2));
  for(let p=0;p<panels;p++){const px=dx+p*doorW/panels,pw=doorW/panels;out+=rect(px,sy-10,pw,8)+line(px+2,sy-7,px+pw-2,sy-7,'cad-fine')+circle(px+pw*.25,sy-2,2)+circle(px+pw*.75,sy-2,2);}
  if(m.entrances===2)out+=rect(dx,y-3,doorW,6,'cad-white')+text(mid,y+15,'REAR OPENING / CWT BY FACTORY',9,'middle','cad-sans');
  out+=horizontal(dx,dx+doorW,base+72,base+24,`05 N/D.Open ${fmt(m.doorW)}`,17);
  const reserved=number(field(m,'openingWidth')),rw=reserved?Math.min(sw,reserved*scale):doorW+36,rx=mid-rw/2;
  out+=horizontal(rx,rx+rw,base+112,base+34,`Reserved Ent. ${field(m,'openingWidth')}`,15)+horizontal(x,x+sw,base+145,base+34,`01 Shaft Width ${fmt(m.shaftW)}`,18);
  if(!i)out+=vertical(y,base,x-108,x,`02 Shaft Depth ${fmt(m.shaftD)}`,18)+vertical(y,railY,x-70,x,'TBC',15)+vertical(railY,base,x-70,x,'TBC',15)+vertical(sy+9,sy+15,x-39,x,`Sill gap ${field(m,'sillGap')}`,12);
 }
 const base=y+sd;
 if(m.duplex)out+=horizontal(start,start+bank,base+181,base+34,`07 Overall ${m.bankWidth==null?'2 × '+fmt(m.shaftW)+' + divider TBC':fmt(m.bankWidth)}`,21)+text(start+sw+gap/2,base+145,`06 ${fmt(divider)}`,12,'middle','dim-label');
 out+=viewTitle(520,755,'Shaft Plan Layout','01')+text(520,804,'Rail positions, offsets and clearances: manufacturer to confirm.',11,'middle','cad-sans');
 return `<g data-drawing="shaft-plan">${out}</g>`;
}

// 650 × 1320: continuous longitudinal section with separate concrete sections.
export function detailedSection(m){
 const x=230,w=205,roof=170,top=462,low=987,bottom=1145,mr=m.elevatorType.startsWith('MR —');
 const cx=x+35,cw=136,carTop=245,carBase=top-12,cwtX=x+w-20;
 let out=text(30,35,'02 / HOISTWAY SECTION',16,'start','cad-sans')+text(30,56,'Longitudinal section · continuous shaft · NTS',12);
 out+=rect(x-18,roof-18,18,bottom-roof+36,'cad-wall')+rect(x+w,roof-18,18,bottom-roof+36,'cad-wall')+rect(x-18,roof-18,w+36,18,'cad-wall')+rect(x-18,bottom,w+36,18,'cad-wall');
 out+=`<g data-part="guide-rails">${rect(x+16,roof+8,3,bottom-roof-8,'cad-heavy')}${rect(x+w-17,roof+8,3,bottom-roof-8,'cad-heavy')}</g>`+line(x+w/2,roof-30,x+w/2,bottom+30,'cad-center');
 for(const yy of [205,385,570,755,935,1095])out+=path(`M${x-12} ${yy-5}h28v10h-28M${x+w+12} ${yy-5}h-28v10h28`)+bolts(x-10,yy-3,0,6)+bolts(x+w+10,yy-3,0,6)+rect(x+13,yy-13,9,26,'cad-fine')+bolts(x+17,yy-9,0,18);
 const mx=mr?x+67:x+137,my=mr?roof-51:roof+40;
 if(mr)out+=path(`M${x-18} ${roof-18}v-65h${w+36}v65`,'cad-hidden')+text(x+w/2,89,'MR / machine room by factory',12,'middle');
 out+=machine(mx,my,.72)+channel(x+9,my+25,w-18,8)+bolts(x+20,my+29,w-40,0)+leader(mx+50,my,x+w+45,my-6,'Machine');
 out+=channel(cx-13,carTop-17,cw+26,10)+channel(cx-13,carBase+13,cw+26,12)+channel(cx-7,carTop-7,6,carBase-carTop+20)+channel(cx+cw+1,carTop-7,6,carBase-carTop+20);
 out+=line(cx-7,carTop+4,cx+cw+7,carBase+8,'cad-fine')+line(cx+cw+7,carTop+4,cx-7,carBase+8,'cad-fine');
 out+=rect(cx+5,carTop+5,cw-10,carBase-carTop-5,'cad-white')+rect(cx+10,carTop+10,cw-20,carBase-carTop-15)+line(cx+14,carTop+14,cx+14,carBase-5,'cad-fine');
 out+=channel(cx+3,carTop-5,cw-6,5)+channel(cx+3,carBase-1,cw-6,6)+rect(cx+18,carBase+25,cw-36,5);
 for(const yy of [carTop+17,carBase-25])out+=rect(cx-14,yy,13,19)+rect(cx+cw+1,yy,13,19)+bolts(cx-10,yy+4,0,11)+bolts(cx+cw+5,yy+4,0,11);
 out+=bolts(cx-8,carTop-12,cw+16,0)+bolts(cx-8,carBase+19,cw+16,0);
 for(let i=0;i<4;i++){const offset=i*2.2;out+=path(`M${mx-14+offset} ${my+7}V${m.roping===2?carBase+40:carTop-18}`,'cad-fine')+path(`M${mx+13+offset} ${my+7}H${cwtX+offset}V916`,'cad-fine');}
 if(m.roping===2){for(const px of [cx+26,cx+cw-26])out+=sheave(px,carBase+36,13)+line(px,roof+8,px,carBase+23,'cad-fine');out+=line(cx+26,carBase+49,cx+cw-26,carBase+49,'cad-heavy');}
 else out+=rect(cx+48,carTop-24,40,6)+path(`M${cx+54} ${carTop-24}v-8M${cx+62} ${carTop-24}v-8M${cx+70} ${carTop-24}v-8`);
 let level=0;
 const floors=[{label:'F1 / ±0',value:0},...m.heights.map((h,i)=>({label:`F${i+2}`,value:level=level==null||h==null?null:level+h}))];
 for(let i=0;i<floors.length;i++){
  const entry=floors[i],yy=entry.value!=null&&m.travel?low-entry.value/m.travel*(low-top):low-i/Math.max(1,floors.length-1)*(low-top),show=floors.length<=8||i===0||i===floors.length-1;
  out+=line(x-47,yy,x+30,yy,'cad-center');
  if(show){out+=text(x-54,yy+5,i===floors.length-1?`TOP / F${m.floors||'?'}`:entry.label,12,'end')+rect(x-28,yy-142,28,142)+rect(x-20,yy-135,9,127)+rect(x-9,yy-136,4,131,'cad-fine')+channel(x-33,yy-5,63,8)+rect(x-38,yy+3,38,14,'cad-wall')+rect(x-29,yy-148,36,5)+circle(x-13,yy-140,3)+path(`M${x+8} ${yy+3}l18 17h-26`);}
 }
 out+=rect(cwtX-12,916,24,135,'cad-heavy')+rect(cwtX-8,923,16,121)+rect(cwtX-16,912,32,6)+rect(cwtX-16,1051,32,6);
 for(let i=0;i<17;i++)out+=line(cwtX-8,927+i*7,cwtX+8,927+i*7,'cad-fine');
 for(const yy of [921,1030])out+=rect(cwtX-16,yy,4,16)+rect(cwtX+12,yy,4,16);
 out+=buffer(x+92,bottom-73,63)+buffer(cwtX,bottom-51,41)+leader(x+92,bottom-56,x+60,bottom-90,'R3',-1)+leader(cwtX,bottom-40,x+w+40,bottom-30,'R4');
 out+=rect(x+3,low+8,3,bottom-low-17)+rect(x+24,low+8,3,bottom-low-17);
 for(let i=0;i<14;i++)out+=line(x+3,low+15+i*9,x+27,low+15+i*9,'cad-heavy');
 out+=path(`M${x+3} ${bottom-14}h-12v-10M${x+3} ${low+30}h-12v-10`)+leader(x+15,bottom-30,x-65,bottom-30,'Pit ladder',-1)+circle(x+8,low-30,6)+line(x+8,low-37,x+8,low-23)+rect(x+4,low-56,8,12);
 out+=vertical(roof,top,x+w+62,x+w,`10 OH ${fmt(m.overhead)}`,16)+vertical(top,low,x+w+62,x+w,`09 Traveling height ${fmt(m.travel)}`,16)+vertical(low,bottom,x+w+62,x+w,`08 Pit ${fmt(m.pit)}`,16)+vertical(roof,bottom,x+w+123,x+w,`Pit + travel + OH ${fmt(m.totalHeight)}`,16);
 out+=vertical(carTop+5,carBase,x-62,cx,`11 Car H ${fmt(m.carH)}`,14)+vertical(top-135,top,x-106,x-20,`12 Door H ${fmt(m.doorH)}`,14);
 out+=viewTitle(325,1236,'Hoistway Section Layout','02')+text(325,1294,`${fmt(m.floors)} stops / ${fmt(m.roping)} : 1 roping / R1-R2 supports, R3-R4 buffers`,12,'middle');
 return `<g data-drawing="hoistway-section">${out}</g>`;
}

// 760 × 790: a solid concrete shaft/slab cut-away, not a wire-frame cage.
export function detailedOverhead(m){
 const P=(a,b,z)=>[105+a*345+b*205,583+a*112-b*175-z*337];
 const A=P(0,0,0),B=P(1,0,0),C=P(1,1,0),D=P(0,1,0),a=P(0,0,1),b=P(1,0,1),c=P(1,1,1),d=P(0,1,1);
 let out=text(20,28,'03 / OVERHEAD / STRUCTURAL OPENING',16,'start','cad-sans');
 out+=polygon([D,C,c,d],'cad-wall')+polygon([B,C,c,b],'cad-wall')+polygon([A,D,d,a],'cad-wall');
 const left=.21,right=.79,head=.69;
 out+=polygon([P(0,0,0),P(left,0,0),P(left,0,1),a],'cad-wall')+polygon([P(right,0,0),B,b,P(right,0,1)],'cad-wall');
 out+=polygon([P(left,0,head),P(right,0,head),P(right,0,1),P(left,0,1)],'cad-wall')+polygon([P(left,0,head),P(right,0,head),P(right,.08,head),P(left,.08,head)],'cad-section');
 out+=line(...P(left,0,0),...P(left,.08,0),'cad-heavy')+line(...P(right,0,0),...P(right,.08,0),'cad-heavy');
 const lo=.16,hi=.84,front=.15,back=.85;
 for(const corners of [[[0,0],[1,0],[1,front],[0,front]],[[0,back],[1,back],[1,1],[0,1]],[[0,front],[lo,front],[lo,back],[0,back]],[[hi,front],[1,front],[1,back],[hi,back]]])out+=polygon(corners.map(([u,v])=>P(u,v,1)),'cad-wall');
 out+=polygon([P(lo,front,1),P(hi,front,1),P(hi,front,.94),P(lo,front,.94)],'cad-section')+polygon([P(hi,front,1),P(hi,back,1),P(hi,back,.94),P(hi,front,.94)],'cad-section');
 for(const u of [.34,.68])out+=polygon([P(u-.025,front,.99),P(u+.025,front,.99),P(u+.025,back,.99),P(u-.025,back,.99)],'cad-section')+line(...P(u-.025,front,.94),...P(u-.025,back,.94),'cad-heavy')+line(...P(u+.025,front,.94),...P(u+.025,back,.94),'cad-fine');
 out+=rect(15,160,34,72)+polygon([[15,160],[28,150],[62,150],[49,160]],'cad-white')+polygon([[49,160],[62,150],[62,222],[49,232]],'cad-white')+line(20,165,20,228,'cad-fine')+circle(42,197,1.5)+text(15,142,'Controller',12);
 out+=leader(...P(.68,.59,1),555,76,m.manufacturer.fields.beam?'Beams: see schedule':'Support beams TBC')+vertical(a[1],A[1],65,A[0],`OH ${fmt(m.overhead)}`,18);
 const dim=(p,q,offset,label,angle)=>{const p1=[p[0]+offset[0],p[1]+offset[1]],q1=[q[0]+offset[0],q[1]+offset[1]];return line(...p,...p1,'extension')+line(...q,...q1,'extension')+line(...p1,...q1,'dimension')+`<text transform="translate(${(p1[0]+q1[0])/2} ${(p1[1]+q1[1])/2-9}) rotate(${angle})" text-anchor="middle" font-size="18" class="dim-label">${esc(label)}</text>`;};
 out+=dim(A,B,[0,42],`Shaft Width ${fmt(m.shaftW)}`,18)+dim(B,C,[38,17],`Depth ${fmt(m.shaftD)}`,-40.5)+dim(a,b,[0,-29],`Reserved W ${field(m,'openingWidth')}`,18);
 out+=viewTitle(380,729,'Overhead 3D Layout','03')+text(380,780,'Slab / beam / anchorage sizes and positions: manufacturer to confirm.',12,'middle','cad-sans');
 return `<g data-drawing="overhead-isometric">${out}</g>`;
}

// 620 × 790: reserved opening, entrance frame, hall cut-outs and panel detail.
export function detailedEntrance(m){
 const x=155,y=124,w=225,h=370;
 let out=text(20,28,'04 / DOOR ENTRANCE DETAIL',16,'start','cad-sans');
 out+=rect(x-21,y-24,w+42,h+24,'cad-wall')+rect(x,y,w,h,'cad-white')+rect(x+10,y+14,w-20,h-14,'cad-heavy')+rect(x+15,y+20,w-30,h-20)+rect(x+20,y+28,w-40,h-28,'cad-fine');
 out+=channel(x+7,y+8,w-14,8)+channel(x-12,y+h,w+24,8)+rect(x-33,y+h+8,w+66,16,'cad-wall');
 const panels=Math.max(1,Math.min(4,m.doorPanels||2)),clear=w-40;
 for(let i=0;i<panels;i++){const px=x+20+i*clear/panels,pw=clear/panels;out+=rect(px+1,y+28,pw-2,h-29)+line(px+4,y+32,px+4,y+h-5,'cad-fine');}
 out+=line(x+w/2,y-45,x+w/2,y+h+28,'cad-center')+line(x-75,y+h,x+w+135,y+h,'cad-center');
 for(const yy of [y+60,y+170,y+290])out+=path(`M${x+10} ${yy}h-26v8M${x+w-10} ${yy}h26v8`,'cad-fine')+bolt(x-16,yy+8,2)+bolt(x+w+16,yy+8,2);
 out+=rect(x+w+58,y+82,17,20)+rect(x+w+58,y+174,17,39)+circle(x+w+66.5,y+201,3)+leader(x+w+66,y+92,x+w+94,y+53,'Fire box',-1)+leader(x+w+66,y+188,x+w+94,y+243,'Hall box',-1);
 out+=horizontal(x+20,x+w-20,y+h+42,y+h,`Door W ${fmt(m.doorW)}`,17)+horizontal(x,x+w,y+h+77,y+h+24,`Reserved W ${field(m,'openingWidth')}`,16)+vertical(y+28,y+h,x-47,x+20,`Door H ${fmt(m.doorH)}`,16)+vertical(y,y+h,x+w+121,x+w,`Reserved H ${field(m,'openingHeight')}`,16);
 out+=rect(173,630,170,78,'cad-heavy')+rect(181,638,73,62)+rect(262,638,73,62)+rect(187,644,61,50,'cad-panel')+rect(268,644,61,50,'cad-panel')+line(258,620,258,719,'cad-center')+text(258,612,'Door panel construction / sizes TBC',13,'middle');
 out+=viewTitle(310,747,'Reserved Door Entrance Plan','04')+text(310,790,'Frame anchorage / sill support / cut-out positions by factory',11,'middle','cad-sans');
 return `<g data-drawing="door-entrance">${out}</g>`;
}

// 520 × 670: paired support beams and top-view machine with external call-outs.
export function detailedSupport(m){
 const x=113,y=112,w=268,d=337;
 let out=text(20,28,'05 / MACHINE / SUPPORT PLAN',16,'start','cad-sans');
 out+=rect(x-14,y-14,w+28,d+28,'cad-wall')+rect(x,y,w,d,'cad-white')+channel(x+36,y+19,17,d-38)+channel(x+w-53,y+19,17,d-38)+channel(x+24,y+62,w-48,18)+channel(x+24,y+d-79,w-48,18);
 out+=bolts(x+45,y+71,w-90,d-141)+rect(x+89,y+49,89,180,'cad-heavy')+rect(x+96,y+57,75,164)+bolts(x+93,y+53,81,172)+rect(x+100,y+75,67,30,'cad-heavy');
 for(let i=0;i<11;i++)out+=line(x+103+i*6,y+76,x+103+i*6,y+104,'cad-fine');
 out+=rect(x+118,y+105,32,16)+circle(x+134,y+158,34,'cad-heavy')+circle(x+134,y+158,27)+circle(x+134,y+158,9)+rect(x+166,y+141,21,33);
 for(let angle=0;angle<360;angle+=30){const rad=angle*Math.PI/180;out+=line(x+134+28*Math.cos(rad),y+158+28*Math.sin(rad),x+134+33*Math.cos(rad),y+158+33*Math.sin(rad),'cad-fine');}
 out+=line(x+w/2,y-37,x+w/2,y+d+34,'cad-center')+line(x-27,y+158,x+w+27,y+158,'cad-center')+leader(x+45,y+71,x-40,y+40,'R1',-1)+leader(x+w-45,y+d-70,x+w+40,y+d-32,'R2');
 out+=horizontal(x,x+w,y+d+49,y+d,`Shaft W ${fmt(m.shaftW)}`,18)+vertical(y,y+d,x+w+63,x+w,`Depth ${fmt(m.shaftD)}`,18)+viewTitle(260,578,'Machine Support Plan','05')+text(260,635,'R1 / R2 reactions and support member sizes: factory',12,'middle','cad-sans');
 return `<g data-drawing="machine-support">${out}</g>`;
}
export function detailedFactoryViews(m){return detailedOverhead(m)+detailedEntrance(m)+detailedSupport(m);}
