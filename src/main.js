import {DEMOS,SIZE,renderAsset,makeImported,validateMatrix} from './engine.js';
import {LAYERED_FORMAT,createLayeredAsset,validateLayered,pixelCoordinates,paintLayerPixel,addEmptyLayer,reorderLayer,duplicateFrame,deleteFrame,createBlankLayered,metrics} from './layered.js';
import {makeLayeredPrompt} from './llm.js';
const $=id=>document.getElementById(id),state={items:[...DEMOS],id:'atelier',frame:0,play:true,speed:1,edits:{},tool:null,elapsed:0,last:0,activeLayer:'liquid',symbol:'K',undo:[],redo:[]};
let cards=[],thumbs=[],painting=false,galleryTick=-1;
const current=()=>state.items.find(a=>a.id===state.id)||DEMOS[0],layers=()=>state.edits[state.id]||{};
const cv=()=>{const e=document.createElement('canvas');e.width=SIZE;e.height=SIZE;return e;};
function notify(t,bad=false){$('feedback').textContent=t;$('feedback').className='feedback '+(bad?'error':'success');}
function scrub(o){const r={};if(!o||typeof o!=='object')return r;for(const [i,obj] of Object.entries(o)){if(!/^\d{1,2}$/.test(i)||+i>15||!obj||typeof obj!=='object')continue;const p={};let n=0;for(const [xy,color] of Object.entries(obj)){const m=/^(\d{1,2}),(\d{1,2})$/.exec(xy);if(m&&+m[1]<96&&+m[2]<96&&/^#[0-9a-f]{6}$/i.test(color)&&n++<10000)p[xy]=color;}r[i]=p;}return r;}
function persist(){try{
  const custom=state.items.filter(a=>a.type==='matrix').map(a=>({id:a.id,data:a.data}));
  const layered=state.items.filter(a=>a.type==='layered').map(a=>({id:a.id,data:a.data}));
  localStorage.setItem('pixelweave.v03',JSON.stringify({custom,layered,edits:state.edits}));
 }catch{notify('本地存储已满，请导出 JSON 备份。',true);}}
function restore(){try{
 const d=JSON.parse(localStorage.getItem('pixelweave.v03')||localStorage.getItem('pixelweave.v02')||'null');if(!d)return;
 for(const v of (Array.isArray(d.custom)?d.custom:[]).slice(0,12)){
  try{const a=makeImported(validateMatrix(v.data));if(/^custom-[0-9-]+$/.test(v.id||''))a.id=v.id;state.items.push(a);}catch{}
 }
 for(const v of (Array.isArray(d.layered)?d.layered:[]).slice(0,12)){
  try{
   const data=validateLayered(v.data);
   const built=state.items.find(a=>a.id===v.id&&a.type==='layered');
   if(built){built.data=data;built.frames=data.layers[0].frames.length;built.name=data.name;built.fps=data.fps;}
   else {const a=createLayeredAsset(data);if(/^layered-[0-9-]+$/.test(v.id||''))a.id=v.id;state.items.push(a);}
  }catch{}
 }
 if(d.edits&&typeof d.edits==='object')for(const [id,v] of Object.entries(d.edits))if(state.items.some(a=>a.id===id))state.edits[id]=scrub(v);
}catch{}}
function route(name){const studio=name==='studio';$('gallery-page').hidden=studio;$('studio-page').hidden=!studio;document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));if(studio)refresh();history.replaceState(null,'','#'+name);window.scrollTo(0,0);}
function renderGallery(){cards=[];const host=$('gallery-grid');host.replaceChildren();state.items.forEach((a,i)=>{
 const b=document.createElement('button');b.className='work-card';b.type='button';b.setAttribute('aria-label','打开 '+a.name);
 const art=document.createElement('div');art.className='work-art '+a.tone;
 const no=document.createElement('span');no.className='work-number';no.textContent=String(i+1).padStart(2,'0')+' / '+String(state.items.length).padStart(2,'0');
 const live=document.createElement('span');live.className='work-live';live.textContent='● LIVE';
 const c=cv();art.append(no,c,live);
 const meta=document.createElement('div');meta.className='work-meta';const info=document.createElement('div'),title=document.createElement('strong'),small=document.createElement('small'),arrow=document.createElement('span');
 title.textContent=a.name;small.textContent=a.cn+' · '+a.frames+' FRAMES';arrow.className='work-arrow';arrow.textContent='↗';info.append(title,small);meta.append(info,arrow);b.append(art,meta);host.append(b);
 b.onclick=()=>{choose(a.id);route('studio');};cards.push({c,a});
 });$('collection-count').textContent=String(state.items.length).padStart(2,'0');}
function choose(id){if(!state.items.some(a=>a.id===id))return;
  state.id=id;state.frame=0;state.elapsed=0;state.play=true;state.undo=[];state.redo=[];
  state.activeLayer=current().type==='layered'?(current().data.layers.find(l=>l.id==='liquid')?.id||current().data.layers.at(-1).id):null;
  if(current().type==='layered')state.symbol=Object.keys(current().data.palette).find(k=>k!=='.')||'.';
  refresh();
}
function refresh(){
 const a=current();$('asset-name').textContent=a.name;$('asset-subline').textContent=a.cn+' · '+a.frames+' 帧循环';$('inspector-name').textContent=a.name;$('inspector-desc').textContent=a.desc;
 $('asset-size').textContent=(a.type==='matrix'?a.data.width+' × '+a.data.height:'96 × 96')+' PX';$('detail-type').textContent=a.type==='matrix'?'LLM 像素矩阵':'程序化动画';$('detail-res').textContent=a.type==='matrix'?a.data.width+' × '+a.data.height:'96 × 96';
 $('detail-frames').textContent=a.frames;$('detail-fps').textContent=a.fps+' FPS';$('fps-label').textContent=a.fps+' FPS';$('frame-count').textContent=a.frames+' FRAMES';$('frame-range').max=a.frames-1;
 const library=$('asset-list');library.replaceChildren();state.items.forEach(item=>{
  const b=document.createElement('button');b.className='asset-option'+(item.id===state.id?' active':'');b.type='button';const c=cv();renderAsset(c,item,0,state.edits[item.id]);const text=document.createElement('div'),n=document.createElement('b'),s=document.createElement('small');n.textContent=item.name;s.textContent=item.category+' · '+item.frames+'F';text.append(n,s);b.append(c,text);b.onclick=()=>choose(item.id);library.append(b);
 });$('asset-counter').textContent=String(state.items.length).padStart(2,'0');
 const track=$('frame-track');track.replaceChildren();thumbs=[];
 for(let i=0;i<a.frames;i++){const b=document.createElement('button');b.type='button';b.className='frame-button';const c=cv();renderAsset(c,a,i,layers());const label=document.createElement('span');label.textContent='F'+String(i+1).padStart(2,'0');b.append(c,label);b.onclick=()=>{state.frame=i;state.play=false;draw();};track.append(b);thumbs.push(c);}
 renderLayers();draw();
}
function draw(){renderAsset($('studio-canvas'),current(),state.frame,layers());const f=String(state.frame+1).padStart(2,'0'),count=String(current().frames).padStart(2,'0');
 $('stage-frame-label').textContent='FRAME '+f+' / '+count;$('transport-label').textContent=f+' / '+count;$('frame-range').value=state.frame;$('btn-play').textContent=state.play?'Ⅱ':'▶';
 $('frame-track').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===state.frame));
}
function shift(n){state.frame=(state.frame+n+current().frames)%current().frames;state.play=false;state.elapsed=0;draw();}
function loop(now){if(!state.last)state.last=now;const dt=Math.min(100,now-state.last);state.last=now;
 if(state.play){state.elapsed+=dt*state.speed;const pace=1000/current().fps;if(state.elapsed>=pace){state.frame=(state.frame+Math.floor(state.elapsed/pace))%current().frames;state.elapsed%=pace;draw();}}
 const tick=Math.floor(now/125);if(tick!==galleryTick){galleryTick=tick;for(const x of cards)renderAsset(x.c,x.a,tick%x.a.frames,state.edits[x.a.id]);renderAsset($('hero-canvas'),DEMOS[0],tick%12,state.edits.health);}requestAnimationFrame(loop);}
function tool(t){state.tool=state.tool===t?null:t;for(const v of ['pencil','erase']){$('tool-'+v).classList.toggle('active',state.tool===v);$('tool-'+v).setAttribute('aria-pressed',String(state.tool===v));}}
function paint(e){if(!state.tool)return;const c=$('studio-canvas'),r=c.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*96),y=Math.floor((e.clientY-r.top)/r.height*96);if(x<0||x>95||y<0||y>95)return;
 if(!state.edits[state.id])state.edits[state.id]={};const f=String(state.frame);if(!state.edits[state.id][f])state.edits[state.id][f]={};
 if(state.tool==='erase')delete state.edits[state.id][f][x+','+y];else state.edits[state.id][f][x+','+y]=$('brush-color').value;
 renderAsset(c,current(),state.frame,layers());renderAsset(thumbs[state.frame],current(),state.frame,layers());}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);}
const png=c=>new Promise((ok,fail)=>c.toBlob(b=>b?ok(b):fail(Error('PNG 生成失败')),'image/png'));
const fileName=()=>current().name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
async function exportPng(){const c=cv();renderAsset(c,current(),state.frame,layers());download(await png(c),fileName()+'-frame-'+(state.frame+1)+'.png');notify('PNG 当前帧已下载。');}
async function exportSheet(){const a=current(),c=document.createElement('canvas');c.width=384;c.height=96*Math.ceil(a.frames/4);const context=c.getContext('2d');context.imageSmoothingEnabled=false;const frame=cv();
 for(let i=0;i<a.frames;i++){renderAsset(frame,a,i,layers());context.drawImage(frame,(i%4)*96,Math.floor(i/4)*96);}download(await png(c),fileName()+'-spritesheet.png');notify('完整帧序列精灵图已下载。');}
function exportJson(){const a=current();download(new Blob([JSON.stringify({format:'pixelweave-project/v0.2',asset:a.type==='matrix'?a.data:{demoId:a.id},patches:layers(),fps:a.fps},null,2)],{type:'application/json'}),fileName()+'.pixelweave.json');notify('资产工程 JSON 已下载，支持重新导入。');}
function exportVideo(){if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){notify('此浏览器不支持 WebM，推荐下载精灵图。',true);return;}
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(s=>MediaRecorder.isTypeSupported(s));if(!mime){notify('未检测到 WebM 编码器。',true);return;}
 const a=current(),c=document.createElement('canvas');c.width=288;c.height=288;const stream=c.captureStream(30),chunks=[];let rec;
 try{rec=new MediaRecorder(stream,{mimeType:mime});}catch(e){stream.getTracks().forEach(t=>t.stop());notify(e.message,true);return;}
 const button=$('export-webm');button.disabled=true;rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());button.disabled=false;if(chunks.length)download(new Blob(chunks,{type:mime}),fileName()+'-loop.webm');notify(chunks.length?'两个循环的 WebM 已下载。':'录制为空，请导出精灵图。',!chunks.length);};
 let i=0;renderAsset(c,a,0,layers());rec.start(100);notify('正在录制两个循环…');
 const timer=setInterval(()=>{i++;renderAsset(c,a,i%a.frames,layers());if(i>=a.frames*2){clearInterval(timer);setTimeout(()=>{if(rec.state!=='inactive')rec.stop();},140);}},1000/a.fps);
 rec.onerror=()=>{clearInterval(timer);if(rec.state!=='inactive')rec.stop();notify('录制失败，请使用精灵图导出。',true);};
}
function importJson(){const raw=$('json-input').value;if(raw.length>200000){notify('超过 200KB 的安全限制。',true);return;}
 try{const j=JSON.parse(raw);let a;if(j.format==='pixelweave-project/v0.2'){
  if(j.asset&&j.asset.demoId){a=state.items.find(x=>x.id===j.asset.demoId);if(!a)throw Error('工程引用了未知内置资产');}
  else{a=makeImported(validateMatrix(j.asset));state.items.push(a);}
  state.edits[a.id]=scrub(j.patches);
 }else{a=makeImported(validateMatrix(j));state.items.push(a);}
 choose(a.id);persist();renderGallery();$('json-import-panel').hidden=true;$('json-input').value='';notify('已成功导入「'+a.name+'」，现在可以编辑每一帧。');
 }catch(e){notify('JSON 导入失败：'+e.message,true);}
}
function events(){
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>route(b.dataset.page));
 $('hero-studio').onclick=()=>route('studio');$('hero-open').onclick=()=>{choose('health');route('studio');};
 $('principle-open').onclick=()=>route('studio');$('studio-to-gallery').onclick=()=>route('gallery');
 $('btn-play').onclick=()=>{state.play=!state.play;state.elapsed=0;draw();};$('btn-prev').onclick=()=>shift(-1);$('btn-next').onclick=()=>shift(1);
 $('btn-restart').onclick=()=>{state.frame=0;state.play=true;state.elapsed=0;draw();};$('frame-range').oninput=e=>{state.frame=+e.target.value;state.play=false;draw();};
 $('speed-control').oninput=e=>{state.speed=+e.target.value;$('speed-value').textContent=state.speed+'×';};
 $('zoom-control').oninput=e=>{const v=+e.target.value;$('zoom-value').textContent=v+'×';$('studio-canvas').style.width=v*96+'px';$('studio-canvas').style.height=v*96+'px';};
 $('toggle-grid').onclick=()=>{const on=$('studio-stage').classList.toggle('grid-mode');$('toggle-grid').classList.toggle('active',on);};
 $('tool-pencil').onclick=()=>tool('pencil');$('tool-erase').onclick=()=>tool('erase');
 const c=$('studio-canvas');c.onpointerdown=e=>{if(!state.tool)return;painting=true;c.setPointerCapture(e.pointerId);paint(e);};c.onpointermove=e=>{if(painting)paint(e);};
 const stop=()=>{if(painting){painting=false;persist();renderGallery();}};c.onpointerup=stop;c.onpointercancel=stop;c.onlostpointercapture=stop;
 $('export-png').onclick=()=>exportPng().catch(e=>notify(e.message,true));$('export-sheet').onclick=()=>exportSheet().catch(e=>notify(e.message,true));
 $('export-json').onclick=exportJson;$('export-webm').onclick=exportVideo;
 $('toggle-json-import').onclick=()=>{$('json-import-panel').hidden=!$('json-import-panel').hidden;};$('import-json').onclick=importJson;
 $('copy-llm-prompt').onclick=async()=>{const text=makePrompt($('idea-input').value);try{await navigator.clipboard.writeText(text);notify('完整 LLM 像素动画生成规范已复制。');}catch{$('json-import-panel').hidden=false;$('json-input').value=text;$('json-input').select();notify('复制受限：已在文本框选中提示词，请手动复制。',true);}};
 document.addEventListener('keydown',e=>{if($('studio-page').hidden||e.target.matches('input,textarea,button'))return;if(e.code==='Space'){e.preventDefault();state.play=!state.play;draw();}if(e.code==='ArrowLeft')shift(-1);if(e.code==='ArrowRight')shift(1);});
 window.addEventListener('hashchange',()=>{if(location.hash==='#studio'||location.hash==='#gallery')route(location.hash.slice(1));});
}
restore();renderGallery();refresh();events();route(location.hash==='#studio'?'studio':'gallery');requestAnimationFrame(loop);
