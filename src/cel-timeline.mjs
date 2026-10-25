import {celStats} from './cel-ops.mjs';
export function renderCelTimeline(host,data,{frame=0,layerId=null,onSelect=()=>{}}={}){
 const fragment=document.createDocumentFragment(),n=data.layers[0].frames.length;
 const grid=document.createElement('div');grid.className='cel-grid';grid.style.setProperty('--frames',n);
 const corner=document.createElement('span');corner.className='cel-corner';corner.textContent='LAYER / FRAME';grid.append(corner);
 for(let i=0;i<n;i++){
  const b=document.createElement('button');b.type='button';b.className='cel-frame-head';b.textContent='F'+String(i+1).padStart(2,'0');b.dataset.frame=String(i);
  b.title='选择第 '+(i+1)+' 帧';b.onclick=()=>onSelect(layerId,i);grid.append(b);
 }
 for(const layer of data.layers.slice().reverse()){
  const name=document.createElement('button');name.type='button';name.className='cel-row-title';
  const label=document.createElement('span');label.textContent=layer.name;
  name.append(label);name.title=layer.name;name.dataset.layer=layer.id;name.onclick=()=>onSelect(layer.id,frame);grid.append(name);
  for(let i=0;i<n;i++){
   const b=document.createElement('button');b.type='button';b.className='cel-cell';b.dataset.frame=String(i);b.dataset.layer=layer.id;
   const stats=celStats(data,layer.id,i);b.classList.toggle('filled',!stats.empty);
   b.textContent=stats.empty?'·':'◆';
   b.setAttribute('aria-label',layer.name+'，第 '+(i+1)+' 帧，'+(stats.empty?'空白':'有像素'));
   b.title=layer.name+' / F'+String(i+1).padStart(2,'0')+' / '+stats.pixels+' 像素';
   b.onclick=()=>onSelect(layer.id,i);grid.append(b);
  }
 }
 fragment.append(grid);host.replaceChildren(fragment);
 updateCelSelection(host,frame,layerId);
}
export function updateCelSelection(host,frame,layerId){
 for(const b of host.querySelectorAll('[data-frame]')){
  const active=Number(b.dataset.frame)===frame,both=active&&b.dataset.layer===layerId;
  b.classList.toggle('current-frame',active);
  b.classList.toggle('selected-cel',both);
  if(b.classList.contains('cel-cell'))b.setAttribute('aria-pressed',String(both));
 }
 for(const b of host.querySelectorAll('.cel-row-title'))b.classList.toggle('selected-layer',b.dataset.layer===layerId);
}
