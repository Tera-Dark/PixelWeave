/**
 * Deterministic, browser-independent colour processing for imported images.
 * All output pixels are discrete RGBA values, never CSS filters.
 */
export const TRANSFER_KEY='pixelweave.pixelize.transfer.v1';
export function logicalSize(width,height,longEdge){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw Error('无效图片尺寸');
 const edge=Number(longEdge);
 if(!Number.isInteger(edge)||edge<8||edge>512)throw Error('原生长边必须为 8–512 的整数');
 const ratio=edge/Math.max(width,height);
 return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}
// No arbitrary multiplier cap: the source grid and the output canvas budget determine the limit.
const MAX_EXPORT_SIDE=16384;
const MAX_EXPORT_PIXELS=48000000;
export function maxExportScale(width,height){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)throw Error('无效原生画布尺寸');
 return Math.max(0,Math.min(
  Math.floor(MAX_EXPORT_SIDE/width),
  Math.floor(MAX_EXPORT_SIDE/height),
  Math.floor(Math.sqrt(MAX_EXPORT_PIXELS/(width*height)))
 ));
}
export function exportSize(width,height,scale){
 const n=Number(scale);
 if(!Number.isSafeInteger(n)||n<1)throw Error('导出倍率必须为正整数');
 const maximum=maxExportScale(width,height);
 if(n>maximum)throw Error('放大后画布过大；当前像素网格最多支持 '+maximum+'×，请降低倍率或原生尺寸');
 return {width:width*n,height:height*n,scale:n};
}
const clamp=n=>Math.max(0,Math.min(255,Math.round(n)));
const dist=(r,g,b,c)=>{const dr=r-c[0],dg=g-c[1],db=b-c[2];return dr*dr*2+dg*dg*3+db*db;};
function buildPalette(pixels,count,threshold){
 const histogram=new Map();
 for(let i=0;i<pixels.length;i+=4){
  if(pixels[i+3]<threshold)continue;
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
  const key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);
  let c=histogram.get(key);
  if(!c){c={r:0,g:0,b:0,n:0};histogram.set(key,c);}
  c.r+=r;c.g+=g;c.b+=b;c.n++;
 }
 const entries=[...histogram.values()].map(c=>({r:Math.round(c.r/c.n),g:Math.round(c.g/c.n),b:Math.round(c.b/c.n),n:c.n}));
 if(!entries.length)return [];
 if(entries.length<=count)return entries.map(c=>[c.r,c.g,c.b]);
 let boxes=[entries];
 while(boxes.length<count){
  let best=-1,score=-1,axis='r';
  for(let i=0;i<boxes.length;i++){
   const box=boxes[i];if(box.length<2)continue;
   let minR=255,minG=255,minB=255,maxR=0,maxG=0,maxB=0,total=0;
   for(const c of box){minR=Math.min(minR,c.r);minG=Math.min(minG,c.g);minB=Math.min(minB,c.b);maxR=Math.max(maxR,c.r);maxG=Math.max(maxG,c.g);maxB=Math.max(maxB,c.b);total+=c.n;}
   const ranges={r:maxR-minR,g:maxG-minG,b:maxB-minB};
   const channel=Object.keys(ranges).sort((a,b)=>ranges[b]-ranges[a])[0];
   const priority=ranges[channel]*Math.sqrt(total);
   if(priority>score){score=priority;best=i;axis=channel;}
  }
  if(best<0||score<=0)break;
  const box=boxes[best].slice().sort((a,b)=>a[axis]-b[axis]);
  const total=box.reduce((s,c)=>s+c.n,0);
  let countLeft=0,split=0;
  for(let i=0;i<box.length-1;i++){countLeft+=box[i].n;split=i+1;if(countLeft>=total/2)break;}
  if(!split||split>=box.length)break;
  boxes.splice(best,1,box.slice(0,split),box.slice(split));
 }
 return boxes.map(box=>{
  let n=0,r=0,g=0,b=0;
  for(const c of box){n+=c.n;r+=c.r*c.n;g+=c.g*c.n;b+=c.b*c.n;}
  return [clamp(r/n),clamp(g/n),clamp(b/n)];
 });
}
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export function pixelizeImageData(image,{colors=32,dither=false,alphaThreshold=128}={}){
 const {width,height,data}=image??{};
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>512*512||!data||data.length!==width*height*4)throw Error('待处理图片尺寸或 RGBA 数据不合法');
 if(!Number.isInteger(colors)||colors<2||colors>256)throw Error('颜色数必须为 2–256');
 if(!Number.isInteger(alphaThreshold)||alphaThreshold<0||alphaThreshold>255)throw Error('透明阈值必须为 0–255');
 const palette=buildPalette(data,colors,alphaThreshold);
 const out=new Uint8ClampedArray(data.length),cache=new Map();
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,alpha=data[i+3];
  if(alpha<alphaThreshold){out[i+3]=0;continue;}
  const delta=dither?(BAYER[(y%4)*4+x%4]-7.5)*2.5:0;
  const r=clamp(data[i]+delta),g=clamp(data[i+1]+delta),b=clamp(data[i+2]+delta);
  const key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);
  let idx=cache.get(key);
  if(idx===undefined){
   idx=0;let best=Infinity;
   for(let c=0;c<palette.length;c++){const score=dist(r,g,b,palette[c]);if(score<best){best=score;idx=c;}}
   cache.set(key,idx);
  }
  const color=palette[idx];if(color){out[i]=color[0];out[i+1]=color[1];out[i+2]=color[2];out[i+3]=255;}
 }
 return {width,height,data:out,palette};
}
// Periodic edge autocorrelation estimates pitch even when the input has been
// resized by a fractional factor. Flat / non-periodic images return no guess.
export function estimateGrid(image){
 const {width:w,height:h,data}=image??{};
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<8||h<8||!data||data.length!==w*h*4)throw Error('图片太小，无法估算网格');
 const edges=[new Float64Array(w),new Float64Array(h)];
 const step=Math.max(1,Math.floor(Math.max(w,h)/700));
 const diff=(a,b)=>{const aa=data[a+3]/255,ab=data[b+3]/255;return Math.abs(data[a]*aa-data[b]*ab)+Math.abs(data[a+1]*aa-data[b+1]*ab)+Math.abs(data[a+2]*aa-data[b+2]*ab)+255*Math.abs(aa-ab);};
 for(let y=0;y<h;y+=step)for(let x=1;x<w;x++)edges[0][x]+=diff((y*w+x)*4,(y*w+x-1)*4);
 for(let x=0;x<w;x+=step)for(let y=1;y<h;y++)edges[1][y]+=diff((y*w+x)*4,((y-1)*w+x)*4);
 const correlations=edges.map(e=>{const mean=e.reduce((a,b)=>a+b,0)/e.length;const centered=e.map(v=>v-mean);const energy=centered.reduce((a,b)=>a+b*b,0);const out=new Float64Array(65);if(!energy)return out;for(let p=2;p<out.length&&p<e.length/4;p++){let sum=0;for(let i=p;i<e.length;i++)sum+=centered[i]*centered[i-p];out[p]=sum/energy;}return out;});
 let best=0,pitch=0;
 for(let p=3;p<64&&p<Math.min(w,h)/4;p++){
  const score=Math.min(correlations[0][p],correlations[1][p]);
  if(score>best){best=score;pitch=p;}
 }
 if(best<0.09)return null;
 // Prefer a strong earlier peak over its integer multiples.
 for(let p=3;p<pitch;p++){const c=Math.min(correlations[0][p],correlations[1][p]);if(c>=best*0.7&&c>=Math.min(correlations[0][p-1],correlations[1][p-1])&&c>=Math.min(correlations[0][p+1],correlations[1][p+1])){pitch=p;best=c;break;}}
 // Parabolic peak interpolation recovers non-integer resizes without rounding the pitch.
 const score=p=>Math.min(correlations[0][p],correlations[1][p]);
 const left=score(pitch-1),right=score(pitch+1),denom=left-2*best+right;
 const refined=pitch+(denom?Math.max(-0.5,Math.min(0.5,0.5*(left-right)/denom)):0);
 function phase(e){
  // Search phase at quarter-source-pixel resolution; compare edge energy near each boundary.
  let bestPhase=0,bestEnergy=-1;
  for(let phase=0;phase<refined;phase+=0.25){let sum=0,n=0;for(let x=phase;x<e.length;x+=refined){const i=Math.round(x);if(i>0&&i<e.length-1){sum+=e[i-1]*0.25+e[i]*0.5+e[i+1]*0.25;n++;}}if(n&&sum/n>bestEnergy){bestEnergy=sum/n;bestPhase=phase;}}
  return bestPhase/refined;
 }
 return {pitch:refined,offsetX:phase(edges[0]),offsetY:phase(edges[1]),score:best};
}
// Vote on colours from the inset of each cell, keeping real source colours instead
// of mixing outline and background into a new grey fringe.
export function sampleCellColors(image,width,height,{offsetX=0,offsetY=0,alphaThreshold=128}={}){
 const {width:sw,height:sh,data}=image??{};
 if(!Number.isInteger(sw)||!Number.isInteger(sh)||sw<1||sh<1||!data||data.length!==sw*sh*4||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>512*512)throw Error('待采样图片数据不合法');
 const out=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const bins=new Map();let transparent=0;
  for(let sy=0;sy<5;sy++)for(let sx=0;sx<5;sx++){
   const px=Math.max(0,Math.min(sw-1,Math.floor((x+offsetX+0.2+sx*0.15)*sw/width)));
   const py=Math.max(0,Math.min(sh-1,Math.floor((y+offsetY+0.2+sy*0.15)*sh/height)));
   const i=(py*sw+px)*4;if(data[i+3]===0||data[i+3]<alphaThreshold){transparent++;continue;}
   const key=((data[i]>>4)<<8)|((data[i+1]>>4)<<4)|(data[i+2]>>4);
   let bin=bins.get(key);if(!bin){bin={n:0,r:0,g:0,b:0,a:0};bins.set(key,bin);}
   bin.n++;bin.r+=data[i];bin.g+=data[i+1];bin.b+=data[i+2];bin.a+=data[i+3];
  }
  if(transparent>12||!bins.size)continue;
  let best=null;for(const bin of bins.values())if(!best||bin.n>best.n)best=bin;
  const i=(y*width+x)*4;out[i]=best.r/best.n;out[i+1]=best.g/best.n;out[i+2]=best.b/best.n;out[i+3]=best.a/best.n;
 }
 return {width,height,data:out};
}
export function preserveImageData(image,{alphaThreshold=128}={}){
 const {width,height,data}=image??{};
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>512*512||!data||data.length!==width*height*4)throw Error('待处理图片尺寸或 RGBA 数据不合法');
 if(!Number.isInteger(alphaThreshold)||alphaThreshold<0||alphaThreshold>255)throw Error('透明阈值必须为 0–255');
 const out=new Uint8ClampedArray(data),colors=new Set();
 for(let i=0;i<out.length;i+=4){if(out[i+3]<alphaThreshold){out[i]=out[i+1]=out[i+2]=out[i+3]=0;}else{out[i+3]=255;colors.add((out[i]<<16)|(out[i+1]<<8)|out[i+2]);}}
 return {width,height,data:out,paletteSize:colors.size};
}
// Conservative cleanup: only remove tiny foreground islands surrounded by a
// uniform corner background. Connected artwork and interior highlights stay intact.
export function removeBackgroundSpecks(image){
 const {width:w,height:h,data}=image??{};
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<2||h<2||!data||data.length!==w*h*4)throw Error('图片数据不合法');
 const out=new Uint8ClampedArray(data),corners=[0,w-1,(h-1)*w,h*w-1].map(i=>i*4),bg=[...out.slice(0,4)];
 const same=(i)=>bg[3]===0?out[i+3]===0:out[i+3]===255&&Math.abs(out[i]-bg[0])<=16&&Math.abs(out[i+1]-bg[1])<=16&&Math.abs(out[i+2]-bg[2])<=16;
 if(!corners.every(same))return {...image,data:out,removedSpecks:0};
 const foreground=new Uint8Array(w*h),seen=new Uint8Array(w*h);
 for(let i=0;i<w*h;i++)foreground[i]=same(i*4)?0:1;
 let removedSpecks=0;
 for(let i=0;i<w*h;i++){
  if(!foreground[i]||seen[i])continue;
  const queue=[i],component=[];seen[i]=1;
  for(let n=0;n<queue.length;n++){
   const at=queue[n],x=at%w,y=Math.floor(at/w);component.push(at);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
    const next=ny*w+nx;if(foreground[next]&&!seen[next]){seen[next]=1;queue.push(next);}
   }
  }
  if(component.length<=2){for(const at of component)out.set(bg,at*4);removedSpecks+=component.length;}
 }
 return {...image,data:out,removedSpecks};
}
export function toLayeredProject(image,name='Pixelized Sprite'){
 const {width,height,data}=image??{};
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>64||height>64||!data||data.length!==width*height*4)throw Error('工作站工程要求宽高均为 8–64 像素');
 const symbols='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&*+-/:;=?@^_~';
 const palette={'.':'transparent'},codes=new Map(),rows=[];
 for(let y=0;y<height;y++){
  let row='';
  for(let x=0;x<width;x++){
   const i=(y*width+x)*4;
   if(data[i+3]<128){row+='.';continue;}
   const hex='#'+[data[i],data[i+1],data[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');
   if(!codes.has(hex)){
    if(codes.size>=31)throw Error('工作站当前最多支持 31 个实色，请将颜色数设为 31 以下');
    const symbol=symbols[codes.size];codes.set(hex,symbol);palette[symbol]=hex;
   }
   row+=codes.get(hex);
  }
  rows.push(row);
 }
 // Layer schema requires at least one real colour, even for a fully transparent sprite.
 if(codes.size===0)palette['0']='#000000';
 return {format:'pixelweave/layered-v1',name:String(name).trim().slice(0,64)||'Pixelized Sprite',width,height,fps:8,palette,layers:[{id:'pixelized',name:'图片像素化 / Base',visible:true,opacity:1,x:0,y:0,frames:[rows]}]};
}