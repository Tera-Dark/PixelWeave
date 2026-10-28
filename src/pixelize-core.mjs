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
export function exportSize(width,height,scale){
 const n=Number(scale);
 if(!Number.isSafeInteger(n)||n<1||n>128)throw Error('导出倍率必须为 1–128 的整数');
 const w=width*n,h=height*n;
 if(w>16384||h>16384||w*h>48000000)throw Error('放大后画布过大，请降低倍率或原生尺寸');
 return {width:w,height:h,scale:n};
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