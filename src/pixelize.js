import {mountSiteNavigation} from './site-nav.mjs';
import {logicalSize,exportSize,maxExportScale,pixelizeImageData,toLayeredProject,TRANSFER_KEY} from './pixelize-core.mjs';

const $=id=>document.getElementById(id);
let source=null,sourceName='',sourceWidth=0,sourceHeight=0,rendered=null,renderTimer=0,loadVersion=0;
const makeCanvas=(w,h)=>{const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;};
const settings=()=>({
 edge:Number($('px-edge-number').value),
 colors:Number($('px-colors-number').value),
 dither:$('px-dither').checked,
 threshold:Number($('px-alpha').value),
 sampling:$('px-sampling').value
});
function status(message,error=false){$('px-status').textContent=message;$('px-status').classList.toggle('error',error);}
function clampInt(value,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):min;}
function syncInput(id,numberId,outputId,min,max,suffix,value){
 const next=clampInt(value,min,max);
 $(id).value=String(next);if(numberId)$(numberId).value=String(next);
 $(outputId).textContent=next+suffix;
 if(id==='px-edge')document.querySelectorAll('[data-edge]').forEach(b=>b.classList.toggle('active',Number(b.dataset.edge)===next));
 if(id==='px-colors')return;
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
 const canvas=makeCanvas(width,height),ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.imageSmoothingEnabled=sampling!=='nearest';
 if(ctx.imageSmoothingEnabled)ctx.imageSmoothingQuality='high';
 ctx.clearRect(0,0,width,height);
 ctx.drawImage(source,0,0,width,height);
 return ctx.getImageData(0,0,width,height);
}
function renderPixelImage(){
 if(!source)return;
 const cfg=settings(),dim=logicalSize(sourceWidth,sourceHeight,cfg.edge);
 const data=drawSample(dim.width,dim.height,cfg.sampling);
 rendered=pixelizeImageData(data,{colors:cfg.colors,dither:cfg.dither,alphaThreshold:cfg.threshold});
 const canvas=$('px-result');canvas.width=rendered.width;canvas.height=rendered.height;
 canvas.getContext('2d').putImageData(new ImageData(rendered.data,rendered.width,rendered.height),0,0);
 const frame=$('px-frame');
 frame.style.display='block';frame.style.width=Math.min(550,Math.max(150,dim.width*6))+'px';
 frame.style.aspectRatio=dim.width+' / '+dim.height;
 $('px-empty-result').hidden=true;
 $('px-result-dim').textContent=dim.width+' × '+dim.height;
 $('px-stat-grid').textContent='GRID · '+dim.width+'×'+dim.height;
 $('px-stat-colors').textContent='PALETTE · '+rendered.palette.length+' COLOURS';
 $('px-download-native').disabled=false;
 $('px-send-studio').disabled=false;
 updateScale();drawGrid();
 status('已生成 '+dim.width+'×'+dim.height+' 原生像素，'+rendered.palette.length+' 个实色。可直接导出或继续在动画工作站修画。');
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
  source?.close?.();source=bitmap;sourceWidth=w;sourceHeight=h;sourceName=file.name.replace(/\.[^.]+$/,'').slice(0,50)||'pixelized';
  $('px-file-info').textContent=file.name+' · '+w+'×'+h+' · '+Math.ceil(file.size/1024)+' KB';
  drawOriginal();renderPixelImage();
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
function sendStudio(){
 if(!source)return;
 try{
  const cfg=settings(),dim=logicalSize(sourceWidth,sourceHeight,Math.min(cfg.edge,64));
  if(dim.width<8||dim.height<8)throw Error('原图长宽比过于极端，无法适配工作站最小 8px 的画布');
  const data=drawSample(dim.width,dim.height,cfg.sampling);
  const pixel=pixelizeImageData(data,{colors:Math.min(cfg.colors,31),dither:cfg.dither,alphaThreshold:cfg.threshold});
  const project=toLayeredProject(pixel,sourceName+' · Pixelized');
  sessionStorage.setItem(TRANSFER_KEY,JSON.stringify(project));
  window.location.href='../index.html#studio';
 }catch(e){status('送入工作站失败：'+e.message+'。你仍可下载 PNG。',true);}
}
mountSiteNavigation();
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
for(const [slider,num,min,max,suffix] of [['px-edge','px-edge-number',8,512,' px'],['px-colors','px-colors-number',2,256,' 色']]){
 $(slider).addEventListener('input',e=>syncInput(slider,num,slider+'-value',min,max,suffix,e.target.value));
 $(num).addEventListener('change',e=>syncInput(slider,num,slider+'-value',min,max,suffix,e.target.value));
}
for(const button of document.querySelectorAll('[data-edge]'))button.addEventListener('click',()=>syncInput('px-edge','px-edge-number','px-edge-value',8,512,' px',button.dataset.edge));
for(const button of document.querySelectorAll('[data-scale]'))button.addEventListener('click',()=>{$('px-scale').value=button.dataset.scale;updateScale();});
$('px-sampling').addEventListener('change',scheduleRender);
$('px-dither').addEventListener('change',scheduleRender);
$('px-alpha').addEventListener('input',e=>{$('px-alpha-value').textContent=e.target.value;scheduleRender();});
$('px-scale').addEventListener('input',updateScale);
$('px-grid').addEventListener('change',drawGrid);
$('px-download-native').addEventListener('click',()=>exportNative().catch(e=>status(e.message,true)));
$('px-download-scaled').addEventListener('click',()=>exportScaled().catch(e=>status(e.message,true)));
$('px-send-studio').addEventListener('click',sendStudio);
if('ResizeObserver' in window)new ResizeObserver(drawGrid).observe($('px-frame'));
window.addEventListener('resize',drawGrid);
