// PixelWeave core — deterministic code-generated pixel art, no diffusion.
export const SIZE = 96;
export const DEMOS = [
  {id:'health', name:'Scarlet Remedy', cn:'生命药剂', desc:'一瓶装着生命魔力的红色药剂。液面、泡沫和玻璃高光随时间变化。', type:'程序化动画',fps:8,frames:12,category:'POTION',tone:'health',color:'#ed747d'},
  {id:'mana',name:'Moonwater Elixir',cn:'月光法力瓶',desc:'冷蓝色法力缓缓起伏，微小的星芒漂浮在玻璃中。',type:'程序化动画',fps:8,frames:12,category:'POTION',tone:'mana',color:'#7fc7ef'},
  {id:'lantern',name:'Keeper’s Light',cn:'守夜人提灯',desc:'黄铜提灯和跳动的烛火，在静夜里投出温暖微光。',type:'程序化动画',fps:8,frames:12,category:'LIGHT',tone:'lantern',color:'#f7c77d'},
  {id:'crystal',name:'Astral Shard',cn:'星界结晶',desc:'缓缓悬浮的紫晶，内部光斑沿着切面流转。',type:'程序化动画',fps:8,frames:12,category:'MAGIC',tone:'crystal',color:'#c4aaf0'}
];
const P=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const S=(c,x,y,w,h,color)=>{c.strokeStyle=color;c.lineWidth=1;c.strokeRect(Math.round(x)+.5,Math.round(y)+.5,Math.round(w)-1,Math.round(h)-1);};
const L=(c,points,color)=>{c.fillStyle=color;c.beginPath();points.forEach((a,i)=>i?c.lineTo(Math.round(a[0]),Math.round(a[1])):c.moveTo(Math.round(a[0]),Math.round(a[1])));c.closePath();c.fill();};
const mod=(n,m)=>(n%m+m)%m;
function spark(c,x,y,color,s=1){P(c,x-2*s,y,s*5,s,color);P(c,x,y-2*s,s,s*5,color);}
function shine(c,x,y,color){P(c,x,y,2,2,color);P(c,x-2,y+2,2,2,color);P(c,x+2,y-2,2,2,color);}
function shadow(c){P(c,25,83,46,3,'#090d1c45');P(c,32,86,32,2,'#090d1c25');}
function bottle(c,frame,blue){
 const p=blue?{edge:'#18283e',rim:'#79b8cb',glass:'#42667f',wall:'#5a89a8',liquid:'#2485ca',mid:'#3ca7e6',hi:'#83dbff',dark:'#136197',glint:'#ddf5ff',cork:'#b3c2da',shade:'#687a9b'}:
 {edge:'#291b34',rim:'#c6a2b2',glass:'#725969',wall:'#916f79',liquid:'#ba344f',mid:'#e64c62',hi:'#ff8f89',dark:'#8a2346',glint:'#ffe3d7',cork:'#cd9b78',shade:'#76576a'};
 const q=frame/12*Math.PI*2,wave=Math.round(Math.sin(q)*2),bob=Math.round(Math.sin(q)*1);
 shadow(c);
 // drifting embers outside flask
 for(let i=0;i<4;i++){let x=21+(i*19)%58,y=27+mod(i*17-frame*2,47);P(c,x,y,2,2,i%2?p.hi:p.glint);}
 // Glass silhouette, carefully stepped at shoulders
 L(c,[[38,14],[58,14],[61,18],[61,27],[59,31],[67,35],[72,41],[73,67],[69,76],[63,80],[33,80],[27,76],[23,67],[24,41],[29,35],[37,31],[35,27],[35,18]],p.edge);
 L(c,[[39,17],[57,17],[58,26],[56,32],[64,37],[69,42],[70,65],[66,74],[61,77],[35,77],[30,74],[27,65],[28,42],[32,37],[40,32]],p.rim);
 L(c,[[40,20],[56,20],[55,32],[63,39],[66,43],[67,64],[64,72],[60,74],[36,74],[32,71],[30,64],[31,43],[34,39],[41,32]],p.glass);
 // Glass catches at the top and side
 P(c,31,42,4,19,p.wall);P(c,32,39,5,4,p.wall);P(c,64,46,3,18,p.wall);
 // clip liquid inside the flask so the sloshing never escapes bottle
 c.save();c.beginPath();[[31,43],[34,39],[41,33],[55,33],[62,39],[65,43],[66,63],[62,72],[58,74],[38,74],[34,72],[30,63]].forEach((a,i)=>i?c.lineTo(a[0],a[1]):c.moveTo(a[0],a[1]));c.closePath();c.clip();
 let y=48+wave;
 P(c,28,y,40,32,p.dark);P(c,29,y+3,39,32,p.liquid);P(c,35,y+8,27,23,p.mid);P(c,40,y+15,19,11,p.liquid);
 for(let x=30;x<67;x+=4){const yy=y+Math.round(Math.sin(q+x*.3)*1.7);P(c,x,yy,4,2,p.hi);}
 P(c,38,y+6,4,14,p.hi);P(c,42,y+10,3,4,p.mid);P(c,56,y+17,5,10,p.dark);
 for(let i=0;i<5;i++){let bx=35+(i*7)%26,by=mod(64+i*11-frame*(i%3+1),23)+y-6;P(c,bx,by,2+(i%2),2+(i%2),i%2?p.hi:p.glint);}
 c.restore();
 // decisive glass highlights
 P(c,29,44,3,16,p.glint);P(c,32,40,3,4,p.glint);P(c,34,37,3,3,p.glint);P(c,34,65,2,5,p.rim);P(c,64,42,2,14,p.glint);P(c,61,66,3,5,p.rim);
 P(c,39,27,3,8,p.glint);P(c,42,24,3,2,p.rim);P(c,55,24,2,8,p.wall);
 // Neck band and cork
 P(c,36,17,24,4,p.edge);P(c,38,18,20,2,p.rim);
 L(c,[[38,11],[58,11],[60,13],[60,21],[57,24],[39,24],[36,21],[36,13]],p.edge);
 P(c,39,13,18,8,p.cork);P(c,38,17,20,3,p.cork);P(c,41,14,3,6,'#ffead299');P(c,52,14,4,7,p.shade);P(c,38,21,20,2,p.shade);
 P(c,35,22,26,3,p.edge);P(c,39,23,19,2,p.rim);P(c,42,10,13,2,p.shade);
 // Wax seal
 if(!blue){P(c,44,21,8,4,'#983f4e');P(c,46,21,3,3,'#e79780');}
 else{P(c,44,21,8,4,'#4e71a4');P(c,47,21,2,3,'#e0f3ff');}
 // glass base
 P(c,37,76,23,2,p.glint);P(c,33,74,4,2,p.wall);
 if(frame%6<3)spark(c,75,28,p.glint,1);
}
function lantern(c,frame){
 const q=frame/12*Math.PI*2,offset=Math.round(Math.sin(q)*2);
 shadow(c);
 // glow behind lamp
 for(let i=5;i>=1;i--)P(c,28-i,27-i,40+i*2,48+i*2,'#ffc87d0b');
 // handle, metallic rectangular arch
 L(c,[[40,13],[43,9],[53,9],[57,13],[57,22],[53,22],[53,15],[51,13],[45,13],[43,16],[43,22],[39,22]],'#392b2c');
 P(c,44,10,9,2,'#d7a877');P(c,41,15,3,9,'#986d52');P(c,54,15,3,8,'#986d52');
 // roof, hood
 L(c,[[40,22],[56,22],[65,29],[65,33],[31,33],[31,29]],'#382b35');
 L(c,[[41,23],[55,23],[61,28],[35,28]],'#b28b64');P(c,35,29,27,2,'#ecc38d');P(c,30,33,36,3,'#342a31');
 // outer frame
 P(c,32,36,5,36,'#3b2d34');P(c,60,36,5,36,'#3b2d34');P(c,36,35,24,35,'#9a714f');
 P(c,37,36,22,32,'#655047');P(c,40,38,16,29,'#a7794e');
 // inner fire and amber glass
 P(c,39,39,18,26,'#a86b46');P(c,40,42,16,22,'#e99d4c');P(c,43,44,10,18,'#f7c56e');
 // flame silhouette changes every frame
 L(c,[[48+offset,39],[51+offset,46],[53,51],[52,57],[49,61],[44,58],[43,52],[46,45]],'#ffb557');
 L(c,[[48+offset,46],[50,51],[50,56],[47,58],[45,54]],'#ffef9d');
 P(c,44,57,9,3,'#8d4b30');P(c,47,54,3,5,'#fff4b9');
 // pane reflections
 P(c,39,39,2,24,'#f9d897');P(c,55,40,2,20,'#f3c27c');P(c,36,39,2,8,'#bb8a5c');
 // architectural dividers
 P(c,33,53,31,3,'#40303b');P(c,35,53,26,1,'#dbab77');P(c,45,33,3,37,'#6b4d46');P(c,46,37,1,15,'#e2a766');
 // foot
 L(c,[[31,69],[65,69],[67,75],[62,79],[34,79],[29,75]],'#352b32');
 P(c,34,70,28,3,'#b58b61');P(c,36,75,24,2,'#8f6550');P(c,39,78,18,2,'#d2ab7e');
 P(c,29,31,39,3,'#6f5143');P(c,38,27,20,2,'#f6d7a8');
 for(let i=0;i<4;i++){let x=27+i*13+(i%2?7:0),y=mod(34+i*15-frame*2,35)+21;P(c,x,y,2,2,i%2?'#f0ce81':'#b78d57');}
 if(frame%6<3)spark(c,73,32,'#f5d69d');
}
function crystal(c,frame){
 const q=frame/12*Math.PI*2,bob=Math.round(Math.sin(q)*3);
 P(c,27,84,42,2,'#0b15254f');P(c,34,86,28,2,'#0b152533');
 c.save();c.translate(0,bob);
 // vaporous sparkle trail
 for(let i=0;i<5;i++){let x=20+(i*15)%61,y=20+mod(i*12-frame,48);P(c,x,y,2,2,i%2?'#ceb7f1':'#6eaacb');}
 L(c,[[48,9],[65,26],[72,53],[49,77],[29,54],[32,27]],'#302c50');
 L(c,[[48,13],[62,29],[67,52],[49,71],[34,52],[36,29]],'#7c6ca9');
 L(c,[[48,13],[48,69],[36,52],[36,29]],'#9c8bc5');
 L(c,[[48,13],[61,29],[48,35]],'#dfc7ee');L(c,[[61,29],[67,52],[48,69],[48,35]],'#736bad');
 L(c,[[36,29],[48,35],[34,52]],'#b6a3d8');L(c,[[48,35],[48,69],[34,52]],'#8c78bd');
 L(c,[[48,35],[61,29],[67,52]],'#534d94');L(c,[[48,35],[67,52],[48,69]],'#625aa6');
 P(c,44,20,3,13,'#eedafa');P(c,40,31,3,7,'#e0c2f8');
 P(c,52,40,4,5,'#b2a5e8');P(c,53,45,2,7,'#d5c7fa');P(c,45,58,2,7,'#bdb2de');
 const b=mod(frame,12);
 P(c,45+(b%3),35+(b%5)*3,3,3,'#faf0ff');P(c,49,24,2,3,'#fbf5ff');P(c,60,51,2,4,'#ad9edc');
 c.restore();
 if(frame%6<4)spark(c,72,24,'#decaff',1);
 if(frame%4<2)spark(c,22,57,'#c6cbfa',1);
}
function matrix(c,asset,frame){
 const rows=asset.data.frames[mod(frame,asset.data.frames.length)];
 const w=asset.data.width,h=asset.data.height,scale=Math.max(1,Math.floor(72/Math.max(w,h))),ox=Math.floor((96-w*scale)/2),oy=Math.floor((96-h*scale)/2);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const char=rows[y][x],col=asset.data.palette[char];if(col&&col!=='transparent'&&col!=='#00000000')P(c,ox+x*scale,oy+y*scale,scale,scale,col);}
}
export function renderAsset(canvas,asset,frame=0,patches=null){
 if(!canvas)return;
 const c=canvas.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=false;c.clearRect(0,0,canvas.width,canvas.height);c.save();c.scale(canvas.width/SIZE,canvas.height/SIZE);
 if(asset.type==='matrix')matrix(c,asset,frame);
 else if(asset.id==='health')bottle(c,frame,false);
 else if(asset.id==='mana')bottle(c,frame,true);
 else if(asset.id==='lantern')lantern(c,frame);
 else if(asset.id==='crystal')crystal(c,frame);
 // painted overrides are kept separately for each frame, at the canonical 96x96 resolution
 const pixels=patches&&patches[String(frame)];
 if(pixels)for(const key of Object.keys(pixels)){const color=pixels[key],xy=key.split(',').map(Number);if(color&&xy.length===2&&xy.every(Number.isFinite)&&xy[0]>=0&&xy[0]<96&&xy[1]>=0&&xy[1]<96)P(c,xy[0],xy[1],1,1,color);}
 c.restore();
}
export function validateMatrix(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('资产必须是 JSON 对象');
 const name=String(input.name||'LLM Pixel Asset').slice(0,65);
 const width=Number(input.width),height=Number(input.height);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<4||height<4||width>64||height>64)throw Error('width / height 必须是 4–64 的整数');
 const palette=input.palette;
 if(!palette||typeof palette!=='object'||Array.isArray(palette)||Object.keys(palette).length>32||Object.keys(palette).length<1)throw Error('palette 必须为 1–32 项颜色映射');
 for(const [k,v] of Object.entries(palette)){if(k.length!==1||typeof v!=='string'||!(v==='transparent'||/^#[0-9a-f]{6}$/i.test(v)))throw Error('调色板必须使用单字符键及 #RRGGBB 或 transparent');}
 const frames=input.frames;
 if(!Array.isArray(frames)||frames.length<1||frames.length>16)throw Error('frames 必须包含 1–16 帧');
 for(const [i,rows] of frames.entries()){
 if(!Array.isArray(rows)||rows.length!==height)throw Error('第 '+(i+1)+' 帧行数应为 '+height);
 for(const row of rows)if(typeof row!=='string'||row.length!==width||[...row].some(ch=>!(ch in palette)))throw Error('第 '+(i+1)+' 帧包含宽度错误或未定义颜色');
 }
 return {name,width,height,palette,frames};
}
export function makeImported(data){
 const p=validateMatrix(data);
 return {id:'custom-'+Date.now()+'-'+Math.floor(Math.random()*1e5),name:p.name,cn:'自定义像素资产',desc:'通过 LLM 像素 JSON 协议导入，可逐帧播放和编辑。',type:'matrix',fps:8,frames:p.frames.length,category:'IMPORTED',tone:'matrix',color:'#aacfd8',data:p};
}
export function makePrompt(idea){
 return [
  '你是严谨的像素艺术家。不要使用任何文生图、扩散或图像工具，仅通过逐像素字符矩阵制作 Sprite 动画。',
  '主题：'+String(idea||'一瓶循环动画像素药剂'),
  '只输出单个 JSON 对象，不要 Markdown 代码块或解释。',
  'JSON 格式：{"name":"Artwork","width":16,"height":16,"palette":{".":"transparent","X":"#263044","R":"#d54e62","H":"#ffd0b2"},"frames":[["................", "...共16行"], ["...共16行"]]}。',
  '严格要求：width 和 height 为 16 或 24；palette 仅使用单个 ASCII 字符作为键，透明色 transparent，其余为 #RRGGBB；frames 包含 4–8 帧；每帧必须有精确 height 行，每行精确 width 字符。',
  '艺术要求：整体剪影先行，统一深色轮廓，控制 8–12 色，明暗分组清晰，物体主体保持位置与体积稳定，仅改变液面/火焰/气泡等需要运动的位置。',
  '循环要求：首尾两帧视觉上自然衔接；不要让整个物体发生突然变化。输出前逐帧检查行数、字符长度、颜色映射和结构合法性。',
  '重要：无任何图片模型参与，仅需输出上述 JSON。'
 ].join('\n\n');
}