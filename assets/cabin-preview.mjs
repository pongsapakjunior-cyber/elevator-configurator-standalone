// SC-C-A visual configurator. Reprojects the selected catalogue artwork onto
// two calibrated planes only. No AI/API call, saved image mutation or change
// to engineering dimensions; this is an illustrative material preview.
export const CABIN_PREVIEW_VERSION = 2;
export const CEILING_CODES = Object.freeze(['CD-001','CD-003','CD-004','CD-005','CD-010','CD-012','CD-013','CD-014','CD-016','CD-018','CD-019','CD-020']);
export const FLOOR_CODES = Object.freeze([
  'FL-020','FL-021','FL-022','FL-023','FL-024','FL-025','FL-026','FL-027','FL-009','FL-010','FL-012',
  'HM-776','HM-780','HM-785','HM-798','HM-7110','HM-7112','HM-7113','HM-702','HM-727',
  'FL-013','FL-014','FL-015','FL-016','FL-017',
  ...Array.from({length:35},(_,i)=>`MG-${String(i+1).padStart(2,'0')}`),
]);
// Clockwise source corners measured against the 511/512 x 256 catalogue art.
// Mapping the trapezoid itself (not its transparent bounding box) avoids
// double-perspective distortion and checkerboard/white borders in the cabin.
const CEILING_PLANES = {
  'CD-001': [[35,62],[477,62],[386,220],[125,220]],
  'CD-003': [[57,61],[468,61],[397,228],[146,228]],
  'CD-004': [[40,65],[480,65],[389,235],[132,235]],
  'CD-005': [[50,64],[467,64],[389,228],[139,228]],
  'CD-010': [[41,78],[483,78],[394,230],[131,230]],
  'CD-012': [[44,80],[461,80],[383,232],[135,232]],
  'CD-013': [[57,72],[484,72],[411,224],[134,224]],
  'CD-014': [[47,73],[462,73],[387,225],[121,225]],
  'CD-016': [[53,53],[492,53],[407,202],[147,202]],
  'CD-018': [[46,52],[450,52],[374,202],[131,202]],
  'CD-019': [[57,35],[492,35],[409,179],[145,180]],
  'CD-020': [[39,34],[451,34],[380,181],[128,181]],
};
const BASE_SIZE = [1023,1537];
export const CABIN_PLANES = Object.freeze({
  ceiling: [[3,0],[1023,0],[797,356],[247,356]],
  floor: [[247,1194],[796,1194],[1012,1537],[34,1537]],
});

/** Projective matrix taking four source corners to four destination corners. */
export function homography(from,to) {
  const a=[];
  for(let i=0;i<4;i++) {
    const [x,y]=from[i], [u,v]=to[i];
    a.push([x,y,1,0,0,0,-u*x,-u*y,u]);
    a.push([0,0,0,x,y,1,-v*x,-v*y,v]);
  }
  for(let c=0;c<8;c++) {
    let pivot=c;
    for(let r=c+1;r<8;r++) if(Math.abs(a[r][c])>Math.abs(a[pivot][c])) pivot=r;
    if(Math.abs(a[pivot][c])<1e-10) throw Error('Invalid preview plane');
    [a[c],a[pivot]]=[a[pivot],a[c]];
    const scale=a[c][c]; for(let k=c;k<=8;k++) a[c][k]/=scale;
    for(let r=0;r<8;r++) if(r!==c) {
      const n=a[r][c]; for(let k=c;k<=8;k++) a[r][k]-=n*a[c][k];
    }
  }
  return [...a.map(row=>row[8]),1];
}
export function project(matrix,x,y) {
  const w=matrix[6]*x+matrix[7]*y+matrix[8];
  return [(matrix[0]*x+matrix[1]*y+matrix[2])/w,(matrix[3]*x+matrix[4]*y+matrix[5])/w];
}
function inside(x,y,quad) {
  let negative=false,positive=false;
  for(let i=0;i<4;i++) {
    const a=quad[i],b=quad[(i+1)%4];
    const cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
    if(cross<0) negative=true; if(cross>0) positive=true;
  }
  return !(negative&&positive);
}
const pixelsCache=new Map(), renderCache=new Map(), requests=new WeakMap();
function cached(map,key,load,max=24) {
  if(map.has(key)) return map.get(key);
  const promise=Promise.resolve().then(load).catch(error=>{map.delete(key);throw error;});
  map.set(key,promise);
  if(map.size>max) map.delete(map.keys().next().value);
  return promise;
}
function loadPixels(url) {
  return cached(pixelsCache,url,async()=>{
    const img=new Image(); img.crossOrigin='anonymous'; img.src=url; await img.decode();
    const canvas=document.createElement('canvas'); canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true}); ctx.drawImage(img,0,0);
    return ctx.getImageData(0,0,canvas.width,canvas.height);
  });
}
function floorPlane(image,code) {
  const {width:w,height:h,data}=image;
  let left=w,top=h,right=0,bottom=0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(data[(y*w+x)*4+3]>220) {
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right<=left||bottom<=top) throw Error('Floor artwork is empty');
  // Catalogue granite swatches have a pale scan edge, not a flooring border.
  const inset=code.startsWith('MG-')?Math.max(3,Math.ceil(Math.min(w,h)*.065)):1;
  left+=inset;right-=inset;top+=inset;bottom-=inset;
  return [[left,top],[right,top],[right,bottom],[left,bottom]];
}
// Mild edge recovery for all catalogue floors, capped to avoid bright halos.
// This never invents veins, changes a framed pattern or overwrites the source.
function clearFloor(image) {
  const {width:w,height:h,data}=image;
  const out=new Uint8ClampedArray(data);
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
    const i=(y*w+x)*4;
    if([i,i-4,i+4,i-w*4,i+w*4].some(k=>data[k+3]<240)) continue;
    for(let c=0;c<3;c++) {
      const blur=(data[i+c]*4+data[i-4+c]+data[i+4+c]+data[i-w*4+c]+data[i+w*4+c])/8;
      const detail=Math.max(-24,Math.min(24,(data[i+c]-blur)*1.1));
      out[i+c]=Math.max(0,Math.min(255,data[i+c]+detail));
    }
  }
  return {width:w,height:h,data:out};
}
const cubic=t=>{const a=Math.abs(t);return a<=1?1.5*a*a*a-2.5*a*a+1:a<2?-.5*a*a*a+2.5*a*a-4*a+2:0;};
const mirror=t=>{const n=((t%2)+2)%2;return n<=1?n:2-n;};
function warp(destination,source,from,to,type,code='') {
  const matrix=homography(to,from), {width:w,height:h,data:out}=destination;
  const {width:sw,height:sh,data:input}=source;
  const y0=Math.max(0,Math.floor(Math.min(...to.map(p=>p[1]))));
  const y1=Math.min(h,Math.ceil(Math.max(...to.map(p=>p[1]))));
  const x0=Math.max(0,Math.floor(Math.min(...to.map(p=>p[0]))));
  const x1=Math.min(w,Math.ceil(Math.max(...to.map(p=>p[0]))));
  for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) {
    if(!inside(x+.5,y+.5,to)) continue;
    let [sx,sy]=project(matrix,x+.5,y+.5);
    // A granite swatch is a material sample, not a full-room floor design.
    // Preserve fine grains at useful scale instead of stretching one tiny
    // thumbnail across the whole cabin. Mirror at joins to avoid hard seams.
    if(type==='floor'&&code.startsWith('MG-')) {
      const [left,top]=from[0],right=from[1][0],bottom=from[2][1];
      sx=left+mirror((sx-left)/(right-left)*2)*(right-left);
      sy=top+mirror((sy-top)/(bottom-top)*2)*(bottom-top);
    }
    const ix=Math.max(0,Math.min(sw-2,Math.floor(sx))), iy=Math.max(0,Math.min(sh-2,Math.floor(sy)));
    const fx=Math.max(0,Math.min(1,sx-ix)), fy=Math.max(0,Math.min(1,sy-iy));
    const weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
    const offsets=[(iy*sw+ix)*4,(iy*sw+ix+1)*4,((iy+1)*sw+ix)*4,((iy+1)*sw+ix+1)*4];
    const index=(y*w+x)*4;
    const depth=(y-y0)/Math.max(1,y1-y0);
    const light=type==='floor'?.88+.14*depth:.99-.08*depth;
    if(type==='floor') {
      // Bicubic sampling keeps border/inlay designs crisp at perspective zoom;
      // floors with decorative frames are never tiled or cropped to texture.
      const colors=[0,0,0];let alpha=0;
      for(let dy=-1;dy<=2;dy++)for(let dx=-1;dx<=2;dx++) {
        const px=Math.max(0,Math.min(sw-1,ix+dx)),py=Math.max(0,Math.min(sh-1,iy+dy));
        const offset=(py*sw+px)*4,weight=cubic(dx-fx)*cubic(dy-fy)*input[offset+3]/255;
        alpha+=weight;for(let c=0;c<3;c++)colors[c]+=input[offset+c]*weight;
      }
      alpha=Math.max(0,Math.min(1,alpha));
      for(let c=0;c<3;c++)out[index+c]=Math.round(Math.max(0,Math.min(255,colors[c]*light+out[index+c]*(1-alpha))));
    } else for(let c=0;c<3;c++) {
        let color=0,alpha=0;
        for(let k=0;k<4;k++) {const a=input[offsets[k]+3]/255*weights[k];color+=input[offsets[k]+c]*a;alpha+=a;}
        out[index+c]=Math.round(color*light+out[index+c]*(1-alpha));
      }
    // Original alpha and every pixel outside these two planes are untouched.
  }
}
function selected(value,allowed) {return allowed.includes(value)?value:'none';}

export async function composeCabinPreview(config,{assetBase}={}) {
  const root=new URL(assetBase||'./assets/',globalThis.location?.href||import.meta.url);
  const baseURL=new URL('decorations/sc-c-a.webp',root).href;
  const ceiling=selected(config?.ceilingFinish,CEILING_CODES), floor=selected(config?.floorFinish,FLOOR_CODES);
  if(config?.cabinStyle!=='SC-C-A'||(ceiling==='none'&&floor==='none')) return {src:baseURL,applied:false,ceiling:'none',floor:'none'};
  const key=JSON.stringify([root.href,ceiling,floor,CABIN_PREVIEW_VERSION]);
  return cached(renderCache,key,async()=>{
    const [base,ceilingPixels,floorPixels]=await Promise.all([
      loadPixels(baseURL),
      ceiling!=='none'?loadPixels(new URL(`finishes/ceilings/${ceiling.toLowerCase()}.png`,root).href):null,
      floor!=='none'?loadPixels(new URL(`finishes/floors/${floor.toLowerCase()}.png`,root).href):null,
    ]);
    const canvas=document.createElement('canvas');canvas.width=base.width;canvas.height=base.height;
    const ctx=canvas.getContext('2d');
    const result=new ImageData(new Uint8ClampedArray(base.data),base.width,base.height);
    const plane=name=>CABIN_PLANES[name].map(([x,y])=>[x*base.width/BASE_SIZE[0],y*base.height/BASE_SIZE[1]]);
    if(ceilingPixels) warp(result,ceilingPixels,CEILING_PLANES[ceiling],plane('ceiling'),'ceiling');
    if(floorPixels) warp(result,clearFloor(floorPixels),floorPlane(floorPixels,floor),plane('floor'),'floor',floor);
    ctx.putImageData(result,0,0);
    return {src:canvas.toDataURL('image/png'),applied:true,ceiling,floor};
  },8);
}

/** Async-safe DOM adapter. New selections always supersede old image loads. */
export async function updateCabinPreview(img,config,options={}) {
  const request={};requests.set(img,request);
  const original=img.src;
  img.dataset.previewCeiling='none';img.dataset.previewFloor='none';
  if(config?.cabinStyle!=='SC-C-A'||(!CEILING_CODES.includes(config.ceilingFinish)&&!FLOOR_CODES.includes(config.floorFinish))) {
    img.dataset.cabinPreview='original';return {src:original,applied:false};
  }
  img.dataset.cabinPreview='loading';
  try {
    const result=await composeCabinPreview(config,options);
    if(requests.get(img)!==request) return null;
    img.src=result.src;await img.decode();
    if(requests.get(img)!==request) return null;
    img.dataset.previewCeiling=result.ceiling;img.dataset.previewFloor=result.floor;
    img.dataset.cabinPreview=result.applied?'ready':'original';
    img.alt=`SC-C-A illustrative cabin preview; ceiling ${result.ceiling}; floor ${result.floor}`;
    return result;
  } catch(error) {
    if(requests.get(img)===request) {img.src=original;img.dataset.cabinPreview='error';}
    console.warn('Cabin material preview unavailable',error);
    return null;
  }
}
