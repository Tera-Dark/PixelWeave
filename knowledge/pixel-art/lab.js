import {validateLayered,renderLayered,metrics} from '../../src/layered.js';
const $=id=>document.getElementById(id);
let selected=null,index=[],frame=0,playing=true,last=0,overlay=false;
const cv=$('art'),ctx=cv.getContext('2d',{willReadFrequently:true});
const temp=document.createElement('canvas');temp.width=384;temp.height=384;
function note(s){$('message').textContent=s;}
function readAsset(item){return fetch('./examples/reference/'+item.path).then(r=>{if(!r.ok)throw Error('请求素材失败');return r.json();}).then(validateLayered);}
async function choose(i){
 const item=index[i];if(!item)return;
 try{selected={item,data:await readAsset(item)};frame=0;playing=true;
  $('asset-title').textContent=selected.data.name;
  $('asset-meta').textContent=selected.data.width+'×'+selected.data.height+' px · '+selected.data.layers.length+' LAYERS · '+selected.data.layers[0].frames.length+' FRAMES';
  $('timeline').max=selected.data.layers[0].frames.length-1;$('timeline').value=0;
  $('asset-download').href='./examples/reference/'+item.path;$('asset-download').setAttribute('download',item.path);
  renderLayers();draw();
  document.querySelectorAll('.library-button').forEach((b,n)=>b.classList.toggle('active',n===i));
  note('该项目是代码手工编排的原创分层教学例图；图层开关用于结构研究，不会改写源文件。');
 }catch(e){note('案例加载失败：'+e.message);}
}
function renderLayers(){
 const host=$('layers');host.replaceChildren();if(!selected)return;
 for(const layer of [...selected.data.layers].reverse()){
  const row=document.createElement('div');row.className='layer-row';const button=document.createElement('button');button.className=layer.visible?'':'off';button.textContent=layer.visible?'◉':'○';
  button.title=layer.visible?'隐藏此图层':'显示此图层';button.setAttribute('aria-label',button.title+' '+layer.name);
  button.onclick=()=>{layer.visible=!layer.visible;renderLayers();draw();};
  const text=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');
  strong.textContent=layer.name;small.textContent=layer.id+' · '+Math.round(layer.opacity*100)+'%';
  text.append(strong,small);row.append(button,text);host.append(row);
 }
}
function draw(){
 if(!selected)return;const d=selected.data,n=d.layers[0].frames.length;
 renderLayered(cv,d,frame);
 if(overlay&&n>1){
  renderLayered(temp,d,(frame-1+n)%n);
  const prev=temp.getContext('2d').getImageData(0,0,384,384).data;
  const cur=ctx.getImageData(0,0,384,384).data;
  const step=Math.min(384/d.width,384/d.height);
  ctx.save();ctx.fillStyle='rgba(255,183,125,0.42)';
  for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){
   const center=((Math.floor(y*step+step/2)*384+Math.floor(x*step+step/2))*4);
   if(prev[center]!==cur[center]||prev[center+1]!==cur[center+1]||prev[center+2]!==cur[center+2]||prev[center+3]!==cur[center+3])
    ctx.fillRect(x*step,y*step,step,step);
  }ctx.restore();
 }
 $('timeline').value=frame;$('frame-number').textContent='F'+String(frame+1).padStart(2,'0')+' / '+String(n).padStart(2,'0');
 const m=metrics(d);$('metrics').textContent='LAYERS '+m.layers+'\nCOLORS '+m.colors+'\nMOTION '+m.meanMotion+'%\nLOOP SEAM '+m.seam+'%';
 $('play').textContent=playing?'Ⅱ 暂停':'▶ 播放';
}
function tick(now){if(last===0)last=now;if(playing&&selected&&now-last>=1000/selected.data.fps){frame=(frame+1)%selected.data.layers[0].frames.length;last=now;draw();}requestAnimationFrame(tick);}
$('play').onclick=()=>{playing=!playing;draw();};$('prev').onclick=()=>{if(!selected)return;playing=false;frame=(frame-1+selected.data.layers[0].frames.length)%selected.data.layers[0].frames.length;draw();};
$('next').onclick=()=>{if(!selected)return;playing=false;frame=(frame+1)%selected.data.layers[0].frames.length;draw();};
$('timeline').oninput=e=>{playing=false;frame=+e.target.value;draw();};
$('difference').onchange=e=>{overlay=e.target.checked;draw();};
$('reset').onclick=()=>{if(!selected)return;selected.data.layers.forEach(l=>l.visible=true);renderLayers();draw();};
async function init(){
 try{const r=await fetch('./examples/reference/index.json');if(!r.ok)throw Error('索引不可访问');const result=await r.json();index=result.items||result.examples||[];
  $('library').replaceChildren(...index.map((item,i)=>{const b=document.createElement('button');b.className='library-button';const title=document.createElement('strong');title.textContent=item.id;const small=document.createElement('small');small.textContent=item.level+' · '+item.frames+' FRAMES · '+item.layers.length+' LAYERS';b.append(title,small);b.onclick=()=>choose(i);return b;}));
  await choose(1);
 }catch(e){note('无法载入教学案例：'+e.message);}
 requestAnimationFrame(tick);
}
init();
