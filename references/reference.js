/**
 * PixelWeave Reference Atlas
 * Displays original artists' CC0 frames from their original sites.
 * The reference viewer is deliberately isolated from the editable assets.
 * All analysis remains in the user's browser; nothing is uploaded or trained.
 */
import {framePosition,previewIndices,validGrid,frameDimensions} from './viewer-core.mjs';
const $=id=>document.getElementById(id);
let entries=[],visible=[],selected=null,source=null,frame=0,playing=true,last=0,speed=1;
let localObjectURL=null,noteTimer=null,differenceDisabled=false;
const canvas=$('ref-canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const imageCache=new Map();
const storeKey='pixelweave.reference-atlas.v1';
let memory={saved:[],notes:{}};
try{const v=JSON.parse(localStorage.getItem(storeKey)||'{}');if(v&&Array.isArray(v.saved)&&v.notes)memory=v;}catch{}
function persist(){try{localStorage.setItem(storeKey,JSON.stringify(memory));}catch{$('save-status').textContent='浏览器禁止本地保存：可手动复制笔记';}}
function setStatus(message){$('remote-info').textContent=message;}
function favorite(id){return memory.saved.includes(id);}
function labelSource(item){return item.mode==='external'?'SOURCE ONLY / 原站阅读':item.mode==='frames'?'FRAME SET / 原作者 8 帧':'SPRITESHEET / 原作者原图';}
function renderLibrary(){
 const q=$('search').value.trim().toLowerCase(),cat=$('category').value;
 visible=entries.filter(x=>(cat==='all'||x.group===cat)&&(!$('only-playable').checked||x.mode!=='external')&&(!$('only-saved').checked||favorite(x.id))&&(!q||[x.title,x.author,x.group,x.question,...x.tags].join(' ').toLowerCase().includes(q)));
 if($('sort').value==='author')visible.sort((a,b)=>a.author.localeCompare(b.author));
 if($('sort').value==='frames')visible.sort((a,b)=>(b.frames||0)-(a.frames||0));
 $('result-count').textContent=visible.length+' / '+entries.length;
 $('ref-list').replaceChildren(...visible.map(item=>{
  const b=document.createElement('button');b.type='button';b.className='atlas-ref'+(item.id===selected?.id?' active':'');
  const strong=document.createElement('strong');strong.textContent=(favorite(item.id)?'★ ':'')+item.title;
  const small=document.createElement('small');small.textContent=item.author+' · '+item.license+' · '+(item.frames?item.frames+' 帧':'制作流程');
  const tag=document.createElement('span');tag.className='atlas-tag';tag.textContent=item.mode==='external'?'原站链接':'可逐帧播放';
  const thumb=document.createElement('canvas');thumb.width=66;thumb.height=66;thumb.className='atlas-source-thumb';
  const copy=document.createElement('div');copy.className='atlas-source-copy';copy.append(strong,small,tag);
  b.append(thumb,copy);b.onclick=()=>choose(item);
  if(item.mode!=='external'){
   const url=item.sheet||item.images[0];
   cachedImage(url).then(img=>{
    if(!thumb.isConnected)return;
    const tc=thumb.getContext('2d');renderBackground(tc,66,66);
    tc.imageSmoothingEnabled=false;
    const fw=item.sheet?Math.floor(img.naturalWidth/item.cols):img.naturalWidth;
    const fh=item.sheet?Math.floor(img.naturalHeight/item.rows):img.naturalHeight;
    const scale=Math.max(1,Math.floor(Math.min(54/fw,54/fh)));
    const dx=Math.round((66-fw*scale)/2),dy=Math.round((66-fh*scale)/2);
    tc.drawImage(img,0,0,fw,fh,dx,dy,fw*scale,fh*scale);
   }).catch(()=>{});
  }else{
   const tc=thumb.getContext('2d');renderBackground(tc,66,66);
   tc.fillStyle='#e5b08a';tc.font='25px monospace';tc.fillText('◇',19,40);
  }
  return b;
 }));
}
function field(id,value){$(id).textContent=value==null?'—':String(value);}
function panel(item){
 field('study-title',item.title);field('study-author',item.author.toUpperCase()+' / '+item.group);
 field('credit-author',item.author);field('credit-site',new URL(item.url).hostname);
 field('credit-license',item.license);field('credit-note',item.note||'保留作者署名；源图片来自作者页面。');
 $('original-link').href=item.url;
 $('main-source-link').href=item.url;
 $('favorite').setAttribute('aria-pressed',String(favorite(item.id)));
 $('favorite').textContent=favorite(item.id)?'★ 已收藏':'☆ 收藏';
 $('study-points').replaceChildren(...[item.question,'逐帧寻找保持不变的锚点与变化的主体。','检查动作首尾是否自然衔接，以及像素簇是否完整。'].map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
 $('study-notes').value=memory.notes[item.id]||'';field('save-status','笔记仅在此浏览器保存');
 field('mode-label',item.mode==='external'?'原站研究':'逐帧画面');
 field('fps-label',item.fps?item.fps+' FPS*':'以原站为准');
 field('size-label','—');
 field('asset-count',item.frames?item.frames+' FRAMES':'EXTERNAL');
 field('media-state',labelSource(item));
}
function cachedImage(url){
 if(!imageCache.has(url))imageCache.set(url,loadImage(url).catch(e=>{imageCache.delete(url);throw e;}));
 return imageCache.get(url);
}
function loadImage(url){
 return new Promise((resolve,reject)=>{
  const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(Error('图片未能从作者网站加载'));image.src=url;
 });
}
async function choose(item){
 if(localObjectURL){URL.revokeObjectURL(localObjectURL);localObjectURL=null;}
 selected=item;source=null;frame=0;playing=true;differenceDisabled=false;last=0;
 $('difference').disabled=false;$('difference').checked=false;$('onion').checked=false;$('background').checked=true;
 $('speed').value='1';speed=1;
 panel(item);renderLibrary();
 if(item.mode==='external'){
  playing=false;ctx.clearRect(0,0,canvas.width,canvas.height);
  drawPlaceholder('原作保留在作者网站','点击「查看原作者页面」浏览；下载合法源文件后可导入下方工具逐帧研究。');
  setStatus(item.note||'版权或素材结构不适合直接在本站播放；可以在作者网站查看。');
  updateControls();renderContact();return;
 }
 setStatus('正在从原作者网站读取素材预览…');drawPlaceholder('LOADING ORIGINAL FRAMES','从原作者页面读取 CC0 动画');
 try{
  const imgs=await Promise.all((item.images||[item.sheet]).map(cachedImage));
  if(selected!==item)return;
  let cols=item.cols||1,rows=item.rows||1;
  const dim=frameDimensions(imgs[0].naturalWidth,imgs[0].naturalHeight,cols,rows);
  source={imgs,cols,rows,width:item.images?imgs[0].naturalWidth:dim.width,height:item.images?imgs[0].naturalHeight:dim.height,total:item.images?imgs.length:cols*rows,isLocal:false};
  $('import-cols').value=item.cols||1;$('import-rows').value=item.rows||1;
  field('size-label',source.width+' × '+source.height);
  setStatus('已加载作者原始精灵帧；没有复制进 PixelWeave 仓库。演示速度为参考库建议值。若跨域限制阻止像素读取，请用下方本地导入功能。');
  renderContact();draw();updateControls();
 }catch(e){if(selected!==item)return;playing=false;drawPlaceholder('SOURCE NOT AVAILABLE','图片跨域、外站限制或离线。请打开原作者页面或导入源精灵表。');setStatus(e.message);updateControls();}
}
function drawPlaceholder(title,sub){
 const c=ctx,w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);c.fillStyle='#101b2a';c.fillRect(0,0,w,h);
 c.fillStyle='#e4b08f';c.font='bold 17px monospace';c.textAlign='center';c.fillText(title,w/2,h/2-12);
 c.fillStyle='#a8bdca';c.font='12px sans-serif';const lines=sub.length>50?[sub.slice(0,50),sub.slice(50)]:[sub];
 lines.forEach((v,i)=>c.fillText(v,w/2,h/2+22+i*18));c.textAlign='left';
}
function sourcePart(s,index){
 if(s.imgs.length>1)return {img:s.imgs[index%s.imgs.length],sx:0,sy:0,width:s.width,height:s.height};
 const point=framePosition(index,s.cols,s.rows);
 return {img:s.imgs[0],sx:point.x*s.width,sy:point.y*s.height,width:s.width,height:s.height};
}
function drawSourceFrame(c,s,index,x,y,scale,alpha=1){
 const part=sourcePart(s,index);
 c.save();c.globalAlpha=alpha;c.imageSmoothingEnabled=false;
 c.drawImage(part.img,part.sx,part.sy,part.width,part.height,x,y,part.width*scale,part.height*scale);
 c.restore();
}
function drawingGeometry(s,w,h){
 const scale=Math.max(1,Math.floor(Math.min((w-42)/s.width,(h-42)/s.height,12)));
 return {scale,x:Math.round((w-s.width*scale)/2),y:Math.round((h-s.height*scale)/2)};
}
function renderBackground(c,w,h,checker=true){
 c.fillStyle='#111e30';c.fillRect(0,0,w,h);
 if(checker)for(let y=0;y<h;y+=16)for(let x=0;x<w;x+=16)
  if(((x/16)+(y/16))%2===0){c.fillStyle='#1e3042';c.fillRect(x,y,16,16);}
}
function pixels(s,index){
 const tmp=document.createElement('canvas');tmp.width=s.width;tmp.height=s.height;const c=tmp.getContext('2d',{willReadFrequently:true});
 drawSourceFrame(c,s,index,0,0,1);return c.getImageData(0,0,s.width,s.height).data;
}
function draw(){
 if(!source||!selected)return;
 const w=canvas.width,h=canvas.height,g=drawingGeometry(source,w,h);
 renderBackground(ctx,w,h,$('background').checked);
 if($('onion').checked&&source.total>1)drawSourceFrame(ctx,source,(frame-1+source.total)%source.total,g.x,g.y,g.scale,.22);
 drawSourceFrame(ctx,source,frame,g.x,g.y,g.scale);
 if($('difference').checked&&source.total>1&&!differenceDisabled){
  try{
   const curr=pixels(source,frame),prev=pixels(source,(frame-1+source.total)%source.total);
   for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
    const i=4*(y*source.width+x),delta=Math.abs(curr[i]-prev[i])+Math.abs(curr[i+1]-prev[i+1])+Math.abs(curr[i+2]-prev[i+2])+Math.abs(curr[i+3]-prev[i+3]);
    if(delta>65){ctx.fillStyle='rgba(255,222,131,.35)';ctx.fillRect(g.x+x*g.scale,g.y+y*g.scale,g.scale,g.scale);}
   }
   field('analysis-label','像素帧差分');
  }catch(e){
   differenceDisabled=true;$('difference').checked=false;$('difference').disabled=true;
   field('analysis-label','跨域 · 仅预览');setStatus('外站不允许读取像素差分：正常帧动画仍可播放。要做深度差分，请在下方导入已获授权的本地 PNG。');
  }
 }else if(!differenceDisabled)field('analysis-label',source.isLocal?'本地可拆解':'外站预览');
 updateControls();updateContactSelection();
}
function updateControls(){
 const count=source?.total||1;
 $('timeline').max=String(Math.max(0,count-1));$('timeline').value=String(frame);
 $('frame-label').textContent='F'+String(frame+1).padStart(2,'0')+' / '+String(count).padStart(2,'0');
 $('play').textContent=playing?'Ⅱ':'▶';
 for(const id of ['prev','next','play'])$(id).disabled=!source;
 $('timeline').disabled=!source;
}
function renderContact(){
 const host=$('contact');host.replaceChildren();
 if(!source){field('contact-label','SOURCE LINK');return;}
 const sample=previewIndices(source.total,12);field('contact-label',source.total+' FRAMES · '+sample.length+' SAMPLES');
 for(const f of sample){
  const btn=document.createElement('button');btn.type='button';btn.title='切换到第 '+(f+1)+' 帧';
  const thumb=document.createElement('canvas');thumb.width=46;thumb.height=46;
  const c=thumb.getContext('2d');renderBackground(c,46,46,true);
  const g=drawingGeometry(source,46,46);
  drawSourceFrame(c,source,f,g.x,g.y,g.scale);
  const caption=document.createElement('span');caption.textContent='F'+String(f+1).padStart(2,'0');
  btn.dataset.frame=String(f);btn.append(thumb,caption);
  btn.onclick=()=>{frame=f;playing=false;draw();};host.append(btn);
 }
 updateContactSelection();
}
function updateContactSelection(){for(const b of $('contact').children)b.classList.toggle('active',Number(b.dataset.frame)===frame);}
function tick(now){
 if(last===0)last=now;
 const dt=Math.min(now-last,150);last=now;
 if(playing&&source&&selected){tick.elapsed=(tick.elapsed||0)+dt*speed;if(tick.elapsed>=1000/(selected.fps||8)){tick.elapsed%=1000/(selected.fps||8);frame=(frame+1)%source.total;draw();}}
 requestAnimationFrame(tick);
}
function shift(n){if(!source)return;frame=(frame+n+source.total)%source.total;playing=false;tick.elapsed=0;draw();}
$('prev').onclick=()=>shift(-1);$('next').onclick=()=>shift(1);
$('play').onclick=()=>{if(!source)return;playing=!playing;tick.elapsed=0;updateControls();};
$('timeline').oninput=e=>{if(!source)return;frame=+e.target.value;playing=false;draw();};
$('speed').onchange=e=>{speed=Number(e.target.value);};
for(const id of ['onion','difference','background'])$(id).onchange=()=>draw();
$('reset').onclick=()=>{$('onion').checked=false;$('difference').checked=false;$('background').checked=true;frame=0;speed=1;$('speed').value='1';playing=!!source;tick.elapsed=0;draw();};
$('favorite').onclick=()=>{if(!selected)return;memory.saved=favorite(selected.id)?memory.saved.filter(v=>v!==selected.id):[...memory.saved,selected.id];persist();panel(selected);renderLibrary();};
$('study-notes').oninput=e=>{if(!selected)return;memory.notes[selected.id]=e.target.value;persist();$('save-status').textContent='已保存在此浏览器';};
for(const id of ['search','category','sort','only-playable','only-saved'])$(id).addEventListener(id==='search'?'input':'change',renderLibrary);
$('clear-filters').onclick=()=>{
 $('search').value='';$('category').value='all';$('sort').value='featured';
 $('only-playable').checked=false;$('only-saved').checked=false;renderLibrary();
};
$('surprise').onclick=()=>{const pool=visible.length?visible:entries;if(!pool.length)return;const other=pool.filter(x=>x.id!==selected?.id);choose((other.length?other:pool)[Math.floor(Math.random()*(other.length||pool.length))]);};
$('import-file').onchange=async e=>{
 const f=e.target.files?.[0];if(!f)return;
 if(!/^image\/(png|webp)$/.test(f.type)){field('import-status','只支持 PNG / WebP 原始精灵表');return;}
 if(f.size>16*1024*1024){field('import-status','文件不得超过 16MB');return;}
 try{
  const url=URL.createObjectURL(f),img=await loadImage(url);
  if(localObjectURL)URL.revokeObjectURL(localObjectURL);localObjectURL=url;
  const cols=Number($('import-cols').value),rows=Number($('import-rows').value);
  if(!validGrid(img.naturalWidth,img.naturalHeight,cols,rows))throw Error('指定帧网格无法整除原图宽高');
  source={imgs:[img],cols,rows,width:img.naturalWidth/cols,height:img.naturalHeight/rows,total:cols*rows,isLocal:true};
  frame=0;playing=true;differenceDisabled=false;$('difference').disabled=false;
  field('size-label',source.width+' × '+source.height);field('mode-label','本地源精灵表');
  field('import-status','本地载入 '+f.name+' · '+cols*rows+' 帧；未上传到任何服务器。');
  setStatus('本地素材已加载，洋葱皮和逐像素差分可用。版权与来源记录仍以原作者页面为准。');
  renderContact();draw();
 }catch(err){field('import-status',err.message);}
};
$('apply-grid').onclick=()=>{
 if(!source||source.imgs.length!==1){field('import-status','请先选择单张本地 PNG / WebP 精灵表');return;}
 const img=source.imgs[0],cols=Number($('import-cols').value),rows=Number($('import-rows').value);
 if(!validGrid(img.naturalWidth,img.naturalHeight,cols,rows)){field('import-status','网格不能整除原图片尺寸，请核对列数和行数。');return;}
 source={...source,cols,rows,width:img.naturalWidth/cols,height:img.naturalHeight/rows,total:cols*rows};
 frame=0;playing=false;field('size-label',source.width+' × '+source.height);field('import-status','已经按 '+cols+' 列 × '+rows+' 行重新切帧。');renderContact();draw();
};
// The Atlas is a workstation: the study surface stays visible while rails
// can collapse independently. UI preferences are intentionally local only.
const preferenceKey='pixelweave.atlas.layout.v1';
let layoutPreference={library:true,inspector:true,tab:'notes'};
try{
 const stored=JSON.parse(localStorage.getItem(preferenceKey)||'null');
 if(stored&&typeof stored==='object'){
  layoutPreference.library=stored.library!==false;
  layoutPreference.inspector=stored.inspector!==false;
  layoutPreference.tab=stored.tab==='source'?'source':'notes';
 }
}catch{}
function persistLayout(){try{localStorage.setItem(preferenceKey,JSON.stringify(layoutPreference));}catch{}}
function applyLayout(){
 const w=$('atlas-workspace');
 w.classList.toggle('library-hidden',!layoutPreference.library);
 w.classList.toggle('inspector-hidden',!layoutPreference.inspector);
 $('toggle-library').setAttribute('aria-pressed',String(layoutPreference.library));
 $('toggle-inspector').setAttribute('aria-pressed',String(layoutPreference.inspector));
 $('toggle-library').textContent=layoutPreference.library?'☰ 素材':'☰ 显示素材';
 $('toggle-inspector').textContent=layoutPreference.inspector?'▤ 研究':'▤ 显示研究';
 const source=layoutPreference.tab==='source';
 $('panel-notes').hidden=source;
 $('panel-source').hidden=!source;
 $('tab-notes').setAttribute('aria-selected',String(!source));
 $('tab-source').setAttribute('aria-selected',String(source));
 $('tab-notes').tabIndex=source?-1:0;
 $('tab-source').tabIndex=source?0:-1;
}
$('toggle-library').onclick=()=>{layoutPreference.library=!layoutPreference.library;persistLayout();applyLayout();};
$('toggle-inspector').onclick=()=>{layoutPreference.inspector=!layoutPreference.inspector;persistLayout();applyLayout();};
$('tab-notes').onclick=()=>{layoutPreference.tab='notes';persistLayout();applyLayout();};
$('tab-source').onclick=()=>{layoutPreference.tab='source';persistLayout();applyLayout();};
function showShortcuts(show){
 $('shortcut-panel').hidden=!show;
 $('keyboard-help').setAttribute('aria-expanded',String(show));
}
$('keyboard-help').onclick=()=>showShortcuts($('shortcut-panel').hidden);
$('close-shortcuts').onclick=()=>showShortcuts(false);
document.addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey)return;
 const el=e.target;
 if(el?.closest?.('input,textarea,select,[contenteditable=true]'))return;
 if(e.key==='Escape'){showShortcuts(false);return;}
 if(e.key==='/'){e.preventDefault();$('search').focus();return;}
 if(e.key==='ArrowLeft'&&source){e.preventDefault();shift(-1);return;}
 if(e.key==='ArrowRight'&&source){e.preventDefault();shift(1);return;}
 if((e.key===' '||e.code==='Space')&&source){e.preventDefault();$('play').click();return;}
 if((e.key==='f'||e.key==='F')&&selected){e.preventDefault();$('favorite').click();}
});
applyLayout();

async function init(){
 try{
  const result=await fetch('./curation.json',{cache:'no-cache'});if(!result.ok)throw Error('参考索引不可访问');
  const json=await result.json();entries=json.items||[];field('source-total',entries.length);renderLibrary();
  if(entries.length)await choose(entries[0]);
 }catch(e){setStatus('无法加载参考库：'+e.message);drawPlaceholder('LIBRARY UNAVAILABLE','检查 GitHub Pages 的 references/curation.json 文件');}
 requestAnimationFrame(tick);
}
init();
