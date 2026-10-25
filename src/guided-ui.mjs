/**
 * Browser UI for explicit human-approved LLM authoring. No model request is
 * made on page load; both network requests and publishing are user-triggered.
 */
import {renderLayered} from './layered.js';
const KEY='pixelweave.guided.draft.v1';
export function mountGuidedWorkbench({notify,onPublish,getBrief,getStyle,isModelAvailable}){
 const $=id=>document.getElementById(id);
 const host=$('guided-workbench');
 if(!host)return;
 let draft=null,view=null,busy=false,frame=0;
 const controls=['guided-start','guided-resume','guided-accept','guided-next','guided-retry','guided-publish','guided-import','guided-export'];
 const note=(m,bad=false)=>{$('guided-status').textContent=m;$('guided-status').classList.toggle('error',bad);};
 const checkedDraft=()=>{
  try{const s=localStorage.getItem(KEY);if(s&&s.length<115000)return JSON.parse(s);}
  catch{}return null;
 };
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(draft));}catch{note('存储空间不足：请导出草稿 JSON 文件备份。',true);}};
 function setBusy(value){
  busy=value;
  for(const id of controls)$(id).disabled=value;
  if(value)note('本阶段正在请求文本模型与执行结构校验；此前批准的图层不会被覆盖。');
 }
 function paint(){
  const preview=view?.preview,approved=view?.approvedAsset;
  $('guided-preview-wrap').hidden=!preview;
  if(!preview)return;
  const total=preview.layers[0].frames.length;
  frame=Math.min(frame,total-1);
  $('guided-frame').max=String(total-1);
  $('guided-frame').value=String(frame);
  $('guided-frame-label').textContent='F'+String(frame+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');
  renderLayered($('guided-preview'),preview,frame);
  const base=$('guided-approved');
  if(approved)renderLayered(base,approved,frame);
  else base.getContext('2d').clearRect(0,0,base.width,base.height);
 }
 function display(){
  $('guided-stage').hidden=!view;
  $('guided-phase').textContent=view?({'review-director':'等待导演审阅','ready-layer':'等待下一层','review-layer':'等待图层审阅',complete:'已完成'}[view.phase]||view.phase):'尚未开始';
  $('guided-resume').hidden=!(!view&&checkedDraft());
  $('guided-accept').hidden=!view||!['review-director','review-layer'].includes(view.phase);
  $('guided-retry').hidden=!view||!['review-director','review-layer'].includes(view.phase);
  $('guided-next').hidden=!view||view.phase!=='ready-layer';
  $('guided-publish').hidden=!view||view.phase!=='complete';
  $('guided-start').textContent=view?'从新主题开始（替换当前草稿）':'启动引导式创作';
  if(!view)return;
  const stage=({'review-director':'请审查整体设计','ready-layer':'下一层等待生成','review-layer':'请审查真实像素','complete':'制作完成，可以导入 Studio'})[view.phase];
  $('guided-progress').textContent=stage+' · 已批准 '+view.approved+' / '+view.all+' 层 · 草稿版本 '+view.revision+' · 模型 '+view.model;
  const plan=$('guided-plan');plan.replaceChildren();
  const title=document.createElement('strong');title.textContent=view.plan?.name||'未命名导演方案';plan.append(title);
  const concept=document.createElement('p');concept.textContent=view.plan?.concept||'该导演方案未提供额外概念说明。';plan.append(concept);
  if(view.plan){
   const anchor=document.createElement('p');anchor.textContent='稳定锚点：'+(view.plan.anchors.join('、')||'未指定');plan.append(anchor);
   const swatches=document.createElement('div');swatches.className='guided-swatches';
   for(const [key,value] of Object.entries(view.plan.palette)){
    if(value==='transparent')continue;
    const s=document.createElement('span');s.textContent=key+' '+value;s.style.borderLeft='8px solid '+value;swatches.append(s);
   }
   plan.append(swatches);
   const list=document.createElement('ol');list.className='guided-layer-list';
   view.plan.layers.forEach((l,i)=>{
    const item=document.createElement('li');item.textContent=l.name+' · '+(l.kind==='static'?'静态锁定':'动态')+' · '+l.purpose;
    if(i<view.approved)item.className='is-approved';
    if(view.awaiting===l.id)item.className='is-current';
    list.append(item);
   });plan.append(list);
  }
  $('guided-history').textContent='最近操作：'+view.history.slice(-4).map(h=>h.stage+' / '+h.action+' ('+h.attempts+' 次调用)').join(' · ');
  paint();
 }
 async function send(action,input={}){
  setBusy(true);
  try{
   const res=await fetch('./api/workflow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    action,...(action==='start'?{brief:getBrief(),styleId:getStyle()}:{draft}),...input
   })});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||'工作流请求失败 HTTP '+res.status);
   draft=data.draft;view=data.view;frame=0;
   save();display();
   note(action==='accept'?'审核已通过。此前批准的图层已冻结。':action==='inspect'?'草稿验证成功，已恢复此前的所有审核状态。':'本阶段已完成，检查像素或方案后决定接受还是返工。');
  }catch(e){note(e.message,true);notify(e.message,true);}
  finally{setBusy(false);}
 }
 $('guided-start').onclick=()=>{
  if(draft&&!confirm('从新主题开始会替换当前浏览器草稿，请先通过「导出草稿 JSON」备份。确定继续吗？'))return;
  send('start');
 };
 $('guided-resume').onclick=()=>{const saved=checkedDraft();if(saved){draft=saved;send('inspect');}};
 $('guided-accept').onclick=()=>send('accept');
 $('guided-next').onclick=()=>send('next');
 $('guided-retry').onclick=()=>send('retry',{feedback:$('guided-feedback').value.trim()});
 $('guided-publish').onclick=()=>{
  if(!view?.readyToPublish||!view?.approvedAsset)return;
  onPublish(view.approvedAsset);
  note('已经导入 Studio 的私人可编辑作品列表。原引导草稿仍保留，可另行导出备份。');
 };
 $('guided-export').onclick=()=>{
  if(!draft){note('当前没有可导出的草稿。',true);return;}
  const blob=new Blob([JSON.stringify(draft,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pixelweave-guided-draft.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 $('guided-import').onclick=()=>{
  const raw=$('guided-backup-input').value;
  if(raw.length>115000){note('草稿超过大小限制。',true);return;}
  try{draft=JSON.parse(raw);}catch{note('草稿 JSON 解析失败。',true);return;}
  send('inspect');
 };
 $('guided-frame').oninput=e=>{frame=Number(e.target.value);paint();};
 // Reading localStorage does not initialize the model or the heavy editor.
 if(checkedDraft())note('检测到上次的引导式草稿，点击「恢复本地草稿」继续。');
 display();
 return {refreshAvailability(){const enabled=isModelAvailable();$('guided-start').disabled=!enabled;note(enabled?'本地文本模型已连接，可以逐阶段生成。':'当前未连接本地模型：可导入已有 JSON，但不能在线生成新阶段。');}};
}
