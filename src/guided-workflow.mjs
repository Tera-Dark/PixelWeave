/**
 * Human-controlled LLM authoring checkpoints.
 * The draft is a portable, replay-validated JSON document, not an opaque
 * server session. Failed generation never mutates an approved snapshot.
 */
import {parseModelJSON} from './llm.js';
import {callTextModel} from './generator.mjs';
import {pickKnowledge} from './knowledge.mjs';
import {artDirection} from './art-style.mjs';
import {SEMANTIC_FORMAT,compileSemanticProgram} from './semantic-program.mjs';
import {validatedPlan,directorInstructions,layerInstructions} from './semantic-generator.mjs';

export const GUIDED_FORMAT='pixelweave/guided-v1';
const MAX_DRAFT_SIZE=115000,MAX_FEEDBACK=450,MAX_HISTORY=30;
const own=(o,k)=>Object.hasOwn(o,k);
const copy=o=>JSON.parse(JSON.stringify(o));
const fail=m=>{throw Error('引导式工程校验失败：'+m);};
function expectedProgram(plan){
 return {format:SEMANTIC_FORMAT,name:plan.name,width:24,height:24,frames:4,fps:8,palette:copy(plan.palette),layers:[]};
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function validApprovedLayer(actual,planned){
 if(!actual||typeof actual!=='object'||Array.isArray(actual))fail('图层数据不是对象');
 if(actual.id!==planned.id||actual.kind!==planned.kind||actual.name!==planned.name)fail('图层 ID、名称或静态属性被修改');
 if((actual.clipTo??null)!==(planned.clipTo??null))fail('图层遮罩关系被修改');
 if(!Array.isArray(actual.base))fail('图层缺少绘图操作');
 if(planned.kind==='static'&&own(actual,'motion'))fail('静态图层不能包含运动');
 if(planned.kind==='animated'&&!Array.isArray(actual.motion))fail('动态图层缺少运动');
 if(Object.keys(actual).some(k=>!['id','name','kind','base','motion','clipTo'].includes(k)))fail('图层包含未知字段');
}
function committedAsset(p){return p.layers.length?compileSemanticProgram(p):null;}
export function validateGuidedDraft(source){
 let serialized;
 try{serialized=JSON.stringify(source);}catch{fail('JSON 对象无法序列化');}
 if(!serialized||serialized.length>MAX_DRAFT_SIZE)fail('工程超过大小限制');
 const d=copy(source);
 if(d.format!==GUIDED_FORMAT)fail('未知草稿格式');
 if(typeof d.brief!=='string'||d.brief.trim().length<4||d.brief.length>500)fail('描述长度非法');
 if(!['none','ashen-reliquary'].includes(d.styleId))fail('未知风格');
 if(!['review-director','ready-layer','review-layer','complete'].includes(d.phase))fail('非法阶段');
 if(!Number.isInteger(d.revision)||d.revision<0||d.revision>1000)fail('版本序号非法');
 if(!Array.isArray(d.history)||d.history.length>MAX_HISTORY)fail('历史记录数量非法');
 if(d.history.some(e=>!e||typeof e!=='object'||typeof e.stage!=='string'||typeof e.action!=='string'||!Number.isInteger(e.attempts)||e.attempts<0||e.attempts>3))fail('历史记录格式非法');
 if(typeof d.model!=='string'||d.model.length>150)fail('模型标识不合法');
 if(d.phase==='review-director'){
  if(d.plan!==null||d.program!==null||d.pending?.kind!=='director')fail('导演评审状态不一致');
  validatedPlan(d.pending.plan);
  return d;
 }
 const plan=validatedPlan(d.plan);
 // The plan should be the normalized accepted contract rather than a model's
 // uncontrolled extra fields.
 if(!same(plan,d.plan))fail('计划未标准化');
 const p=d.program;
 if(!p||p.format!==SEMANTIC_FORMAT||p.width!==24||p.height!==24||p.frames!==4||p.fps!==8||p.name!==plan.name||!same(p.palette,plan.palette))fail('工程元数据与已批准导演计划不一致');
 if(!Array.isArray(p.layers)||p.layers.length>plan.layers.length)fail('已批准图层数量错误');
 p.layers.forEach((l,i)=>validApprovedLayer(l,plan.layers[i]));
 const completed=committedAsset(p);
 if(d.phase==='ready-layer'){
  if(d.pending!==null||p.layers.length>=plan.layers.length)fail('下一图层状态不一致');
 }else if(d.phase==='review-layer'){
  if(d.pending?.kind!=='layer'||p.layers.length>=plan.layers.length)fail('待审核图层状态不一致');
  validApprovedLayer(d.pending.layer,plan.layers[p.layers.length]);
  if(d.pending.layerId!==d.pending.layer.id)fail('待审核图层 ID 不一致');
  compileSemanticProgram({...p,layers:[...p.layers,d.pending.layer]});
 }else if(d.phase==='complete'){
  if(d.pending!==null||p.layers.length!==plan.layers.length)fail('完成状态不一致');
 }
 if(d.phase==='complete'&&!completed)fail('已完成工程为空');
 return d;
}
function stageLog(d,stage,action,attempts,errors=[]){
 d.history.push({stage,action,attempts,errors:errors.map(s=>String(s).slice(0,300)).slice(-2)});
 if(d.history.length>MAX_HISTORY)d.history=d.history.slice(-MAX_HISTORY);
 d.revision++;
}
async function propose(prompt,check,env,transport,feedback=''){
 let previous='',error='',n=0,errors=[];
 for(n=1;n<=2;n++){
  const instruction=prompt+
   (feedback?'\n\nHUMAN ART-DIRECTION FEEDBACK (preserve all hard constraints): '+feedback:'')+
   (previous?'\n\nVALIDATOR REJECTION: '+error+'\nRepair only THIS stage. Invalid candidate:\n'+previous.slice(0,3500):'');
  const raw=await callTextModel([
   {role:'system',content:'Return strictly bounded JSON for a pixel artwork authoring workbench, no explanations or executable code.'},
   {role:'user',content:instruction}
  ],env,transport);
  try{return {value:check(parseModelJSON(raw)),attempts:n,errors};}
  catch(e){error=String(e.message).slice(0,450);previous=raw;errors.push(error);}
 }
 throw Error('本阶段连续两次未通过校验（已批准内容保持不变）：'+error);
}
function directorContext(d){
 const enabled=true;
 return directorInstructions(d.brief,pickKnowledge(d.brief,'director',{enabled}),artDirection(d.styleId,'director'));
}
async function generateDirector(d,env,transport,feedback=''){
 const p=await propose(directorContext(d),validatedPlan,env,transport,feedback);
 d.pending={kind:'director',plan:p.value};
 d.phase='review-director';
 stageLog(d,'director',feedback?'retry':'propose',p.attempts,p.errors);
 return d;
}
async function generateNextLayer(d,env,transport,feedback=''){
 const plan=d.plan,p=d.program,index=p.layers.length;
 const layer=plan.layers[index];
 if(!layer)fail('没有待生成的图层');
 const compiled=committedAsset(p);
 const enabled=true;
 const guide=pickKnowledge(d.brief+' '+layer.purpose,layer.kind==='animated'?'effects':'fill',{enabled,limit:10});
 const style=artDirection(d.styleId,layer.kind==='animated'?'effects':index===0?'silhouette':'fill');
 const instruction=layerInstructions(plan,layer,d.brief,compiled?.asset,guide,style);
 const result=await propose(instruction,output=>{
  if(!output||typeof output!=='object'||Array.isArray(output)||!Array.isArray(output.base))throw Error('缺少 base 指令数组');
  if(layer.kind==='static'&&own(output,'motion'))throw Error('静态图层不能生成 motion');
  const candidate={id:layer.id,name:layer.name,kind:layer.kind,base:output.base,...(layer.clipTo?{clipTo:layer.clipTo}:{}),...(layer.kind==='animated'?{motion:output.motion}:{})};
  validApprovedLayer(candidate,layer);
  compileSemanticProgram({...p,layers:[...p.layers,candidate]});
  return candidate;
 },env,transport,feedback);
 d.pending={kind:'layer',layerId:layer.id,layer:result.value};
 d.phase='review-layer';
 stageLog(d,'layer:'+layer.id,feedback?'retry':'propose',result.attempts,result.errors);
 return d;
}
export async function startGuidedDraft(idea,styleId='none',env=process.env,transport=fetch){
 const brief=String(idea??'').trim();
 if(brief.length<4||brief.length>500)throw Error('创作描述必须为 4–500 字');
 if(!['none','ashen-reliquary'].includes(styleId))throw Error('不支持的风格');
 const draft={format:GUIDED_FORMAT,brief,styleId,model:String(env.PIXELWEAVE_MODEL||'local-model').slice(0,150),revision:0,phase:'review-director',plan:null,program:null,pending:null,history:[]};
 return validateGuidedDraft(await generateDirector(draft,env,transport));
}
export async function actGuidedDraft(source,action,{feedback='',env=process.env,transport=fetch}={}){
 const d=validateGuidedDraft(source);
 if(typeof feedback!=='string'||feedback.length>MAX_FEEDBACK)throw Error('返工意见最多 '+MAX_FEEDBACK+' 字');
 if(!['accept','retry','next'].includes(action))throw Error('未知的工作流操作');
 if(action==='accept'){
  if(d.phase==='review-director'){
   d.plan=copy(d.pending.plan);d.program=expectedProgram(d.plan);
   d.pending=null;d.phase='ready-layer';
   stageLog(d,'director','accept',0);
  }else if(d.phase==='review-layer'){
   d.program.layers.push(copy(d.pending.layer));d.pending=null;
   d.phase=d.program.layers.length===d.plan.layers.length?'complete':'ready-layer';
   stageLog(d,'layer:'+d.program.layers.at(-1).id,'accept',0);
  }else throw Error('当前没有等待人工审核的候选阶段');
 }else if(action==='retry'){
  if(d.phase==='review-director')await generateDirector(d,env,transport,feedback);
  else if(d.phase==='review-layer')await generateNextLayer(d,env,transport,feedback);
  else throw Error('只有正在评审的阶段可以返工');
 }else{
  if(d.phase!=='ready-layer')throw Error('请先接受当前阶段，再生成下一层');
  await generateNextLayer(d,env,transport);
 }
 return validateGuidedDraft(d);
}
export function inspectGuidedDraft(source){
 const d=validateGuidedDraft(source);
 const approved=d.program?.layers?.length||0;
 const all=d.plan?.layers?.length||d.pending?.plan?.layers?.length||0;
 let proposed=null,accepted=null;
 if(d.program&&approved)accepted=compileSemanticProgram(d.program);
 if(d.phase==='review-layer')proposed=compileSemanticProgram({...d.program,layers:[...d.program.layers,d.pending.layer]});
 return {
  phase:d.phase,revision:d.revision,brief:d.brief,model:d.model,
  plan:d.plan||d.pending?.plan||null,
  approved,all,
  awaiting:d.pending?.kind==='layer'?d.pending.layerId:d.pending?.kind||null,
  preview:proposed?.asset||accepted?.asset||null,
  approvedAsset:accepted?.asset||null,
  warnings:(proposed||accepted)?.issues||[],
  readyToPublish:d.phase==='complete',
  history:d.history
 };
}
