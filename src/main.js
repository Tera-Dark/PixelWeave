import {DEMOS,SIZE,renderAsset,makeImported,validateMatrix} from './engine.js';
import {LAYERED_FORMAT,createLayeredAsset,validateLayered,pixelCoordinates,paintLayerPixel,addEmptyLayer,reorderLayer,duplicateFrame,deleteFrame,createBlankLayered,metrics} from './layered.js';
import {makeLayeredPrompt,parseModelJSON} from './llm.js';
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
function paint(e){
 if(!state.tool)return;
 const c=$('studio-canvas');
 if(isLayered()){
  const data=current().data,pt=pixelCoordinates(c,data,e.clientX,e.clientY);
  if(!pt)return;
  const symbol=state.tool==='erase'?'.':state.symbol;
  if(paintLayerPixel(data,state.activeLayer,state.frame,pt.x,pt.y,symbol)){
   renderAsset(c,current(),state.frame);renderAsset(thumbs[state.frame],current(),state.frame);
  }
  return;
 }
 const r=c.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*96),y=Math.floor((e.clientY-r.top)/r.height*96);
 if(x<0||x>95||y<0||y>95)return;
 if(!state.edits[state.id])state.edits[state.id]={};const f=String(state.frame);
 if(!state.edits[state.id][f])state.edits[state.id][f]={};
 if(state.tool==='erase')delete state.edits[state.id][f][x+','+y];
 else state.edits[state.id][f][x+','+y]=$('brush-color').value;
 renderAsset(c,current(),state.frame,layers());renderAsset(thumbs[state.frame],current(),state.frame,layers());
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);}
const png=c=>new Promise((ok,fail)=>c.toBlob(b=>b?ok(b):fail(Error('PNG 生成失败')),'image/png'));
const fileName=()=>current().name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
async function exportPng(){const c=cv();renderAsset(c,current(),state.frame,layers());download(await png(c),fileName()+'-frame-'+(state.frame+1)+'.png');notify('PNG 当前帧已下载。');}
async function exportSheet(){const a=current(),c=document.createElement('canvas');c.width=384;c.height=96*Math.ceil(a.frames/4);const context=c.getContext('2d');context.imageSmoothingEnabled=false;const frame=cv();
 for(let i=0;i<a.frames;i++){renderAsset(frame,a,i,layers());context.drawImage(frame,(i%4)*96,Math.floor(i/4)*96);}download(await png(c),fileName()+'-spritesheet.png');notify('完整帧序列精灵图已下载。');}
function exportJson(){
 const a=current();
 const data=isLayered()?a.data:{format:'pixelweave-project/v0.2',asset:a.type==='matrix'?a.data:{demoId:a.id},patches:layers(),fps:a.fps};
 download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),fileName()+'.pixelweave.json');
 notify(isLayered()?'完整分层工程已下载，可再次导入并编辑每层。':'资产工程 JSON 已下载。');
}
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
function importJson(){
 const raw=$('json-input').value;
 if(raw.length>350000){notify('输入超过 350KB 限制。',true);return;}
 try{
  const j=parseModelJSON(raw);let a;
  if(j.format===LAYERED_FORMAT){a=createLayeredAsset(validateLayered(j));state.items.push(a);}
  else if(j.format==='pixelweave-project/v0.2'){
   if(j.asset&&j.asset.demoId){a=state.items.find(x=>x.id===j.asset.demoId);if(!a)throw Error('工程引用了未知内置资产');}
   else if(j.asset?.format===LAYERED_FORMAT){a=createLayeredAsset(validateLayered(j.asset));state.items.push(a);}
   else{a=makeImported(validateMatrix(j.asset));state.items.push(a);}
   if(a.type!=='layered')state.edits[a.id]=scrub(j.patches);
  }else{a=makeImported(validateMatrix(j));state.items.push(a);}
  choose(a.id);persist();renderGallery();$('json-import-panel').hidden=true;$('json-input').value='';
  notify('成功导入「'+a.name+'」。'+(isLayered()?'已保留每个独立图层及所有帧。':'可编辑每一帧。'));
 }catch(e){notify('JSON 导入失败：'+e.message,true);}
}
function isLayered(){return current().type==='layered';}
function selectedLayer(){return isLayered()?current().data.layers.find(l=>l.id===state.activeLayer):null;}
function remember(){
 if(!isLayered())return;
 state.undo.push(JSON.stringify(current().data));if(state.undo.length>25)state.undo.shift();state.redo.length=0;
}
function updateLayered(){
 const a=current(),d=a.data;
 a.name=d.name;a.frames=d.layers[0].frames.length;a.fps=d.fps;a.desc=d.layers.length+' 层 / '+a.frames+' 帧分层像素艺术。';
 refresh();renderGallery();persist();
}
function timeTravel(direction){
 if(!isLayered())return;
 const stack=direction==='undo'?state.undo:state.redo,other=direction==='undo'?state.redo:state.undo;
 if(!stack.length){notify('当前没有可'+(direction==='undo'?'撤销':'重做')+'的操作。',true);return;}
 other.push(JSON.stringify(current().data));
 current().data=validateLayered(JSON.parse(stack.pop()));
 if(!current().data.layers.some(l=>l.id===state.activeLayer))state.activeLayer=current().data.layers.at(-1).id;
 state.frame=Math.min(state.frame,current().data.layers[0].frames.length-1);updateLayered();
}
function mutateLayer(callback){
 if(!isLayered())return;
 remember();
 try{callback(current().data);updateLayered();}
 catch(e){current().data=JSON.parse(state.undo.pop());notify(e.message,true);renderLayers();}
}
function renderLayers(){
 const active=isLayered(),panel=$('layers-panel');
 panel.hidden=!active;if(!active)return;
 const data=current().data;
 if(!data.layers.some(l=>l.id===state.activeLayer))state.activeLayer=data.layers.at(-1).id;
 const host=$('layer-list');host.replaceChildren();
 for(const layer of [...data.layers].reverse()){
  const row=document.createElement('div');row.className='layer-row'+(layer.id===state.activeLayer?' selected':'');
  const eye=document.createElement('button');eye.type='button';eye.className='layer-eye';eye.textContent=layer.visible?'◉':'○';eye.title=layer.visible?'隐藏图层':'显示图层';eye.setAttribute('aria-label',eye.title);
  eye.onclick=()=>mutateLayer(()=>{layer.visible=!layer.visible;});
  const select=document.createElement('button');select.type='button';select.className='layer-select';
  const b=document.createElement('strong');b.textContent=layer.name;
  const sub=document.createElement('small');sub.textContent=layer.id+' · '+Math.round(layer.opacity*100)+'%';
  select.append(b,sub);select.onclick=()=>{state.activeLayer=layer.id;renderLayers();};
  row.append(eye,select);host.append(row);
 }
 $('layer-count').textContent=data.layers.length+' LAYERS';
 const layer=selectedLayer();
 $('layer-name').value=layer.name;$('layer-x').value=layer.x;$('layer-y').value=layer.y;
 $('layer-opacity').value=Math.round(layer.opacity*100);$('layer-opacity-value').textContent=Math.round(layer.opacity*100)+'%';
 $('layer-up').disabled=data.layers.at(-1).id===layer.id;
 $('layer-down').disabled=data.layers[0].id===layer.id;
 $('layer-add').disabled=data.layers.length>=12;
 $('layer-frame-add').disabled=current().frames>=16;$('layer-frame-delete').disabled=current().frames<=1;
 $('layer-undo').disabled=state.undo.length===0;$('layer-redo').disabled=state.redo.length===0;
 const pal=$('layer-palette');pal.replaceChildren();
 for(const [key,color] of Object.entries(data.palette)){
  const b=document.createElement('button');b.type='button';b.className='palette-swatch'+(state.symbol===key?' selected':'');
  b.style.background=color==='transparent'?'repeating-conic-gradient(#8590a1 0% 25%, #3d4758 0% 50%) 50% / 12px 12px':color;
  b.textContent=key==='.'?'×':'';b.title=key+' '+color;b.setAttribute('aria-label','画笔颜色 '+key+' '+color);
  b.onclick=()=>{state.symbol=key;state.tool='pencil';for(const v of ['pencil','erase'])$('tool-'+v).classList.toggle('active',v==='pencil');renderLayers();};
  pal.append(b);
 }
 const m=metrics(data);
 $('layer-metrics').textContent='COVERAGE '+m.coverage+'%  ·  MOTION '+m.meanMotion+'%  ·  LOOP SEAM '+m.seam+'%';
}
function beginLLMStatus(){
 fetch('./api/status',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('static');return r.json();}).then(cfg=>{
  if(cfg.available){$('llm-status').textContent='● 已连接本地模型代理：'+cfg.model+' · 支持自动生成';$('generate-llm').disabled=false;}
  else {$('llm-status').textContent='本地代理未配置模型。可使用 JSON 导入或新建画布。';$('generate-llm').disabled=true;}
 }).catch(()=>{
  $('llm-status').textContent='当前为 GitHub Pages 静态模式：复制 LLM 提示词，在任意文本模型中生成 JSON 后粘贴导入。';
  $('generate-llm').disabled=true;
 });
}
async function generateFromLLM(){
 const button=$('generate-llm'),idea=$('idea-input').value.trim();
 if(idea.length<4){notify('先描述你希望生成的像素动画主题。',true);return;}
 button.disabled=true;button.textContent='LLM 创作中…';notify('正在通过本地文本模型进行美术规划、分层绘制与校验。');
 try{
  const res=await fetch('./api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idea})});
  const output=await res.json();if(!res.ok)throw Error(output.error||'生成失败');
  const a=createLayeredAsset(output.asset);state.items.push(a);choose(a.id);persist();renderGallery();
  const issues=output.warnings?.length?' 质量提示：'+output.warnings.join('；'):'';
  notify('已生成 '+a.data.layers.length+' 层 / '+a.frames+' 帧，模型调用 '+output.attempts+' 次。'+issues);
 }catch(e){notify('LLM 生成失败：'+e.message,true);}
 finally{button.disabled=false;button.textContent='使用本地 LLM 生成 ✳';}
}
function newProject(){
 try{
  const name=$('idea-input').value.trim().slice(0,55)||'Untitled Sprite';
  const a=createLayeredAsset(createBlankLayered(name,24,24,4));state.items.push(a);choose(a.id);
  state.symbol='K';persist();renderGallery();notify('已创建 24×24 / 4 帧的空白分层项目。请选中画笔，在画布上绘制。');
 }catch(e){notify(e.message,true);}
}
function events(){
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>route(b.dataset.page));
 $('hero-studio').onclick=()=>route('studio');$('hero-open').onclick=()=>{choose('atelier');route('studio');};
 $('principle-open').onclick=()=>route('studio');$('studio-to-gallery').onclick=()=>route('gallery');
 $('btn-play').onclick=()=>{state.play=!state.play;state.elapsed=0;draw();};$('btn-prev').onclick=()=>shift(-1);$('btn-next').onclick=()=>shift(1);
 $('btn-restart').onclick=()=>{state.frame=0;state.play=true;state.elapsed=0;draw();};$('frame-range').oninput=e=>{state.frame=+e.target.value;state.play=false;draw();};
 $('speed-control').oninput=e=>{state.speed=+e.target.value;$('speed-value').textContent=state.speed+'×';};
 $('zoom-control').oninput=e=>{const v=+e.target.value;$('zoom-value').textContent=v+'×';$('studio-canvas').style.width=v*96+'px';$('studio-canvas').style.height=v*96+'px';};
 $('toggle-grid').onclick=()=>{const on=$('studio-stage').classList.toggle('grid-mode');$('toggle-grid').classList.toggle('active',on);};
 $('tool-pencil').onclick=()=>tool('pencil');$('tool-erase').onclick=()=>tool('erase');
 const c=$('studio-canvas');c.onpointerdown=e=>{if(!state.tool)return;if(isLayered())remember();painting=true;state.play=false;draw();c.setPointerCapture(e.pointerId);paint(e);};c.onpointermove=e=>{if(painting)paint(e);};
 const stop=()=>{if(painting){painting=false;persist();renderGallery();if(isLayered())renderLayers();}};c.onpointerup=stop;c.onpointercancel=stop;c.onlostpointercapture=stop;
 $('export-png').onclick=()=>exportPng().catch(e=>notify(e.message,true));$('export-sheet').onclick=()=>exportSheet().catch(e=>notify(e.message,true));
 $('export-json').onclick=exportJson;$('export-webm').onclick=exportVideo;
 $('layer-name').onchange=e=>mutateLayer(()=>{selectedLayer().name=e.target.value.trim().slice(0,40)||selectedLayer().id;});
 $('layer-x').onchange=e=>mutateLayer(()=>{const n=Number(e.target.value);if(!Number.isInteger(n)||Math.abs(n)>64)throw Error('横向偏移需为 ±64 整数');selectedLayer().x=n;});
 $('layer-y').onchange=e=>mutateLayer(()=>{const n=Number(e.target.value);if(!Number.isInteger(n)||Math.abs(n)>64)throw Error('纵向偏移需为 ±64 整数');selectedLayer().y=n;});
 $('layer-opacity').onchange=e=>mutateLayer(()=>{selectedLayer().opacity=Number(e.target.value)/100;});
 $('layer-up').onclick=()=>mutateLayer(d=>reorderLayer(d,state.activeLayer,1));
 $('layer-down').onclick=()=>mutateLayer(d=>reorderLayer(d,state.activeLayer,-1));
 $('layer-add').onclick=()=>mutateLayer(d=>{state.activeLayer=addEmptyLayer(d).id;});
 $('layer-frame-add').onclick=()=>mutateLayer(d=>{duplicateFrame(d,state.frame);state.frame++;});
 $('layer-frame-delete').onclick=()=>mutateLayer(d=>{deleteFrame(d,state.frame);state.frame=Math.min(state.frame,d.layers[0].frames.length-1);});
 $('layer-undo').onclick=()=>timeTravel('undo');$('layer-redo').onclick=()=>timeTravel('redo');
 $('new-layer-project').onclick=newProject;
 $('generate-llm').onclick=generateFromLLM;
 $('toggle-json-import').onclick=()=>{$('json-import-panel').hidden=!$('json-import-panel').hidden;};$('import-json').onclick=importJson;
 $('copy-llm-prompt').onclick=async()=>{const text=makeLayeredPrompt($('idea-input').value);try{await navigator.clipboard.writeText(text);notify('完整 LLM 像素动画生成规范已复制。');}catch{$('json-import-panel').hidden=false;$('json-input').value=text;$('json-input').select();notify('复制受限：已在文本框选中提示词，请手动复制。',true);}};
 document.addEventListener('keydown',e=>{if($('studio-page').hidden||e.target.matches('input,textarea,button'))return;if(e.code==='Space'){e.preventDefault();state.play=!state.play;draw();}if(e.code==='ArrowLeft')shift(-1);if(e.code==='ArrowRight')shift(1);});
 window.addEventListener('hashchange',()=>{if(location.hash==='#studio'||location.hash==='#gallery')route(location.hash.slice(1));});
}
restore();renderGallery();refresh();events();route(location.hash==='#studio'?'studio':'gallery');beginLLMStatus();requestAnimationFrame(loop);
