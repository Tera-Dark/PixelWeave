/**
 * PixelWeave Semantic Program v1: LLM writes a compact, bounded drawing plan.
 * No model-provided code is executed; only a fixed whitelist of integer raster ops.
 * Every result is compiled into the existing editable layered-v1 format.
 */
import {LAYERED_FORMAT,validateLayered,metrics} from './layered.js';

export const SEMANTIC_FORMAT='pixelweave/semantic-v1';
const identifier=/^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const color=/^#[0-9a-f]{6}$/i;
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
function requireInt(n,min,max,label){
 if(!integer(n,min,max))throw Error(label+' 必须是 '+min+'–'+max+' 的整数');
 return n;
}
function requireObject(x,label){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error(label+' 必须是对象');
 return x;
}
function grid(w,h){return Array.from({length:h},()=>Array(w).fill('.'));}
const rows=g=>g.map(row=>row.join(''));
function drawOp(g,op,w,h,palette,label){
 requireObject(op,label);
 if(!['pixel','rect','line','ellipse','polygon'].includes(op.op))throw Error(label+': 未授权绘图指令 '+String(op.op));
 if(typeof op.color!=='string'||!Object.hasOwn(palette,op.color))throw Error(label+': 未定义的色板符号');
 const put=(x,y)=>{if(x>=0&&x<w&&y>=0&&y<h)g[y][x]=op.color;};
 const xy=(x,y)=>{requireInt(x,0,w-1,label+'.x');requireInt(y,0,h-1,label+'.y');};
 if(op.op==='pixel'){xy(op.x,op.y);put(op.x,op.y);return;}
 if(op.op==='rect'||op.op==='ellipse'){
  xy(op.x,op.y);requireInt(op.w,1,w,label+'.w');requireInt(op.h,1,h,label+'.h');
  if(op.x+op.w>w||op.y+op.h>h)throw Error(label+': 图形超出画布');
  if(op.op==='rect'){
   for(let y=op.y;y<op.y+op.h;y++)for(let x=op.x;x<op.x+op.w;x++){
    if(op.fill===false&&x!==op.x&&x!==op.x+op.w-1&&y!==op.y&&y!==op.y+op.h-1)continue;
    put(x,y);
   }
  }else{
   // Integer cell-center sampling, no antialiasing or floating colors.
   const cx=op.x+op.w/2,cy=op.y+op.h/2,rx=op.w/2,ry=op.h/2;
   for(let y=op.y;y<op.y+op.h;y++)for(let x=op.x;x<op.x+op.w;x++){
    const v=((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2;
    if(v<=1&&((op.fill!==false)||Math.abs(v-1)<=Math.max(1/rx,1/ry)))put(x,y);
   }
  }
  return;
 }
 if(op.op==='line'){
  xy(op.x,op.y);xy(op.x2,op.y2);
  let x=op.x,y=op.y,dx=Math.abs(op.x2-x),dy=Math.abs(op.y2-y),sx=x<op.x2?1:-1,sy=y<op.y2?1:-1,err=dx-dy;
  for(;;){put(x,y);if(x===op.x2&&y===op.y2)break;const e=2*err;if(e>-dy){err-=dy;x+=sx;}if(e<dx){err+=dx;y+=sy;}}
  return;
 }
 if(!Array.isArray(op.points)||op.points.length<3||op.points.length>24)throw Error(label+': polygon 顶点必须是 3–24 个');
 for(const p of op.points){if(!Array.isArray(p)||p.length!==2)throw Error(label+': 顶点格式非法');xy(p[0],p[1]);}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const py=y+.5,px=x+.5;let inside=false;
  for(let i=0,j=op.points.length-1;i<op.points.length;j=i++){
   const [xi,yi]=op.points[i],[xj,yj]=op.points[j];
   if((yi>py)!==(yj>py)&&px<(xj-xi)*(py-yi)/(yj-yi)+xi)inside=!inside;
  }
  if(inside)put(x,y);
 }
}
function rasterOps(target,ops,w,h,palette,label,limit){
 if(!Array.isArray(ops)||ops.length>limit)throw Error(label+': 绘图指令不得超过 '+limit+' 条');
 for(let i=0;i<ops.length;i++)drawOp(target,ops[i],w,h,palette,label+'['+i+']');
}
function shifted(base,dx,dy,w,h){
 const next=grid(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(base[y][x]!=='.'&&x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)next[y+dy][x+dx]=base[y][x];
 return next;
}
function validatePalette(p){
 requireObject(p,'palette');
 if(p['.']!=='transparent'||Object.keys(p).length<2||Object.keys(p).length>16)throw Error('色板必须有透明色和 1–15 个实体颜色');
 for(const [k,v] of Object.entries(p)){
  if(typeof k!=='string'||k.length!==1||!/^[!-~]$/.test(k)|| (k==='.'?v!=='transparent':!color.test(v)))throw Error('色板符号/HEX 值不合法: '+k);
 }
}
export function compileSemanticProgram(source){
 const p=requireObject(source,'semantic program');
 if(p.format!==SEMANTIC_FORMAT)throw Error('semantic program 格式错误');
 const w=requireInt(p.width,8,64,'width'),h=requireInt(p.height,8,64,'height');
 const count=requireInt(p.frames,1,16,'frames'),fps=requireInt(p.fps,1,24,'fps');
 const name=String(p.name||'').trim();
 if(!name||name.length>64)throw Error('作品名必须为 1–64 个字符');
 validatePalette(p.palette);
 if(!Array.isArray(p.layers)||p.layers.length<1||p.layers.length>10)throw Error('需要 1–10 个有语义职责的图层');
 const ids=new Set(),all=[],issues=[];
 for(const [i,raw] of p.layers.entries()){
  const l=requireObject(raw,'layers['+i+']'),label='layer '+String(l.id||i);
  if(typeof l.id!=='string'||!identifier.test(l.id)||ids.has(l.id))throw Error(label+': 图层 ID 无效或重复');
  ids.add(l.id);
  if(!['static','animated'].includes(l.kind))throw Error(label+': kind 必须为 static 或 animated');
  if(!Array.isArray(l.base)||l.base.length>96)throw Error(label+': base 指令必须为数组且不超过 96 条');
  const base=grid(w,h);rasterOps(base,l.base,w,h,p.palette,label+'.base',96);
  if(l.clipTo!==undefined&&l.clipTo!==null&&!all.some(a=>a.id===l.clipTo))throw Error(label+': clipTo 只能引用先前已经绘制的图层');
  let motions;
  if(l.kind==='static'){
   if(l.motion!==undefined)throw Error(label+': 静态图层不允许 motion，避免轮廓意外抖动');
   motions=Array.from({length:count},()=>({dx:0,dy:0,ops:[]}));
  }else{
   if(!Array.isArray(l.motion)||l.motion.length!==count)throw Error(label+': 动态图层必须提供恰好 '+count+' 个 motion');
   motions=l.motion;
  }
  const frames=[];
  for(const [f,m] of motions.entries()){
   requireObject(m,label+'.motion['+f+']');
   const dx=requireInt(m.dx??0,-8,8,label+'.dx'),dy=requireInt(m.dy??0,-8,8,label+'.dy');
   const g=shifted(base,dx,dy,w,h);
   rasterOps(g,m.ops??[],w,h,p.palette,label+'.motion['+f+'].ops',48);
   if(l.clipTo){
    const mask=all.find(a=>a.id===l.clipTo).frames[f];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y][x]==='.')g[y][x]='.';
   }
   frames.push(rows(g));
  }
  const footprint=frames.reduce((n,frame)=>n+frame.join('').replace(/\./g,'').length,0);
  if(footprint===0)throw Error(label+': 图层完全空白，请绘制真实像素');
  if(l.kind==='animated'&&count>1&&frames.every(f=>JSON.stringify(f)===JSON.stringify(frames[0])))throw Error(label+': 动态图层没有真正的帧间变化');
  if(footprint>count*w*h*.9)issues.push({layerId:l.id,code:'HEAVY_COVERAGE',message:'图层覆盖率过高，请人工检查负空间'});
  all.push({id:l.id,name:String(l.name||l.id).slice(0,40),visible:true,opacity:1,x:0,y:0,frames});
 }
 const asset=validateLayered({format:LAYERED_FORMAT,name,width:w,height:h,fps,palette:p.palette,layers:all});
 const stat=metrics(asset);
 if(stat.meanMotion===0&&count>1)issues.push({code:'STATIC_COMPOSITE',message:'合成动画未出现变化，可能被上层遮挡'});
 return {asset,metrics:stat,issues};
}
export function makeSemanticPrompt(brief){
 const idea=String(brief||'').trim().slice(0,500)||'一盏微微摇曳的地牢灯笼';
 return [
  'You are a professional pixel-art director and integer-raster drawing programmer. Use ONLY text, no image model or source image. Produce one JSON object, never code/markdown.',
  'BRIEF: '+idea,
  'Return format "pixelweave/semantic-v1", name, width:24, height:24, fps:8, frames:4, palette, layers.',
  'Palette is {".":"transparent","K":"#231d31","R":"#b94760",...} with up to 15 visible colors. Every color in drawings is a palette symbol.',
  'Each layer: {id, name, kind:"static"|"animated", base:[drawing ops], clipTo:optional previous layer ID, motion:only for animated layers}.',
  'Drawing ops whitelist: {"op":"pixel","x":5,"y":5,"color":"K"}; {"op":"rect","x":2,"y":3,"w":9,"h":5,"color":"K","fill":true}; {"op":"line","x":1,"y":1,"x2":5,"y2":9,"color":"R"}; {"op":"ellipse","x":2,"y":2,"w":8,"h":6,"color":"R","fill":true}; {"op":"polygon","points":[[3,3],[12,4],[9,14]],"color":"K"}.',
  'For EVERY animated layer specify exactly four motion entries: {"dx":0,"dy":0,"ops":[]}. The base is shifted by dx/dy, then ops overdraw/erase with palette ".". Static layers OMIT motion and are copied bit-for-bit to all frames.',
  'Keep shapes inside 24x24, design the readable silhouette FIRST, then grouped materials, a consistent light direction, and semantic movement of just the movable parts. Clip interior materials with clipTo when sensible. Limit to 3–6 purpose-specific layers and 6–12 colors; avoid random single-pixel noise.',
  'Stage your intent internally: (1) subject silhouette, (2) negative space, (3) material/lighting, (4) stable anchors, (5) movement, (6) 4-frame seamless loop. Final output must be a SINGLE COMPLETE JSON object ready for compilation.',
  'No explanation or markdown.'
 ].join('\n\n');
}
