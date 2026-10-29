import {putHandoff} from './asset-handoff.mjs';
import {mountSiteNavigation} from './site-nav.mjs';
import {logicalSize,exportSize,maxExportScale,pixelizeImageData,preserveImageData,estimateGrid,sampleCellColors,removeBackgroundSpecks} from './pixelize-core.mjs';

const $=id=>document.getElementById(id);
let source=null,sourceName='',sourceWidth=0,sourceHeight=0,analysisData=null,sourceFile=null,restored=null,restoreMetadata=null,restoreAvailable=false,rendered=null,renderTimer=0,loadVersion=0,restoreVersion=0;
const makeCanvas=(w,h)=>{const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;};
const settings=()=>({
 edge:Number($('px-edge-number').value),
 colors:Number($('px-colors-number').value),
 dither:$('px-dither').checked,
 threshold:Number($('px-alpha').value),
 sampling:$('px-sampling').value,
 cleanup:$('px-cleanup').checked,preserve:$('px-preserve').checked,offsetX:Number($('px-offset-x').value)/100,offsetY:Number($('px-offset-y').value)/100
});
function status(message,error=false){$('px-status').textContent=message;$('px-status').classList.toggle('error',error);}
function clampInt(value,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):min;}
function syncInput(id,numberId,outputId,min,max,suffix,value){
 const next=clampInt(value,min,max);
 $(id).value=String(next);if(numberId)$(numberId).value=String(next);
 $(outputId).textContent=next+suffix;
 if(id==='px-edge')document.querySelectorAll('[data-edge]').forEach(b=>b.classList.toggle('active',Number(b.dataset.edge)===next));
 scheduleRender();
}
function updateScale(){
 const raw=$('px-scale').value.trim(),value=Number(raw),valid=raw!==''&&Number.isSafeInteger(value)&&value>=1;
 $('px-scale-value').textContent=valid?value+'×':'无效倍率';
 document.querySelectorAll('[data-scale]').forEach(b=>b.classList.toggle('active',Number(b.dataset.scale)===value));
 const scaled=$('px-download-scaled');
 if(!rendered){scaled.disabled=true;return;}
 $('px-scale-limit').textContent='当前网格最高可导出 '+maxExportScale(rendered.width,rendered.height)+'×（最长边 16384px / 最多 4800 万像素）';
 try{
  const size=exportSize(rendered.width,rendered.height,valid?value:NaN);
  scaled.disabled=false;$('px-output-info').textContent='原生 '+rendered.width+'×'+rendered.height+' → 导出 '+size.width+'×'+size.height+'（'+value+'×）';
  $('px-stat-scale').textContent='EXPORT · '+size.width+'×'+size.height;
 }catch(e){
  scaled.disabled=true;$('px-output-info').textContent=e.message+'。原生 PNG 仍可导出。';
  $('px-stat-scale').textContent='EXPORT · INVALID';
 }
}
function scheduleRender(){
 clearTimeout(renderTimer);
 if(!source)return;
 renderTimer=setTimeout(()=>{try{renderPixelImage();}catch(e){status('处理失败：'+e.message,true);}},85);
}
function drawSample(width,height,sampling){
 const cfg=settings();
 if(sampling==='dominant'&&analysisData)return sampleCellColors(analysisData,width,height,{offsetX:cfg.offsetX,offsetY:cfg.offsetY,alphaThreshold:cfg.threshold});
 const canvas=makeCanvas(width,height),ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.imageSmoothingEnabled=sampling!=='nearest';
 if(ctx.imageSmoothingEnabled)ctx.imageSmoothingQuality='high';
 ctx.clearRect(0,0,width,height);
 // Extend the edge when shifting the grid, so phase adjustments never create a transparent seam.
 const dx=-cfg.offsetX,dy=-cfg.offsetY;
 ctx.drawImage(source,dx,dy,width,height);
 if(dx>0)ctx.drawImage(source,0,0,1,sourceHeight,0,dy,dx,height);
 if(dx<0)ctx.drawImage(source,sourceWidth-1,0,1,sourceHeight,width+dx,dy,-dx,height);
 if(dy>0)ctx.drawImage(canvas,0,Math.max(0,dy),width,1,0,0,width,dy);
 if(dy<0)ctx.drawImage(canvas,0,Math.max(0,height+dy-1),width,1,0,height+dy,width,-dy);
 return ctx.getImageData(0,0,width,height);
}
function renderPixelImage(){
 if(!source)return;
 const cfg=settings(),dim=restored?{width:restored.width,height:restored.height}:logicalSize(sourceWidth,sourceHeight,cfg.edge);
 const data=restored||drawSample(dim.width,dim.height,cfg.sampling);
 rendered=cfg.preserve?preserveImageData(data,{alphaThreshold:cfg.threshold}):pixelizeImageData(data,{colors:cfg.colors,dither:cfg.dither,alphaThreshold:cfg.threshold});
 if(cfg.cleanup)rendered=removeBackgroundSpecks(rendered);
 const colorCount=rendered.paletteSize??rendered.palette.length;
 const canvas=$('px-result');canvas.width=rendered.width;canvas.height=rendered.height;
 canvas.getContext('2d').putImageData(new ImageData(rendered.data,rendered.width,rendered.height),0,0);
 const frame=$('px-frame');
 frame.style.display='block';frame.style.width=Math.min(100,100*dim.width/dim.height)+'%';
 frame.style.aspectRatio=dim.width+' / '+dim.height;
 $('px-empty-result').hidden=true;
 $('px-result-dim').textContent=dim.width+' × '+dim.height;
 $('px-stat-grid').textContent='GRID · '+dim.width+'×'+dim.height;
 $('px-stat-colors').textContent='PALETTE · '+colorCount+' COLOURS';
 $('px-download-native').disabled=false;
 $('px-send-studio').disabled=false;
 updateScale();drawGrid();drawComparison();
 status((restored?'高质量恢复：':'已生成 ')+dim.width+'×'+dim.height+' 原生像素，'+colorCount+' 个实色。'+(cfg.cleanup?'背景孤点清理：'+rendered.removedSpecks+' 个像素。':'')+'可直接导出或继续在动画工作站修画。');
}
function drawGrid(){
 const overlay=$('px-overlay'),frame=$('px-frame');
 if(!rendered||!$('px-grid').checked||!frame.getBoundingClientRect().width){overlay.width=1;overlay.height=1;return;}
 const rect=frame.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 overlay.width=Math.round(rect.width*dpr);overlay.height=Math.round(rect.height*dpr);
 const ctx=overlay.getContext('2d');
 const sx=overlay.width/rendered.width,sy=overlay.height/rendered.height;
 if(sx<4||sy<4){return;}
 ctx.beginPath();ctx.strokeStyle='rgba(6,14,24,.3)';ctx.lineWidth=Math.max(1,dpr*.65);
 for(let x=1;x<rendered.width;x++) {const xx=Math.round(x*sx)+.5;ctx.moveTo(xx,0);ctx.lineTo(xx,overlay.height);}
 for(let y=1;y<rendered.height;y++) {const yy=Math.round(y*sy)+.5;ctx.moveTo(0,yy);ctx.lineTo(overlay.width,yy);}
 ctx.stroke();
}
function drawOriginal(){
 const max=1000,ratio=Math.min(1,max/Math.max(sourceWidth,sourceHeight));
 const w=Math.max(1,Math.round(sourceWidth*ratio)),h=Math.max(1,Math.round(sourceHeight*ratio)),canvas=$('px-original');
 canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(source,0,0,w,h);
 canvas.style.aspectRatio=w+' / '+h;
 $('px-original-dim').textContent=sourceWidth+' × '+sourceHeight;
 $('px-empty-original').hidden=true;
}
async function decodeImage(file){
 if('createImageBitmap' in window)return await createImageBitmap(file,{imageOrientation:'from-image'});
 const url=URL.createObjectURL(file);
 try{
  return await new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);
   img.onerror=()=>reject(Error('浏览器无法解码此图片'));
   img.src=url;
  });
 }finally{URL.revokeObjectURL(url);}
}
async function loadFile(file){
 if(!file)return;
 if(!['image/png','image/jpeg','image/webp','image/gif','image/bmp'].includes(file.type)){status('仅支持 PNG、JPG、WEBP、GIF、BMP 图片。',true);return;}
 if(file.size>20*1024*1024){status('单张图片不能超过 20 MB。',true);return;}
 const version=++loadVersion;
 try{
  status('正在读取图片并准备像素网格…');
  const bitmap=await decodeImage(file);
  if(version!==loadVersion){bitmap.close?.();return;}
  const w=bitmap.width||bitmap.naturalWidth,h=bitmap.height||bitmap.naturalHeight;
  if(!w||!h||w*h>24000000){bitmap.close?.();throw Error('图片尺寸不合法或超过 2400 万像素');}
  source?.close?.();source=bitmap;sourceFile=file;restored=null;restoreMetadata=null;sourceWidth=w;sourceHeight=h;sourceName=file.name.replace(/\.[^.]+$/,'').slice(0,50)||'pixelized';
  $('px-file-info').textContent=file.name+' · '+w+'×'+h+' · '+Math.ceil(file.size/1024)+' KB';
  $('px-detect').disabled=false;$('px-restore').disabled=!restoreAvailable; $('px-detect-info').textContent='适合已有像素风格的 AI 图；估算后可继续手动调整。';
  for(const axis of ['x','y']){$('px-offset-'+axis).value='0';$('px-offset-'+axis+'-value').textContent='0%';}
  const ratio=Math.min(1,2048/Math.max(w,h)),analysis=makeCanvas(Math.max(1,Math.round(w*ratio)),Math.max(1,Math.round(h*ratio)));
  const analysisCtx=analysis.getContext('2d',{willReadFrequently:true});analysisCtx.drawImage(source,0,0,analysis.width,analysis.height);analysisData=analysisCtx.getImageData(0,0,analysis.width,analysis.height);
  drawOriginal();detectGrid();renderPixelImage();
 }catch(e){if(version===loadVersion)status('图片导入失败：'+e.message,true);}
}
function savePNG(canvas,filename){
 return new Promise((resolve,reject)=>{
  canvas.toBlob(blob=>{
   if(!blob){reject(Error('当前浏览器未能生成 PNG'));return;}
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),3000);resolve();
  },'image/png');
 });
}
async function exportNative(){
 if(!rendered)return;
 await savePNG($('px-result'),sourceName+'-'+rendered.width+'x'+rendered.height+'-native.png');
 status('原生像素 PNG 已导出，不包含插值模糊。');
}
async function exportScaled(){
 if(!rendered)return;
 const scale=Number($('px-scale').value),size=exportSize(rendered.width,rendered.height,scale);
 const canvas=makeCanvas(size.width,size.height),ctx=canvas.getContext('2d');
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage($('px-result'),0,0,size.width,size.height);
 await savePNG(canvas,sourceName+'-'+size.width+'x'+size.height+'-'+scale+'x.png');
 status('已导出 '+scale+'× 最近邻放大 PNG；每个原生像素严格对应 '+scale+'×'+scale+' 方块。');
}
async function sendStudio(){
 if(!source||!rendered)return;
 try{
  const png=await new Promise((resolve,reject)=>$('px-result').toBlob(blob=>blob?resolve(blob):reject(Error('无法生成 PNG')),'image/png'));
  await putHandoff({name:sourceName,source:sourceFile,png,width:rendered.width,height:rendered.height,kind:restored?'grid-restoration':'pixel-conversion',parameters:{...settings(),width:rendered.width,height:rendered.height,sourceWidth,sourceHeight,grid:restored?restoreMetadata:null}});
  window.location.href='../workspace/#editor';
 }catch(e){status('送入原尺寸编辑器失败：'+e.message+'；可以下载 PNG 后手动导入。',true);}
}

mountSiteNavigation();
async function restoreHighQuality(){
 if(!sourceFile||!restoreAvailable)return;
 const version=loadVersion,request=++restoreVersion,file=sourceFile,button=$('px-restore');button.disabled=true;
 $('px-restore-info').textContent='正在本地分析网格并恢复，请稍候…';
 try{
  const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('读取图片失败'));reader.readAsDataURL(file);});
  const response=await fetch('/api/pixel-fixer/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:dataUrl})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'恢复失败');
  if(version!==loadVersion||request!==restoreVersion)return;
  const bitmap=await createImageBitmap(await (await fetch('data:image/png;base64,'+result.png)).blob());
  if(version!==loadVersion||request!==restoreVersion){bitmap.close();return;}
  const canvas=makeCanvas(result.width,result.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);bitmap.close();
  restored=ctx.getImageData(0,0,result.width,result.height);restoreMetadata={stepX:result.stepX,stepY:result.stepY};
  $('px-preserve').checked=true;$('px-dither').checked=false;
  $('px-restore-info').textContent='恢复网格 '+result.width+'×'+result.height+'；原图格距约 '+result.stepX+'×'+result.stepY+' px。调整原生长边、对齐或采样方式会切回手动网格。';
  renderPixelImage();
 }catch(e){if(version===loadVersion){$('px-restore-info').textContent='恢复失败：'+e.message+'。请检查 Python 及依赖，或使用手动网格。';status('高质量恢复失败：'+e.message,true);}}
 finally{button.disabled=!sourceFile||!restoreAvailable;}
}
$('px-restore').addEventListener('click',restoreHighQuality);
if(['localhost','127.0.0.1'].includes(location.hostname))fetch('/api/pixel-fixer/status').then(r=>r.ok?r.json():null).then(info=>{restoreAvailable=!!info?.available;$('px-restore').disabled=!sourceFile||!restoreAvailable;if(!restoreAvailable)$('px-restore-info').textContent='此服务未启用高质量恢复，请用项目本地服务启动。';}).catch(()=>{$('px-restore-info').textContent='本地服务不可用，手动像素化仍可使用。';});
else $('px-restore-info').textContent='高质量恢复需要本地服务；在线版可使用下方浏览器模式。';

$('px-file').addEventListener('change',e=>{loadFile(e.target.files?.[0]);e.target.value='';});
const drop=$('px-drop');
drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('px-file').click();}});
for(const evt of ['dragenter','dragover'])drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.add('dragging');});
for(const evt of ['dragleave','drop'])drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.remove('dragging');});
drop.addEventListener('drop',e=>loadFile([...e.dataTransfer.files].find(file=>file.type.startsWith('image/'))));
window.addEventListener('paste',e=>{
 if(e.target.matches?.('input,textarea,[contenteditable=true]'))return;
 const file=[...(e.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));
 if(file){e.preventDefault();loadFile(file);}
});
function useManualGrid(){restoreVersion++;if(restored){restored=null;$('px-restore-info').textContent='已切回手动网格；点击高质量网格恢复可重新处理原图。';}}
for(const [slider,num,min,max,suffix] of [['px-edge','px-edge-number',8,512,' px'],['px-colors','px-colors-number',2,256,' 色']]){
 $(slider).addEventListener('input',e=>{if(slider==='px-edge')useManualGrid();syncInput(slider,num,slider+'-value',min,max,suffix,e.target.value);});
 $(num).addEventListener('change',e=>{if(slider==='px-edge')useManualGrid();syncInput(slider,num,slider+'-value',min,max,suffix,e.target.value);});
}
for(const button of document.querySelectorAll('[data-edge]'))button.addEventListener('click',()=>{useManualGrid();syncInput('px-edge','px-edge-number','px-edge-value',8,512,' px',button.dataset.edge);});
for(const button of document.querySelectorAll('[data-scale]'))button.addEventListener('click',()=>{$('px-scale').value=button.dataset.scale;updateScale();});
function detectGrid(){
 try{
  useManualGrid();
  const grid=estimateGrid(analysisData);
  if(!grid){$('px-detect-info').textContent='没有找到可靠网格，请手动调整原生长边与对齐。';return;}
  const pitch=grid.pitch*sourceWidth/analysisData.width,edge=clampInt(Math.max(sourceWidth,sourceHeight)/pitch,8,512);
  for(const [axis,offset] of [['x',grid.offsetX],['y',grid.offsetY]]){
   const value=Math.round((offset>0.5?offset-1:offset)*100);
   $('px-offset-'+axis).value=String(value);$('px-offset-'+axis+'-value').textContent=value+'%';
  }
  $('px-detect-info').textContent='估算源像素约 '+pitch.toFixed(1)+' px，输出长边 '+edge+' px；网格可能不完全统一，可手动微调。';
  syncInput('px-edge','px-edge-number','px-edge-value',8,512,' px',edge);
 }catch(e){$('px-detect-info').textContent='网格估算不可用：'+e.message+'；请手动设定原生长边。';}
}
$('px-detect').addEventListener('click',detectGrid);
for(const axis of ['x','y'])$('px-offset-'+axis).addEventListener('input',e=>{useManualGrid();$('px-offset-'+axis+'-value').textContent=e.target.value+'%';scheduleRender();});
$('px-preserve').addEventListener('change',scheduleRender);
$('px-cleanup').addEventListener('change',scheduleRender);
$('px-sampling').addEventListener('change',()=>{useManualGrid();scheduleRender();});
$('px-dither').addEventListener('change',scheduleRender);
$('px-alpha').addEventListener('input',e=>{$('px-alpha-value').textContent=e.target.value;scheduleRender();});
$('px-scale').addEventListener('input',updateScale);
$('px-grid').addEventListener('change',()=>{drawGrid();drawComparisonGrid();});
$('px-download-native').addEventListener('click',()=>exportNative().catch(e=>status(e.message,true)));
$('px-download-scaled').addEventListener('click',()=>exportScaled().catch(e=>status(e.message,true)));
$('px-send-studio').addEventListener('click',()=>sendStudio());
function drawComparison(){
 if(!rendered||!source)return;
 const frame=$('px-compare-frame'),original=$('px-compare-original'),result=$('px-compare-result');
 const preview=$('px-original');original.width=preview.width;original.height=preview.height;original.getContext('2d').drawImage(preview,0,0);
 result.width=rendered.width;result.height=rendered.height;result.getContext('2d').putImageData(new ImageData(rendered.data,rendered.width,rendered.height),0,0);
 frame.style.aspectRatio=sourceWidth+' / '+sourceHeight;frame.hidden=false;layoutComparison();$('px-compare-empty').hidden=true;$('px-compare-range').disabled=false;
 drawComparisonGrid();
}
function layoutComparison(){
 const frame=$('px-compare-frame'),stage=frame.parentElement;if(frame.hidden||!sourceWidth||!stage.clientWidth)return;
 const availableWidth=Math.max(0,stage.clientWidth-40),availableHeight=Math.max(0,stage.clientHeight-40);
 const width=Math.max(1,Math.min(availableWidth,availableHeight*sourceWidth/sourceHeight)),height=width*sourceHeight/sourceWidth;
 frame.style.width=width+'px';
 if(rendered){const ratio=rendered.width/rendered.height,innerWidth=Math.min(width,height*ratio),innerHeight=innerWidth/ratio;
  for(const id of ['px-compare-result','px-compare-grid']){const canvas=$(id);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';canvas.style.left=(width-innerWidth)/2+'px';canvas.style.top=(height-innerHeight)/2+'px';}}
}
function drawComparisonGrid(){
 const grid=$('px-compare-grid'),frame=$('px-compare-frame');if(!rendered||frame.hidden||!$('px-grid').checked||!frame.getBoundingClientRect().width){grid.width=1;grid.height=1;return;}
 const rect=$('px-compare-result').getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);grid.width=Math.round(rect.width*dpr);grid.height=Math.round(rect.height*dpr);
 const sx=grid.width/rendered.width,sy=grid.height/rendered.height;if(sx<4||sy<4)return;
 const ctx=grid.getContext('2d');ctx.strokeStyle='rgba(6,14,24,.3)';ctx.lineWidth=Math.max(1,dpr*.65);ctx.beginPath();
 for(let x=1;x<rendered.width;x++){const xx=Math.round(x*sx)+.5;ctx.moveTo(xx,0);ctx.lineTo(xx,grid.height);}for(let y=1;y<rendered.height;y++){const yy=Math.round(y*sy)+.5;ctx.moveTo(0,yy);ctx.lineTo(grid.width,yy);}ctx.stroke();
}
$('px-compare-range').addEventListener('input',e=>{const value=e.target.value;$('px-compare-clip').style.clipPath='inset(0 0 0 '+value+'%)';$('px-compare-line').style.left=value+'%';});
const compareFrame=$('px-compare-frame');let comparePointer=null;
function moveComparison(event){const rect=compareFrame.getBoundingClientRect();if(!rect.width)return;const range=$('px-compare-range');range.value=String(Math.max(0,Math.min(100,Math.round((event.clientX-rect.left)*100/rect.width))));range.dispatchEvent(new Event('input'));}
compareFrame.addEventListener('pointerdown',e=>{if(e.button!==0)return;comparePointer=e.pointerId;compareFrame.setPointerCapture(e.pointerId);moveComparison(e);});
compareFrame.addEventListener('pointermove',e=>{if(e.pointerId===comparePointer)moveComparison(e);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])compareFrame.addEventListener(type,e=>{if(e.pointerId===comparePointer)comparePointer=null;});
for(const [id,mode] of [['px-mode-compare','compare'],['px-mode-side','side']])$(id).addEventListener('click',()=>{
 const compare=mode==='compare';$('px-compare').hidden=!compare;document.querySelector('.px-preview-grid').hidden=compare;$('px-mode-compare').setAttribute('aria-pressed',String(compare));$('px-mode-side').setAttribute('aria-pressed',String(!compare));drawGrid();layoutComparison();drawComparisonGrid();
});
if('ResizeObserver' in window){const observer=new ResizeObserver(()=>{drawGrid();layoutComparison();drawComparisonGrid();});observer.observe($('px-frame'));observer.observe($('px-compare').querySelector('.px-compare-stage'));}
window.addEventListener('resize',()=>{drawGrid();layoutComparison();drawComparisonGrid();});
