import {DEMOS,SIZE,renderAsset,makeImported,validateMatrix} from './engine.js';
import {LAYERED_FORMAT,createLayeredAsset,validateLayered,pixelCoordinates,paintLayerPixel,addEmptyLayer,reorderLayer,duplicateFrame,deleteFrame,createBlankLayered,metrics} from './layered.js';
import {makeLayeredPrompt,parseModelJSON} from './llm.js';
import {loadPotionAsset} from './potion-loader.js';
import {renderExploded,layerAtPosition,explodedLayout} from './exploded.js';
import {renderSingleLayer} from './layer-focus.js';
import {POTION_ID} from './native-potion.mjs';
import {mountSiteNavigation,syncSiteNavigation} from './site-nav.mjs';
import {copyCel,pasteCel,clearCel,insertFrame,moveFrame,celStats} from './cel-ops.mjs';
import {renderCelTimeline,updateCelSelection} from './cel-timeline.mjs';
import {paintLine,paintRectangle,paintFill,moveRegion} from './pixel-tools.mjs';
import {stepPlayback,inspectAnimation} from './animation-analysis.mjs';
import {TRANSFER_KEY} from './pixelize-core.mjs';
const $=id=>document.getElementById(id),state={items:[],id:POTION_ID,frame:0,play:true,speed:1,edits:{},tool:null,elapsed:0,last:0,activeLayer:'liquid',symbol:'K',undo:[],redo:[],mode:'loop',direction:1};
let cards=[],thumbs=[],painting=false,galleryTick=-1,localModelAvailable=false,explosionSpread=65,explosionSolo=false,focusFit=true,focusChecker=true,explosionVisible=false,onionEnabled=false,activeStroke=null,selection=null,celClipboard=null,onionPrevious=true,onionFollowing=false,panDrag=null,panX=0,panY=0,studioInitialized=false;
const current=()=>state.items.find(a=>a.id===state.id)||state.items[0],layers=()=>state.edits[state.id]||{};
const historyByAsset=new Map();
function activateHistory(id){if(!historyByAsset.has(id))historyByAsset.set(id,{undo:[],redo:[]});const h=historyByAsset.get(id);state.undo=h.undo;state.redo=h.redo;}
const cv=()=>{const e=document.createElement('canvas');e.width=256;e.height=256;return e;};
function notify(t,bad=false){$('feedback').textContent=t;$('feedback').className='feedback '+(bad?'error':'success');}
function scrub(o){const r={};if(!o||typeof o!=='object')return r;for(const [i,obj] of Object.entries(o)){if(!/^\d{1,2}$/.test(i)||+i>15||!obj||typeof obj!=='object')continue;const p={};let n=0;for(const [xy,color] of Object.entries(obj)){const m=/^(\d{1,2}),(\d{1,2})$/.exec(xy);if(m&&+m[1]<96&&+m[2]<96&&/^#[0-9a-f]{6}$/i.test(color)&&n++<10000)p[xy]=color;}r[i]=p;}return r;}
function persist(){try{
  const custom=state.items.filter(a=>a.type==='matrix').map(a=>({id:a.id,data:a.data}));
  const layered=state.items.filter(a=>a.type==='layered').map(a=>({id:a.id,data:a.data}));
  localStorage.setItem('pixelweave.v04',JSON.stringify({custom,layered,edits:state.edits}));
  return true;
 }catch{notify('本地存储无法写入：请立即导出 JSON 工程备份。',true);return false;}}
function restore(){try{
 const d=JSON.parse(localStorage.getItem('pixelweave.v04')||'null');if(!d)return;
 for(const v of (Array.isArray(d.custom)?d.custom:[]).slice(0,12)){
  try{const a=makeImported(validateMatrix(v.data));if(/^custom-[0-9-]+$/.test(v.id||''))a.id=v.id;state.items.push(a);}catch{}
 }
 for(const v of (Array.isArray(d.layered)?d.layered:[]).slice(0,12)){
  try{
   // Never silently resurrect rejected archived gallery experiments.
   if(v.id!==POTION_ID&&!/^layered-[0-9-]+$/.test(v.id||''))continue;
   const data=validateLayered(v.data);
   const built=state.items.find(a=>a.id===v.id&&a.type==='layered');
   if(built){
    built.data=data;built.frames=data.layers[0].frames.length;built.name=data.name;
    built.fps=data.fps;built.cn='已恢复的本地编辑 · 与原始样品分开导出备份';
   }else{
    const a=createLayeredAsset(data);a.id=v.id;state.items.push(a);
   }
  }catch{}
 }
 if(d.edits&&typeof d.edits==='object')for(const [id,v] of Object.entries(d.edits))if(state.items.some(a=>a.id===id))state.edits[id]=scrub(v);
}catch{}}
function route(name,{record=true,scroll=true}={}){const studio=name==='studio';$('gallery-page').hidden=studio;$('studio-page').hidden=!studio;document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));if(studio&&current()){if(!studioInitialized){refresh();studioInitialized=true;}else draw();}if(record&&location.hash!=='#'+name)history.pushState(null,'','#'+name);syncSiteNavigation();if(scroll)window.scrollTo(0,0);}
function renderGallery(){cards=[];const host=$('gallery-grid');host.replaceChildren();
 const featured=state.items.filter(a=>a.id===POTION_ID);
 featured.forEach((a,i)=>{
 const b=document.createElement('button');b.className='work-card';b.type='button';b.setAttribute('aria-label','打开 '+a.name);
 const art=document.createElement('div');art.className='work-art '+a.tone;
 const no=document.createElement('span');no.className='work-number';no.textContent=String(i+1).padStart(2,'0')+' / '+String(featured.length).padStart(2,'0');
 const live=document.createElement('span');live.className='work-live';live.textContent='● LIVE';
 const c=cv();art.append(no,c,live);
 const meta=document.createElement('div');meta.className='work-meta';const info=document.createElement('div'),title=document.createElement('strong'),small=document.createElement('small'),arrow=document.createElement('span');
 title.textContent=a.name;small.textContent=a.cn+' · '+a.frames+' FRAMES';arrow.className='work-arrow';arrow.textContent='↗';info.append(title,small);meta.append(info,arrow);b.append(art,meta);host.append(b);
 b.onclick=()=>{choose(a.id);route('studio');};cards.push({c,a});watchArt(c);
 });$('collection-count').textContent=String(featured.length).padStart(2,'0');}
function choose(id){if(!state.items.some(a=>a.id===id))return;
  state.id=id;state.frame=0;state.elapsed=0;state.play=true;selection=null;activateHistory(id);
  state.activeLayer=current().type==='layered'?(current().data.layers.find(l=>l.id==='liquid')?.id||current().data.layers.at(-1).id):null;
  if(current().type==='layered')state.symbol=(current().data.palette.m?'m':Object.keys(current().data.palette).find(k=>k!=='.')||'.');
  refresh();studioInitialized=true;
}
function refresh(){
 const a=current();$('asset-name').textContent=a.name;$('asset-subline').textContent=a.cn+' · '+a.frames+' 帧循环';$('inspector-name').textContent=a.name;$('inspector-desc').textContent=a.desc;
 $('asset-size').textContent=((a.type==='matrix'||a.type==='layered')?a.data.width+' × '+a.data.height:'96 × 96')+' PX';$('detail-type').textContent=a.type==='matrix'?'LLM 像素矩阵':a.type==='layered'?'可编辑分层像素':'程序化动画';$('detail-res').textContent=(a.type==='matrix'||a.type==='layered')?a.data.width+' × '+a.data.height:'96 × 96';
 $('detail-frames').textContent=a.frames;$('detail-fps').textContent=a.fps+' FPS';$('fps-label').textContent=a.fps+' FPS';$('frame-count').textContent=a.frames+' FRAMES';$('frame-range').max=a.frames-1;
 const library=$('asset-list');library.replaceChildren();state.items.forEach(item=>{
  const b=document.createElement('button');b.className='asset-option'+(item.id===state.id?' active':'');b.type='button';const c=cv();renderAsset(c,item,0,state.edits[item.id]);const text=document.createElement('div'),n=document.createElement('b'),s=document.createElement('small');n.textContent=item.name;s.textContent=item.category+' · '+item.frames+'F';text.append(n,s);b.append(c,text);b.onclick=()=>choose(item.id);library.append(b);
 });$('asset-counter').textContent=String(state.items.length).padStart(2,'0');
 const grid=$('cel-grid');
 grid.hidden=a.type!=='layered';
 if(a.type==='layered'){
  renderCelTimeline(grid,a.data,{frame:state.frame,layerId:state.activeLayer,onSelect:selectCel});
  $('cel-selection').textContent='CEL · '+state.activeLayer+' / F'+String(state.frame+1).padStart(2,'0');
 }
 const track=$('frame-track');track.replaceChildren();thumbs=[];
 $('studio-cel-panel').classList.toggle('matrix-mode',a.type!=='layered');
 if(a.type!=='layered')for(let i=0;i<a.frames;i++){
  const b=document.createElement('button');b.type='button';b.className='frame-button';const c=cv();renderAsset(c,a,i,layers());
  const label=document.createElement('span');label.textContent='F'+String(i+1).padStart(2,'0');
  b.append(c,label);b.onclick=()=>{state.frame=i;state.play=false;draw();};track.append(b);thumbs.push(c);
 }
 renderLayers();draw();
}
function draw(){
 renderAsset($('studio-canvas'),current(),state.frame,layers());
 const onion=$('onion-canvas');
 const showOnion=onionEnabled&&!state.play&&current().frames>1&&(onionPrevious||onionFollowing);
 onion.hidden=!showOnion;
 if(showOnion){
  const ctxt=onion.getContext('2d');ctxt.clearRect(0,0,onion.width,onion.height);
  const ghost=document.createElement('canvas');ghost.width=onion.width;ghost.height=onion.height;
  if(onionPrevious){
   renderAsset(ghost,current(),(state.frame+current().frames-1)%current().frames,layers());
   ctxt.globalAlpha=onionFollowing?.55:1;ctxt.drawImage(ghost,0,0);
  }
  if(onionFollowing){
   renderAsset(ghost,current(),(state.frame+1)%current().frames,layers());
   ctxt.globalAlpha=onionPrevious?.55:1;ctxt.drawImage(ghost,0,0);
  }
  ctxt.globalAlpha=1;
 }
 const f=String(state.frame+1).padStart(2,'0'),count=String(current().frames).padStart(2,'0');
 $('stage-frame-label').textContent='FRAME '+f+' / '+count;$('transport-label').textContent=f+' / '+count;$('frame-range').value=state.frame;$('btn-play').textContent=state.play?'Ⅱ':'▶';
 $('frame-track').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===state.frame));
 if(isLayered())updateCelSelection($('cel-grid'),state.frame,state.activeLayer);
 drawSelection();
 drawExplosion();
}
function drawExplosion(){
 const a=current();if(!a||a.type!=='layered'||!explosionVisible)return;
 const d=a.data;
 const plates=explodedLayout(d.layers.length,explosionSpread);
 const lastPlate=plates.at(-1);
 const requiredWidth=Math.max(1280,Math.ceil(lastPlate.x+lastPlate.width+48));
 const explosionCanvas=$('exploded-canvas');
 if(explosionCanvas.width!==requiredWidth){
  explosionCanvas.width=requiredWidth;
  explosionCanvas.style.width=requiredWidth+'px';
 }
 renderExploded(explosionCanvas,d,state.frame,{activeLayer:state.activeLayer,spread:explosionSpread,solo:explosionSolo});
 $('exploded-frame').textContent='F'+String(state.frame+1).padStart(2,'0')+' / '+a.frames;
 $('exploded-total').textContent=d.layers.length+' REAL LAYERS';
 const index=d.layers.findIndex(l=>l.id===state.activeLayer);
 const layer=d.layers[index];if(!layer)return;
 $('exploded-active').textContent=layer.name;
 const inspection=renderSingleLayer($('focus-canvas'),d,layer.id,state.frame,{fit:focusFit,background:focusChecker?'checker':'dark'});
 const b=inspection.bounds;
 $('focus-layer-index').textContent=String(index+1).padStart(2,'0')+' / '+String(d.layers.length).padStart(2,'0');
 if($('focus-layer-name').textContent!==layer.name)$('focus-layer-name').textContent=layer.name;
 if($('focus-layer-id').textContent!==layer.id)$('focus-layer-id').textContent=layer.id;
 $('focus-pixels').textContent=b?String(b.pixels):'0';
 $('focus-bounds').textContent=b?b.width+' × '+b.height:'EMPTY';
 $('focus-layer-state').textContent=layer.visible===false?'HIDDEN':Math.round(layer.opacity*100)+'%';
 $('focus-zoom').textContent=(focusFit?'AUTO FIT':'FULL CANVAS')+' · '+inspection.scale+'×';
}
function selectFocusLayer(direction){
 const a=current();if(!a||a.type!=='layered')return;
 const d=a.data,index=d.layers.findIndex(l=>l.id===state.activeLayer);
 const next=(index+direction+d.layers.length)%d.layers.length;
 state.activeLayer=d.layers[next].id;
 renderLayers();
 const scroller=$('exploded-scroller'),plate=explodedLayout(d.layers.length,explosionSpread)[next];
 const left=Math.max(0,plate.x+plate.width/2-scroller.clientWidth/2);
 scroller.scrollTo({left,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function selectCel(layerId,frame){
 if(!isLayered())return;
 const a=current();
 if(!a.data.layers.some(l=>l.id===layerId)||!Number.isInteger(frame)||frame<0||frame>=a.frames)return;
 state.activeLayer=layerId;state.frame=frame;state.play=false;state.elapsed=0;
 selection=null;renderLayers();draw();
 $('cel-selection').textContent='CEL · '+layerId+' / F'+String(frame+1).padStart(2,'0');
}
function shift(n){state.frame=(state.frame+n+current().frames)%current().frames;state.play=false;state.elapsed=0;selection=null;draw();}
// Frames are processed only for the currently visible application surface.
// On hidden tabs, rAF still resumes naturally without paying for elapsed frames.
const visibleArt=new WeakSet();
const artObserver=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{
 for(const entry of entries){if(entry.isIntersecting)visibleArt.add(entry.target);else visibleArt.delete(entry.target);}
},{rootMargin:'120px'});
function watchArt(canvas){if(artObserver)artObserver.observe(canvas);}
function isArtVisible(canvas){return !artObserver||visibleArt.has(canvas);}
function loop(now){
 const dt=state.last?Math.min(100,now-state.last):0;state.last=now;
 if(document.hidden){requestAnimationFrame(loop);return;}
 if(!$('studio-page').hidden){
  if(state.play&&current()){
   state.elapsed+=dt*state.speed;const pace=1000/current().fps;
   if(state.elapsed>=pace){
    const steps=Math.min(100,Math.floor(state.elapsed/pace));state.elapsed%=pace;
    for(let i=0;i<steps;i++){const next=stepPlayback(state.frame,current().frames,state.direction,state.mode);state.frame=next.frame;state.direction=next.direction;}
    draw();
   }
  }
 }else{
  const tick=Math.floor(now/125);
  if(tick!==galleryTick){
   galleryTick=tick;
   for(const x of cards)if(isArtVisible(x.c))renderAsset(x.c,x.a,tick%x.a.frames,state.edits[x.a.id]);
   const hero=state.items.find(a=>a.id===POTION_ID),cv=$('hero-canvas');
   if(hero&&isArtVisible(cv))renderAsset(cv,hero,tick%hero.frames,state.edits[hero.id]);
  }
 }
 requestAnimationFrame(loop);
}
function tool(t){
 state.tool=state.tool===t?null:t;
 for(const v of ['pencil','erase','line','rect','rectfill','fill','select']){
  const el=$('tool-'+v);el.classList.toggle('active',state.tool===v);el.setAttribute('aria-pressed',String(state.tool===v));
 }
}
function drawSelection(){
 const overlay=$('selection-canvas'),ctx=overlay.getContext('2d'),a=current();
 ctx.clearRect(0,0,overlay.width,overlay.height);
 const active=selection&&a?.type==='layered'&&selection.layerId===state.activeLayer&&selection.frame===state.frame;
 overlay.hidden=!active;
 if(!active)return;
 const d=a.data,scale=Math.floor(Math.min(overlay.width/d.width,overlay.height/d.height));
 const ox=Math.floor((overlay.width-d.width*scale)/2),oy=Math.floor((overlay.height-d.height*scale)/2);
 const xa=Math.min(selection.x0,selection.x1),ya=Math.min(selection.y0,selection.y1);
 const w=Math.abs(selection.x1-selection.x0)+1,h=Math.abs(selection.y1-selection.y0)+1;
 ctx.strokeStyle='#ffcb8a';ctx.lineWidth=1;ctx.setLineDash([3,3]);
 ctx.strokeRect(ox+xa*scale+.5,oy+ya*scale+.5,w*scale-1,h*scale-1);ctx.setLineDash([]);
 $('selection-hint').textContent='选区 '+w+'×'+h+' @ '+xa+','+ya;
}
function repaintActiveCel(){
 const a=current();
 renderAsset($('studio-canvas'),a,state.frame,layers());
 if(thumbs[state.frame])renderAsset(thumbs[state.frame],a,state.frame,layers());
 drawExplosion();
 drawSelection();
}
function setCanvasPan(x,y){
 panX=Math.max(-150,Math.min(150,Math.round(x)));
 panY=Math.max(-150,Math.min(150,Math.round(y)));
 const host=$('studio-canvas').parentElement;
 host.style.setProperty('--pan-x',panX+'px');host.style.setProperty('--pan-y',panY+'px');
}
function beginPan(e){
 if(!isLayered())return;
 e.preventDefault();state.play=false;
 panDrag={id:e.pointerId,x:e.clientX,y:e.clientY,panX,panY};
 $('studio-canvas').setPointerCapture(e.pointerId);
 $('studio-canvas').style.cursor='grabbing';
}
function updatePan(e){
 if(!panDrag||e.pointerId!==panDrag.id)return;
 setCanvasPan(panDrag.panX+e.clientX-panDrag.x,panDrag.panY+e.clientY-panDrag.y);
}
function endPan(e){
 if(!panDrag||e.pointerId!==panDrag.id)return;
 panDrag=null;$('studio-canvas').style.cursor='crosshair';
}
function beginStroke(e){
 if(!state.tool)return;
 const c=$('studio-canvas'),a=current();
 if(!a||a.type!=='layered'){painting=true;state.play=false;c.setPointerCapture(e.pointerId);paint(e);return;}
 const start=pixelCoordinates(c,a.data,e.clientX,e.clientY);
 if(!start)return;
 state.play=false;draw();
 const isSelection=state.tool==='select';
 if(isSelection){
  selection={...{x0:start.x,y0:start.y,x1:start.x,y1:start.y},layerId:state.activeLayer,frame:state.frame};
  drawSelection();
 }
 const redoBefore=state.redo.slice();
 if(!isSelection)remember();
 activeStroke={
  tool:state.tool,layerId:state.activeLayer,frame:state.frame,start,last:start,
  rows:a.data.layers.find(l=>l.id===state.activeLayer).frames[state.frame].slice(),
  before:isSelection?null:state.undo.at(-1),redoBefore,changed:false,pointerId:e.pointerId
 };
 painting=true;c.setPointerCapture(e.pointerId);
 updateStroke(e);
}
function updateStroke(e){
 if(!painting)return;
 const a=current(),c=$('studio-canvas');
 if(!a||a.type!=='layered'){paint(e);return;}
 const st=activeStroke;if(!st||st.pointerId!==e.pointerId)return;
 const end=pixelCoordinates(c,a.data,e.clientX,e.clientY);
 if(!end)return;
 const d=a.data,symbol=st.tool==='erase'?'.':state.symbol;
 if(st.tool==='select'){
  selection.x1=end.x;selection.y1=end.y;drawSelection();return;
 }
 const l=d.layers.find(v=>v.id===st.layerId);
 let changed=0;
 if(st.tool==='pencil'||st.tool==='erase'){
  changed=paintLine(d,st.layerId,st.frame,st.last.x,st.last.y,end.x,end.y,symbol);
 }else if(st.tool==='fill'){
  if(!st.didFill){changed=paintFill(d,st.layerId,st.frame,end.x,end.y,symbol);st.didFill=true;}
 }else{
  // Rebuild geometric previews from their original Cel, so dragging the
  // endpoint never accumulates stray pixels from intermediate previews.
  l.frames[st.frame]=st.rows.slice();
  if(st.tool==='line')changed=paintLine(d,st.layerId,st.frame,st.start.x,st.start.y,end.x,end.y,symbol);
  if(st.tool==='rect'||st.tool==='rectfill')changed=paintRectangle(d,st.layerId,st.frame,st.start.x,st.start.y,end.x,end.y,symbol,{filled:st.tool==='rectfill'});
 }
 st.last=end;st.changed=st.changed||changed>0;
 repaintActiveCel();
}
function endStroke(e){
 if(!painting)return;
 const a=current(),st=activeStroke;painting=false;activeStroke=null;
 if(!a||a.type!=='layered'){persist();renderGallery();return;}
 if(st?.tool==='select'){drawSelection();return;}
 if(!st)return;
 // A no-op drag should not consume undo history or clear the redo chain.
 const unchanged=JSON.stringify(a.data)===st.before;
 if(unchanged){
  state.undo.pop();state.redo.push(...st.redoBefore);
 }else{
  const stored=persist();renderGallery();
  $('save-indicator').textContent=stored?'● 已保存 · 本地':'⚠ 请导出备份';
 }
 refresh();draw();
}
function paint(e){
 // Retained compatibility for explicitly imported legacy matrix projects.
 if(!state.tool)return;
 const c=$('studio-canvas'),r=c.getBoundingClientRect();
 const x=Math.floor((e.clientX-r.left)/r.width*96),y=Math.floor((e.clientY-r.top)/r.height*96);
 if(x<0||x>95||y<0||y>95)return;
 if(!state.edits[state.id])state.edits[state.id]={};const f=String(state.frame);
 if(!state.edits[state.id][f])state.edits[state.id][f]={};
 if(state.tool==='erase')delete state.edits[state.id][f][x+','+y];
 else state.edits[state.id][f][x+','+y]=$('brush-color').value;
 renderAsset(c,current(),state.frame,layers());
 if(thumbs[state.frame])renderAsset(thumbs[state.frame],current(),state.frame,layers());
}
function moveSelection(dx,dy){
 if(!isLayered()||!selection||selection.layerId!==state.activeLayer||selection.frame!==state.frame){
  notify('请先使用「选区」工具在当前图层框选一个区域。',true);return;
 }
 mutateLayer(d=>{
  const changed=moveRegion(d,state.activeLayer,state.frame,selection.x0,selection.y0,selection.x1,selection.y1,dx,dy);
  if(!changed)throw Error('选中区域没有可移动的像素');
  selection.x0+=dx;selection.x1+=dx;selection.y0+=dy;selection.y1+=dy;
 });
 drawSelection();
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);}
const png=c=>new Promise((ok,fail)=>c.toBlob(b=>b?ok(b):fail(Error('PNG 生成失败')),'image/png'));
const fileName=()=>current().name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
async function exportPng(){
 const a=current(),c=document.createElement('canvas');
 c.width=a.type==='layered'?a.data.width:SIZE;c.height=a.type==='layered'?a.data.height:SIZE;
 renderAsset(c,a,state.frame,layers());
 download(await png(c),fileName()+'-frame-'+(state.frame+1)+'.png');
 notify('当前帧已按原生像素分辨率下载 PNG。');
}
async function exportSheet(){
 const a=current(),w=a.type==='layered'?a.data.width:SIZE,h=a.type==='layered'?a.data.height:SIZE;
 const c=document.createElement('canvas');c.width=w*4;c.height=h*Math.ceil(a.frames/4);
 const context=c.getContext('2d');context.imageSmoothingEnabled=false;
 const frame=document.createElement('canvas');frame.width=w;frame.height=h;
 for(let i=0;i<a.frames;i++){
  renderAsset(frame,a,i,layers());
  context.drawImage(frame,(i%4)*w,Math.floor(i/4)*h);
 }
 download(await png(c),fileName()+'-spritesheet.png');
 notify('已按原生像素尺寸导出 4 列精灵图；没有二次采样。');
}
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
 if(raw.length>950000){notify('输入超过 950KB 限制。',true);return;}
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
 refresh();renderGallery();
 $('save-indicator').textContent=persist()?'● 已保存 · 本地':'⚠ 请导出备份';
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
 const before=JSON.stringify(current().data),redoBefore=state.redo.slice();
 remember();
 try{
  callback(current().data);
  current().data=validateLayered(current().data);
  if(JSON.stringify(current().data)===before){
   state.undo.pop();state.redo.push(...redoBefore);renderLayers();return;
  }
  updateLayered();
 }catch(e){
  current().data=JSON.parse(before);state.undo.pop();
  state.redo.push(...redoBefore);notify(e.message,true);refresh();
 }
}
function renderLayers(){
 const active=isLayered(),panel=$('layers-panel');
 panel.hidden=!active;if(!active)return;
 const data=current().data;
 $('refine-layer').disabled=!localModelAvailable;
 if(!data.layers.some(l=>l.id===state.activeLayer))state.activeLayer=data.layers.at(-1).id;
 const host=$('layer-list');host.replaceChildren();
 for(const layer of [...data.layers].reverse()){
  const row=document.createElement('div');row.className='layer-row'+(layer.id===state.activeLayer?' selected':'');
  const eye=document.createElement('button');eye.type='button';eye.className='layer-eye';eye.textContent=layer.visible?'◉':'○';eye.title=layer.visible?'隐藏图层':'显示图层';eye.setAttribute('aria-label',eye.title);
  eye.onclick=()=>mutateLayer(()=>{layer.visible=!layer.visible;});
  const select=document.createElement('button');select.type='button';select.className='layer-select';
  const b=document.createElement('strong');b.textContent=layer.name;
  const sub=document.createElement('small');sub.textContent=layer.id+' · '+Math.round(layer.opacity*100)+'%';
  select.append(b,sub);select.onclick=()=>{state.activeLayer=layer.id;selection=null;renderLayers();draw();};
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
  b.onclick=()=>{state.symbol=key;state.tool='pencil';for(const v of ['pencil','erase']){$('tool-'+v).classList.toggle('active',v==='pencil');$('tool-'+v).setAttribute('aria-pressed',String(v==='pencil'));}renderLayers();};
  pal.append(b);
 }
 const m=metrics(data);
 $('layer-metrics').textContent='COVERAGE '+m.coverage+'%  ·  MOTION '+m.meanMotion+'%  ·  LOOP SEAM '+m.seam+'%';
 updateCelSelection($('cel-grid'),state.frame,state.activeLayer);
 drawExplosion();
}
function beginLLMStatus(){
 fetch('./api/status',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('static');return r.json();}).then(cfg=>{
  if(cfg.available){localModelAvailable=true;$('refine-layer').disabled=!isLayered();$('llm-status').textContent='● 已连接本地模型代理：'+cfg.model+' · 支持自动生成';$('generate-llm').disabled=false;}
  else {localModelAvailable=false;$('refine-layer').disabled=true;$('llm-status').textContent='本地代理未配置模型。可使用 JSON 导入或新建画布。';$('generate-llm').disabled=true;}
 }).catch(()=>{
  localModelAvailable=false;$('refine-layer').disabled=true;
  $('llm-status').textContent='当前为 GitHub Pages 静态模式：复制 LLM 提示词，在任意文本模型中生成 JSON 后粘贴导入。';
  $('generate-llm').disabled=true;
 });
}
async function generateFromLLM(){
 const button=$('generate-llm'),idea=$('idea-input').value.trim();
 if(idea.length<4){notify('先描述你希望生成的像素动画主题。',true);return;}
 button.disabled=true;button.textContent='LLM 创作中…';notify('正在通过本地文本模型进行美术规划、分层绘制与校验。');
 try{
  const res=await fetch('./api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idea,styleId:$('art-style-select').value})});
  const output=await res.json();if(!res.ok)throw Error(output.error||'生成失败');
  const a=createLayeredAsset(output.asset);state.items.push(a);choose(a.id);persist();renderGallery();
  const issues=output.warnings?.length?' 质量提示：'+output.warnings.join('；'):'';
  notify('已生成 '+a.data.layers.length+' 层 / '+a.frames+' 帧，模型调用 '+output.attempts+' 次。'+issues);
 }catch(e){notify('LLM 生成失败：'+e.message,true);}
 finally{button.disabled=false;button.textContent='使用本地 LLM 生成 ✳';}
}
async function loadCuratedStudies(){
 try{
  const data=validateLayered(await loadPotionAsset());
  const asset=createLayeredAsset(data);
  asset.id=POTION_ID;
  asset.cn='原生文本像素创作 · 首件评审样品';
  asset.category='SOLE ART STUDY';
  asset.tone='health';
  asset.desc='文本 LLM 原生绘制的 64×64 像素矩阵：11 个可编辑语义图层、12 帧循环，不使用图片抠图或图片转像素。';
  state.items=[asset];state.id=asset.id;activateHistory(asset.id);
  // Restore previously edited native art and private local projects only after
  // the authoritative bundled sprite has been created.
  restore();
  state.activeLayer=state.items[0].data.layers.some(l=>l.id==='crimson_liquid')?'crimson_liquid':state.items[0].data.layers.at(-1).id;
  state.frame=0;state.play=true;state.id=POTION_ID;
  state.symbol=asset.data.palette.m?'m':Object.keys(asset.data.palette).find(k=>k!=='.')||'.';
  // Gallery visitors should never initialize 132 Cel controls, 11 layer
  // inspectors and palette widgets until they actually open Studio.
  renderGallery();
 }catch(e){
  document.getElementById('gallery-grid').textContent='药瓶动画加载失败：'+e.message;
  console.error('Vermilion load error',e);
 }
}
async function refineSelectedLayer(){
 if(!isLayered()){notify('请先选中分层像素资产。',true);return;}
 if(!localModelAvailable){notify('局部 LLM 修复需要在本地启动已配置的模型代理。',true);return;}
 const snapshotId=state.id,frame=state.frame,layerId=state.activeLayer;
 const data=current().data,idea=$('idea-input').value.trim();
 const px=id=>$(id).value.trim();
 const x=px('patch-x')===''?0:Number(px('patch-x')),y=px('patch-y')===''?0:Number(px('patch-y'));
 const width=px('patch-w')===''?data.width-x:Number(px('patch-w'));
 const height=px('patch-h')===''?data.height-y:Number(px('patch-h'));
 const bbox={x,y,width,height};
 if(Object.values(bbox).some(v=>!Number.isInteger(v))||x<0||y<0||width<1||height<1||x+width>data.width||y+height>data.height){
  notify('限定区域不合法：X/Y/宽/高应是画布内的整数坐标。',true);return;
 }
 if(idea.length<4){notify('请先描述本次要修改的内容（例如：液面更圆润，少两个气泡）。',true);return;}
 const button=$('refine-layer');button.disabled=true;button.textContent='正在生成受约束补丁…';
 notify('只允许修改图层 '+layerId+' 的 F'+(frame+1)+'，其他帧和图层锁定。');
 try{
  const res=await fetch('./api/refine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({asset:data,layerId,frames:[frame],bbox,idea})});
  const output=await res.json();if(!res.ok)throw Error(output.error||'局部生成失败');
  if(state.id!==snapshotId||state.frame!==frame||state.activeLayer!==layerId)throw Error('生成期间切换了资产或图层，请重新执行修复');
  remember();
  current().data=validateLayered(output.asset);
  updateLayered();
  const caution=output.diagnostics?.length?'；检测到 '+output.diagnostics.length+' 条提示，请人工复核':'';
  notify('补丁已通过冻结层校验，实际改变 '+output.changed+' 像素，模型请求 '+output.attempts+' 次。'+caution);
 }catch(e){notify('局部修复未应用：'+e.message,true);}
 finally{button.disabled=!localModelAvailable||!isLayered();button.textContent='✳ LLM 只重绘当前图层';}
}
function newProject(){
 try{
  const name=$('idea-input').value.trim().slice(0,55)||'Untitled Sprite';
  const a=createLayeredAsset(createBlankLayered(name,24,24,4));state.items.push(a);choose(a.id);
  state.symbol='K';persist();renderGallery();notify('已创建 24×24 / 4 帧的空白分层项目。请选中画笔，在画布上绘制。');
 }catch(e){notify(e.message,true);}
}
function events(){
 // Heavy exploded-layer geometry is only drawn when that part of the
 // editor is onscreen. IntersectionObserver wakes it on scrolling.
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
   const visible=entries.some(entry=>entry.isIntersecting&&!$('studio-page').hidden);
   if(visible!==explosionVisible){explosionVisible=visible;if(visible)drawExplosion();}
  },{rootMargin:'180px'});
  observer.observe(document.querySelector('.exploded-panel'));
 }else explosionVisible=true;
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=e=>{e.preventDefault();route(b.dataset.page);});
 $('focus-prev').onclick=()=>selectFocusLayer(-1);
 $('focus-next').onclick=()=>selectFocusLayer(1);
 $('focus-fit').onclick=()=>{
  focusFit=!focusFit;$('focus-fit').classList.toggle('active',focusFit);
  $('focus-fit').setAttribute('aria-pressed',String(focusFit));drawExplosion();
 };
 $('focus-bg').onclick=()=>{
  focusChecker=!focusChecker;$('focus-bg').classList.toggle('active',focusChecker);
  $('focus-bg').setAttribute('aria-pressed',String(focusChecker));drawExplosion();
 };
 $('focus-export').onclick=async()=>{
  try{
   const a=current();if(!a||a.type!=='layered')throw Error('请先打开分层作品');
   const native=document.createElement('canvas');native.width=a.data.width;native.height=a.data.height;
   renderSingleLayer(native,a.data,state.activeLayer,state.frame,{native:true});
   download(await png(native),fileName()+'-'+state.activeLayer+'-f'+String(state.frame+1).padStart(2,'0')+'.png');
   notify('已下载「'+state.activeLayer+'」的原尺寸透明 PNG。');
  }catch(e){notify(e.message,true);}
 };
 $('exploded-spread').oninput=e=>{explosionSpread=Number(e.target.value);$('exploded-distance').textContent=explosionSpread+'%';drawExplosion();};
 $('exploded-solo').onclick=()=>{explosionSolo=!explosionSolo;$('exploded-solo').classList.toggle('active',explosionSolo);$('exploded-solo').setAttribute('aria-pressed',String(explosionSolo));$('exploded-solo').textContent=explosionSolo?'恢复完整展开':'聚焦当前图层';drawExplosion();};
 $('exploded-canvas').addEventListener('click',e=>{
  const a=current();if(!a||a.type!=='layered')return;
  const box=e.currentTarget.getBoundingClientRect();
  const x=(e.clientX-box.left)/box.width*e.currentTarget.width,y=(e.clientY-box.top)/box.height*e.currentTarget.height;
  const i=layerAtPosition(x,y,a.data.layers.length,explosionSpread);
  if(i>=0){state.activeLayer=a.data.layers[i].id;renderLayers();drawExplosion();}
 });
 $('jump-exploded').onclick=()=>{
  $('exploded-title').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 };
 $('jump-composer').onclick=()=>{
  $('studio-composer-drawer').open=true;
  $('studio-composer-drawer').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 };
 $('hero-studio').onclick=()=>route('studio');$('hero-open').onclick=()=>{choose(POTION_ID);route('studio');};
 $('principle-open').onclick=()=>route('studio');$('studio-to-gallery').onclick=()=>route('gallery');
 $('btn-play').onclick=()=>{state.play=!state.play;state.elapsed=0;draw();};$('btn-prev').onclick=()=>shift(-1);$('btn-next').onclick=()=>shift(1);
 $('btn-restart').onclick=()=>{state.frame=0;state.play=true;state.elapsed=0;draw();};$('frame-range').oninput=e=>{state.frame=+e.target.value;state.play=false;draw();};
 $('speed-control').oninput=e=>{state.speed=+e.target.value;$('speed-value').textContent=state.speed+'×';};
 $('zoom-control').oninput=e=>{const v=+e.target.value;$('zoom-value').textContent=v+'×';$('studio-canvas').style.width=v*64+'px';$('studio-canvas').style.height=v*64+'px';$('onion-canvas').style.width=v*64+'px';$('onion-canvas').style.height=v*64+'px';$('selection-canvas').style.width=v*64+'px';$('selection-canvas').style.height=v*64+'px';$('studio-stage').style.setProperty('--grid-step',v+'px');};
 $('toggle-grid').onclick=()=>{const on=$('studio-stage').classList.toggle('grid-mode');$('toggle-grid').classList.toggle('active',on);};
 $('toggle-onion').onclick=()=>{
  onionEnabled=!onionEnabled;
  if(onionEnabled)state.play=false;
  $('toggle-onion').classList.toggle('active',onionEnabled);
  $('toggle-onion').setAttribute('aria-pressed',String(onionEnabled));
  draw();
 };
 $('tool-pencil').onclick=()=>tool('pencil');$('tool-erase').onclick=()=>tool('erase');
 for(const name of ['line','rect','rectfill','fill','select'])$('tool-'+name).onclick=()=>tool(name);
 const directionMap=[['selection-left',-1,0],['selection-right',1,0],['selection-up',0,-1],['selection-down',0,1]];
 for(const [id,dx,dy] of directionMap)$(id).onclick=()=>moveSelection(dx,dy);
 const c=$('studio-canvas');
 c.onpointerdown=e=>{
  if(e.button===1||e.altKey){beginPan(e);return;}
  if(e.button!==0&&e.pointerType==='mouse')return;beginStroke(e);
 };
 c.onpointermove=e=>panDrag?updatePan(e):updateStroke(e);
 c.onpointerup=e=>panDrag?endPan(e):endStroke(e);
 c.onpointercancel=e=>panDrag?endPan(e):endStroke(e);
 c.onlostpointercapture=e=>panDrag?endPan(e):endStroke(e);
 $('reset-pan').onclick=()=>setCanvasPan(0,0);
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

 // Layer × frame Cel commands operate on native rows, not composited images.
 $('cel-copy').onclick=()=>{
  if(!isLayered())return;
  celClipboard=copyCel(current().data,state.activeLayer,state.frame);
  notify('已复制 '+state.activeLayer+' / F'+(state.frame+1)+' 的 Cel。');
 };
 $('cel-paste').onclick=()=>{
  if(!isLayered()||!celClipboard){notify('先复制一个 Cel。',true);return;}
  mutateLayer(d=>pasteCel(d,state.activeLayer,state.frame,celClipboard));
 };
 $('cel-clear').onclick=()=>{if(isLayered())mutateLayer(d=>clearCel(d,state.activeLayer,state.frame));};
 $('cel-insert').onclick=()=>{if(!isLayered())return;mutateLayer(d=>{insertFrame(d,state.frame+1);state.frame++;});};
 $('cel-move-left').onclick=()=>{
  if(!isLayered()||state.frame===0)return;
  mutateLayer(d=>moveFrame(d,state.frame,state.frame-1));state.frame--;draw();
 };
 $('cel-move-right').onclick=()=>{
  if(!isLayered()||state.frame>=current().frames-1)return;
  mutateLayer(d=>moveFrame(d,state.frame,state.frame+1));state.frame++;draw();
 };
 $('cel-height').oninput=e=>{$('cel-scroll').style.maxHeight=e.target.value+'px';};
 $('play-mode').onchange=e=>{
  state.mode=e.target.value;state.direction=state.mode==='reverse'?-1:1;
  $('play-mode-readout').textContent=state.mode.toUpperCase();state.elapsed=0;
 };
 $('onion-prev').onchange=e=>{onionPrevious=e.target.checked;draw();};
 $('onion-next').onchange=e=>{onionFollowing=e.target.checked;draw();};
 $('onion-opacity').oninput=e=>{$('onion-canvas').style.opacity=String(Number(e.target.value)/100);};
 $('cel-scroll').style.maxHeight=$('cel-height').value+'px';
 $('diagnose-animation').onclick=()=>{
  if(!isLayered())return;
  const d=current().data;
  const stable=d.layers.filter(l=>/shadow|back_glass|glass_body|copper|cork|neck|metal|seal|front_rim/i.test(l.id)).map(l=>l.id);
  const report=inspectAnimation(d,{stableLayers:stable});
  const msg='帧数 '+report.frames+' · 平均变化 '+report.meanDelta+'px / 相邻帧 · 首尾差异 '+report.seamPixels+
   'px ('+report.seamRatio+'%) · 静止层异常 '+report.warnings.length+' 项。'+
   (report.warnings.length?' 请检查 '+report.warnings.slice(0,3).map(w=>w.layer+' F'+(w.frame+1)).join('、'):' 锁定层保持稳定。')+
   ' 本面板不评价艺术质量。';
  $('diagnosis-output').textContent=msg;notify('已完成结构和循环诊断；最终审美由你判断。');
 };

 $('new-layer-project').onclick=newProject;
 $('refine-layer').onclick=refineSelectedLayer;
 $('generate-llm').onclick=generateFromLLM;
 $('toggle-json-import').onclick=()=>{$('json-import-panel').hidden=!$('json-import-panel').hidden;};$('import-json').onclick=importJson;
 $('copy-llm-prompt').onclick=async()=>{const chosen=$('art-style-select').value;
 const appendix=chosen==='ashen-reliquary'
  ?'\n\nART STYLE (original PixelWeave Ashen Reliquary): prioritize a storied functional silhouette, intentionally clustered material highlights, quiet light hierarchy, animated semantic parts anchored to a stable structure. Use no recognizable Blasphemous sprites or iconography. Favor material credibility over generic symmetrical RPG pictograms.'
  :'';
 const text=makeLayeredPrompt($('idea-input').value)+appendix;try{await navigator.clipboard.writeText(text);notify('完整 LLM 像素动画生成规范已复制。');}catch{$('json-import-panel').hidden=false;$('json-input').value=text;$('json-input').select();notify('复制受限：已在文本框选中提示词，请手动复制。',true);}};
 document.addEventListener('keydown',e=>{if($('studio-page').hidden||e.target.matches('input,textarea,button'))return;if(e.code==='Space'){e.preventDefault();state.play=!state.play;draw();}if(e.code==='ArrowLeft')shift(-1);if(e.code==='ArrowRight')shift(1);if(e.code==='KeyO')$('toggle-onion').click();if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();timeTravel(e.shiftKey?'redo':'undo');}if((e.ctrlKey||e.metaKey)&&e.code==='KeyY'){e.preventDefault();timeTravel('redo');}});
 window.addEventListener('hashchange',()=>{if(location.hash==='#studio'||location.hash==='#gallery')route(location.hash.slice(1),{record:false,scroll:false});});
 window.addEventListener('popstate',()=>route(location.hash==='#studio'?'studio':'gallery',{record:false,scroll:false}));
}
mountSiteNavigation();events();
watchArt($('hero-canvas'));
// The optional model proxy is irrelevant to landing-page visitors.
let modelStatusRequested=false;
const composer=$('studio-composer-drawer');
composer.addEventListener('toggle',()=>{
 if(composer.open&&!modelStatusRequested){modelStatusRequested=true;beginLLMStatus();}
});
loadCuratedStudies().then(()=>{
 route(location.hash==='#studio'?'studio':'gallery',{record:false,scroll:false});
 // Only consume the transfer on the target tab after the native asset is loaded.
 try{
  const raw=sessionStorage.getItem(TRANSFER_KEY);
  if(!raw)return;
  sessionStorage.removeItem(TRANSFER_KEY);
  if(raw.length>180000)throw Error('转入工程体积超过安全限制');
  const asset=createLayeredAsset(validateLayered(JSON.parse(raw)));
  state.items.push(asset);
  choose(asset.id);persist();renderGallery();
  route('studio',{record:true,scroll:false});
  notify('图片像素化工程已导入：'+asset.data.width+'×'+asset.data.height+'，'+(Object.keys(asset.data.palette).length-1)+' 色；可继续逐像素编辑。');
 }catch(e){notify('图片像素化工程导入失败：'+e.message,true);}
});requestAnimationFrame(loop);
