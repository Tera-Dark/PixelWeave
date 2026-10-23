/**
 * PixelWeave Layered Pixel Format v1.
 * Entirely serializable and data-only. The LLM produces palette-indexed rows;
 * this engine never evaluates model-produced JS / HTML / expressions.
 */
export const LAYERED_FORMAT='pixelweave/layered-v1';
const hex=/^#[0-9a-f]{6}$/i;
const bounded=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const asciiSymbol=s=>typeof s==='string'&&s.length===1&&/^[\x21-\x7e]$/.test(s);
const clone=obj=>JSON.parse(JSON.stringify(obj));
export function validateLayered(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('作品必须为 JSON 对象');
 if(input.format!==LAYERED_FORMAT)throw Error('format 必须为 '+LAYERED_FORMAT);
 const {width:w,height:h}=input;
 if(!bounded(w,8,64)||!bounded(h,8,64))throw Error('画布宽高必须在 8–64 像素');
 const fps=input.fps??8;
 if(!bounded(fps,1,24))throw Error('fps 必须在 1–24');
 const name=typeof input.name==='string'?input.name.trim().slice(0,64):'';
 if(!name)throw Error('必须填写作品名称');
 const colors=input.palette;
 if(!colors||typeof colors!=='object'||Array.isArray(colors))throw Error('缺少 palette 色板');
 if(!Object.hasOwn(colors,'.')||colors['.']!=='transparent')throw Error('palette 的 "." 必须是 transparent');
 const keys=Object.keys(colors);
 if(keys.length<2||keys.length>32)throw Error('palette 应包含透明色与 1–31 个实际颜色');
 for(const [k,v] of Object.entries(colors))if(!asciiSymbol(k)||!(v==='transparent'||(typeof v==='string'&&hex.test(v))))throw Error('palette 键为单个 ASCII 字符，颜色为 #RRGGBB 或 transparent');
 if(!Array.isArray(input.layers)||input.layers.length<1||input.layers.length>12)throw Error('layers 必须有 1–12 个图层');
 let count=null,chars=0;
 const ids=new Set();
 const layers=input.layers.map((l,idx)=>{
  if(!l||typeof l!=='object'||Array.isArray(l))throw Error('图层 '+(idx+1)+' 格式错误');
  const id=String(l.id||'').trim();
  if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/.test(id)||ids.has(id))throw Error('图层 id 必须唯一，限英文、数字、短横线或下划线');
  ids.add(id);
  if(!Array.isArray(l.frames)||l.frames.length<1||l.frames.length>16)throw Error(id+': 必须提供 1–16 帧');
  if(count!==null&&count!==l.frames.length)throw Error(id+': 所有图层的帧数必须一致');
  count=l.frames.length;
  for(let f=0;f<l.frames.length;f++){
   const rows=l.frames[f];if(!Array.isArray(rows)||rows.length!==h)throw Error(id+': 第 '+(f+1)+' 帧行数不是 '+h);
   for(const row of rows){
    if(typeof row!=='string'||row.length!==w)throw Error(id+': 行宽必须精确为 '+w);
    for(let x=0;x<row.length;x++)if(!Object.hasOwn(colors,row[x]))throw Error(id+': 像素符号 '+row[x]+' 未在 palette 声明');
    chars+=row.length;
   }
  }
  const x=l.x??0,y=l.y??0,opacity=l.opacity??1;
  if(!bounded(x,-64,64)||!bounded(y,-64,64))throw Error(id+': 图层偏移仅允许 ±64');
  if(typeof opacity!=='number'||!Number.isFinite(opacity)||opacity<0||opacity>1)throw Error(id+': opacity 必须在 0–1');
  return {id,name:String(l.name||id).slice(0,40),visible:l.visible!==false,opacity,x,y,frames:l.frames.map(rows=>rows.slice())};
 });
 if(chars>900000)throw Error('资产数据超过像素限制');
 return {format:LAYERED_FORMAT,name,width:w,height:h,fps,palette:{...colors},layers};
}
export function createLayeredAsset(value){
 const data=validateLayered(value);
 return {id:'layered-'+Date.now()+'-'+Math.floor(Math.random()*9999),name:data.name,cn:'分层像素作品',desc:data.layers.length+' 层 / '+data.layers[0].frames.length+' 帧。所有图层独立编辑。',type:'layered',fps:data.fps,frames:data.layers[0].frames.length,category:'LAYERED',tone:'health',color:'#eea6a4',data};
}
export function metrics(asset){
 const d=asset?.data||asset,occupied=[];
 if(!d?.layers)return null;
 for(let f=0;f<d.layers[0].frames.length;f++){
  const composite=new Array(d.width*d.height).fill('.');
  for(const l of d.layers){
   if(l.visible===false||l.opacity===0)continue;
   for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){
    const symbol=l.frames[f][y][x];
    if(d.palette[symbol]!=='transparent'){
     const xx=x+l.x,yy=y+l.y;
     if(xx>=0&&xx<d.width&&yy>=0&&yy<d.height)composite[yy*d.width+xx]=symbol;
    }
   }
  }occupied.push(composite);
 }
 const diff=(a,b)=>a.reduce((n,p,i)=>n+(p!==b[i]?1:0),0);
 const total=d.width*d.height;
 const changes=occupied.slice(1).map((p,i)=>diff(occupied[i],p)/total);
 return {layers:d.layers.length,frames:occupied.length,colors:Object.keys(d.palette).length-1,coverage:Math.round(occupied[0].filter(p=>p!=='.').length/total*100),meanMotion:Math.round((changes.reduce((a,b)=>a+b,0)/Math.max(1,changes.length))*100),seam:Math.round(diff(occupied[0],occupied.at(-1))/total*100)};
}
export function renderLayered(canvas,data,frame=0,soloLayer=null){
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const w=data.width,h=data.height,s=Math.max(1,Math.floor(Math.min(canvas.width/w,canvas.height/h)));
 const ox=Math.floor((canvas.width-w*s)/2),oy=Math.floor((canvas.height-h*s)/2);
 ctx.clearRect(0,0,canvas.width,canvas.height);
 for(const layer of data.layers){
  if(layer.visible===false||(soloLayer&&layer.id!==soloLayer))continue;
  ctx.globalAlpha=layer.opacity;
  const rows=layer.frames[((frame%layer.frames.length)+layer.frames.length)%layer.frames.length];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const color=data.palette[rows[y][x]];
   if(color==='transparent'||!color)continue;
   const px=x+layer.x,py=y+layer.y;
   if(px<0||px>=w||py<0||py>=h)continue;
   ctx.fillStyle=color;ctx.fillRect(ox+px*s,oy+py*s,s,s);
  }
 }
 ctx.globalAlpha=1;
}
export function pixelCoordinates(canvas,data,clientX,clientY){
 const rect=canvas.getBoundingClientRect();
 const s=Math.max(1,Math.floor(Math.min(canvas.width/data.width,canvas.height/data.height)));
 const ox=Math.floor((canvas.width-data.width*s)/2),oy=Math.floor((canvas.height-data.height*s)/2);
 const cx=(clientX-rect.left)/rect.width*canvas.width,cy=(clientY-rect.top)/rect.height*canvas.height;
 const x=Math.floor((cx-ox)/s),y=Math.floor((cy-oy)/s);
 return x<0||y<0||x>=data.width||y>=data.height?null:{x,y};
}
export function paintLayerPixel(data,layerId,frame,x,y,symbol){
 const layer=data.layers.find(l=>l.id===layerId);
 if(!layer||!Object.hasOwn(data.palette,symbol))return false;
 const px=x-layer.x,py=y-layer.y;
 if(!bounded(px,0,data.width-1)||!bounded(py,0,data.height-1))return false;
 const row=layer.frames[frame]?.[py];if(!row)return false;
 layer.frames[frame][py]=row.slice(0,px)+symbol+row.slice(px+1);return true;
}
export function addEmptyLayer(data,name='新图层'){
 if(data.layers.length>=12)throw Error('最多 12 层');
 let id='layer'+(data.layers.length+1);
 while(data.layers.some(l=>l.id===id))id='layer'+Math.floor(Math.random()*100000);
 const blank='.'.repeat(data.width);
 const layer={id,name,visible:true,opacity:1,x:0,y:0,frames:Array.from({length:data.layers[0].frames.length},()=>Array.from({length:data.height},()=>blank))};
 data.layers.push(layer);return layer;
}
export function reorderLayer(data,id,dir){
 const i=data.layers.findIndex(l=>l.id===id),j=i+dir;
 if(i<0||j<0||j>=data.layers.length)return false;
 [data.layers[i],data.layers[j]]=[data.layers[j],data.layers[i]];return true;
}
export function duplicateFrame(data,index){
 const count=data.layers[0]?.frames.length;
 if(count>=16)throw Error('最多 16 帧');
 if(!bounded(index,0,count-1))throw Error('无效帧序号');
 for(const layer of data.layers)layer.frames.splice(index+1,0,[...layer.frames[index]]);
}
export function deleteFrame(data,index){
 if(data.layers[0].frames.length<=1)throw Error('至少保留 1 帧');
 for(const layer of data.layers)layer.frames.splice(index,1);
}
export function createBlankLayered(name='Untitled Sprite',width=24,height=24,frames=4){
 const palette={'.':'transparent',K:'#231d31',D:'#65556f',R:'#c64d64',H:'#f0ad99',W:'#f5e4d3'};
 const blank='.'.repeat(width);
 return validateLayered({format:LAYERED_FORMAT,name,width,height,fps:8,palette,layers:[{id:'outline',name:'轮廓 / silhouette',frames:Array.from({length:frames},()=>Array.from({length:height},()=>blank)),visible:true}]});
}
/** Built-in layered demonstration is code-authored and is not advertised as LLM art. */
function makeSample(){
 const w=32,h=32,frames=10;
 const palette={'.':'transparent',K:'#251a30',D:'#564052',G:'#806775',S:'#ad8995',W:'#ffe8d7',P:'#f9b5a2',T:'#b98561',A:'#dfba86',X:'#78515f',B:'#792842',R:'#be3150',C:'#e65168',H:'#ff8990',F:'#ffc3ad'};
 const ids=['shadow','glass','liquid','bubbles','shine','cork','spark'];
 const layers=ids.map(id=>({id,name:({shadow:'落影 / Shadow',glass:'玻璃与轮廓 / Glass',liquid:'药液 / Liquid',bubbles:'气泡 / Bubbles',shine:'镜面反光 / Reflections',cork:'瓶塞与蜡封 / Cork',spark:'环境光点 / Glints'})[id],visible:true,opacity:1,x:0,y:0,frames:[]}));
 function createGrid(){return Array.from({length:h},()=>Array(w).fill('.'));}
 function point(g,x,y,s){x=Math.round(x);y=Math.round(y);if(x>=0&&x<w&&y>=0&&y<h)g[y][x]=s;}
 function rect(g,x,y,ww,hh,s){for(let yy=y;yy<y+hh;yy++)for(let xx=x;xx<x+ww;xx++)point(g,xx,yy,s);}
 function line(g,x0,y0,x1,y1,s){let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy;while(true){point(g,x0,y0,s);if(x0===x1&&y0===y1)break;let e=2*err;if(e>-dy){err-=dy;x0+=sx;}if(e<dx){err+=dx;y0+=sy;}}}
 function polygon(g,points,s){for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const xi=points[i][0],yi=points[i][1],xj=points[j][0],yj=points[j][1];if(((yi>y+.5)!==(yj>y+.5))&&(x+.5<(xj-xi)*(y+.5-yi)/(yj-yi)+xi))inside=!inside;}
  if(inside)point(g,x,y,s);
 }for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];line(g,a[0],a[1],b[0],b[1],s);}}
 function insideBody(x,y){return y>=13&&y<=26&&x>=(y<16?12-(y-13):8)&&x<=(y<16?19+(y-13):23);}
 for(let f=0;f<frames;f++){
  const g=Object.fromEntries(ids.map(id=>[id,createGrid()]));
  // 1: grounded soft shadow, geometric and intentionally not smooth/blurred
  rect(g.shadow,9,29,14,1,'K');rect(g.shadow,12,30,8,1,'D');
  // 2: sculptural outline and glass border
  const outer=[[13,8],[19,8],[19,11],[23,14],[25,17],[25,25],[23,28],[9,28],[7,25],[7,17],[9,14],[13,11]];
  polygon(g.glass,outer,'K');
  polygon(g.glass,[[13,10],[19,10],[19,12],[22,15],[23,18],[23,24],[21,26],[11,26],[9,24],[9,18],[10,15],[13,12]],'G');
  rect(g.glass,9,19,1,5,'X');rect(g.glass,22,19,1,5,'S');
  // 3: dynamic liquid with 1-pixel surface wave; masked within silhouette
  const phase=f/frames*Math.PI*2,base=18+Math.round(Math.sin(phase)*1);
  for(let y=base;y<=26;y++)for(let x=9;x<=23;x++){
   if(!insideBody(x,y))continue;
   const swell=Math.round(Math.sin(phase+x*.43));
   if(y<base+swell)continue;
   const shade=y>24?'B':x<11?'B':x>21?'R':y>21?'R':'C';
   point(g.liquid,x,y,shade);
  }
  for(let x=11;x<=21;x++){const y=base+Math.round(Math.sin(phase+x*.43));if(insideBody(x,y))point(g.liquid,x,y,'H');}
  rect(g.liquid,12,22,2,3,'H');rect(g.liquid,14,24,4,1,'C');
  // 4: actual per-frame bubbles traveling upward in clipped glass
  for(let b=0;b<3;b++){
   const x=12+((b*4+1)%9),y=26-((f*(b%2+1)+b*4)%10);
   if(insideBody(x,y)&&y>=base+2){point(g.bubbles,x,y,'F');if(b!==2)point(g.bubbles,x+1,y,'H');}
  }
  // 5: detailed perimeter and glass sheen
  rect(g.shine,10,17,1,7,'W');rect(g.shine,11,15,2,2,'W');rect(g.shine,12,13,2,1,'P');
  rect(g.shine,21,17,1,7,'S');rect(g.shine,20,25,2,1,'W');rect(g.shine,12,26,9,1,'P');
  rect(g.shine,14,11,1,4,'W');rect(g.shine,18,11,1,3,'S');
  point(g.shine,12,20,'F');point(g.shine,12,21,'F');
  // 6: stopper and wax band, stepped pixel outline
  rect(g.cork,12,5,8,6,'K');rect(g.cork,13,6,6,4,'T');rect(g.cork,13,6,2,3,'A');rect(g.cork,17,7,2,3,'X');
  rect(g.cork,12,10,8,1,'D');rect(g.cork,11,11,10,2,'K');rect(g.cork,12,11,8,1,'S');
  rect(g.cork,14,12,4,2,'B');rect(g.cork,15,12,2,1,'R');
  // 7: gentle ambient twinkles
  if(f%5<3){point(g.spark,26,12,'W');point(g.spark,25,13,'P');point(g.spark,27,13,'P');point(g.spark,26,14,'P');}
  point(g.spark,5,(17+f*2)%27,'H');point(g.spark,27,(20+f)%28,'P');
  ids.forEach((id,i)=>layers[i].frames.push(g[id].map(row=>row.join(''))));
 }
 return validateLayered({format:LAYERED_FORMAT,name:'Crimson Atelier',width:w,height:h,fps:10,palette,layers});
}
export const LAYERED_SAMPLE=makeSample();
