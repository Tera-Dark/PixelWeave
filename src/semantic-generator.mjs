/**
 * Semantic LLM pipeline: director -> scene contract -> one semantic layer at a time
 * -> compile/verify -> freeze approved earlier layers.
 *
 * Compared with progressive 16x16 grids, the model emits small drawing
 * programs and frame transforms, never 4 full grids for every layer.
 */
import {callTextModel} from './generator.mjs';
import {parseModelJSON} from './llm.js';
import {pickKnowledge} from './knowledge.mjs';
import {artDirection} from './art-style.mjs';
import {compileSemanticProgram,SEMANTIC_FORMAT} from './semantic-program.mjs';

const W=24,H=24,FRAMES=4,FPS=8;
const validId=/^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const hex=/^#[0-9a-f]{6}$/i;
function validatedPlan(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('导演必须输出结构化 plan');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>64)throw Error('缺少有效作品名称');
 const palette=input.palette;
 if(!palette||typeof palette!=='object'||Array.isArray(palette)||palette['.']!=='transparent'||Object.keys(palette).length<3||Object.keys(palette).length>16)throw Error('必须提供透明色及 2–15 个 HEX 实体颜色');
 for(const [key,val] of Object.entries(palette))if(key.length!==1||!/^[!-~]$/.test(key)|| (key==='.'?val!=='transparent':!hex.test(val)))throw Error('色板非法: '+key);
 const layers=input.layers;
 if(!Array.isArray(layers)||layers.length<2||layers.length>6)throw Error('导演应规划 2–6 个语义图层');
 const seen=new Set();let dynamic=0;
 const normalized=layers.map((l,i)=>{
  if(!l||typeof l!=='object'||!validId.test(l.id)||seen.has(l.id))throw Error('第 '+(i+1)+' 个图层 ID 无效或重复');
  seen.add(l.id);
  if(!['static','animated'].includes(l.kind))throw Error(l.id+': 指定 static 或 animated');
  if(l.kind==='animated')dynamic++;
  if(l.clipTo!==undefined&&l.clipTo!==null&&!layers.slice(0,i).some(x=>x.id===l.clipTo))throw Error(l.id+': clipTo 应引用更早的图层');
  if(typeof l.purpose!=='string'||l.purpose.trim().length<8)throw Error(l.id+': 用具体的文字描述图层绘画任务');
  return {id:l.id,name:String(l.name||l.id).slice(0,40),kind:l.kind,purpose:l.purpose.trim().slice(0,230),...(l.clipTo?{clipTo:l.clipTo}:{})};
 });
 if(dynamic===0)throw Error('动画任务至少需要一个 animated 图层');
 return {name:input.name.trim(),palette,layers:normalized,concept:String(input.concept||'').slice(0,300),anchors:Array.isArray(input.anchors)?input.anchors.slice(0,8).map(String):[]};
}
function composePreview(asset){
 if(!asset)return '(No prior layer yet)';
 const board=Array.from({length:asset.height},()=>Array(asset.width).fill('.'));
 for(const layer of asset.layers)for(let y=0;y<asset.height;y++)for(let x=0;x<asset.width;x++)if(layer.frames[0][y][x]!=='.')board[y][x]=layer.frames[0][y][x];
 return board.map(row=>row.join('')).join('\n');
}
function directorInstructions(brief,guide,style){
 return [
  'ROLE: award-caliber pixel art director and production planner. No image generators, no output other than strict JSON.',
  'CREATIVE BRIEF: '+brief,
  'You are designing a real game-ready, editable 24x24 / 4-frame sprite. First define its silhouette, composition, palette and semantic motion; do NOT draw pixels yet.',
  'Output JSON: {"name":"...","concept":"...","anchors":["unchanging shape landmark"],"palette":{".":"transparent","K":"#1b1d2c","R":"#b84058"},"layers":[{"id":"body","name":"Body","kind":"static","purpose":"Detailed 1x-readable outline and mass"},{"id":"flame","name":"Flame","kind":"animated","purpose":"Four-frame coherent upward flicker","clipTo":"body"}]}',
  'Write 2–6 CUSTOM layers appropriate to the subject, sorted BACK TO FRONT. Do not blindly use silhouette/fill/highlights/effects for every idea. At least 1 animated layer. Keep rigid components static.',
  'Palette must include "." transparent + 2–15 named colors; prefer 6–12 intentional colors. Describe stable anchors explicitly. If motion needs external sparks, separate them from the body rather than moving the whole object.',
  'Composition: recognizable at 1x, controlled silhouette, cohesive color clusters, a single legible light direction. No scattered micro-noise. Character motion requires torso/feet identity and ground contact, not random jitter.',
  'TECHNIQUE: '+guide.context.slice(0,4200),
  'ART DIRECTION: '+style.context.slice(0,1600),
  'JSON ONLY.'
 ].join('\n\n');
}
function layerInstructions(plan,layer,brief,asset,guide,style){
 const mask=composePreview(asset);
 return [
  'ROLE: specialist human-caliber pixel artist. Output only a small JSON drawing PROGRAM for the requested layer, not a 24x24 ASCII grid.',
  'BRIEF: '+brief,
  'ART PLAN: '+JSON.stringify({name:plan.name,concept:plan.concept,anchors:plan.anchors,palette:plan.palette,layers:plan.layers}),
  'CURRENT TARGET: '+JSON.stringify(layer),
  'PREVIOUS COMPILED ART (palette symbols, frame 0, 24 rows of 24 cells):\n'+mask,
  'TASK KNOWLEDGE: '+guide.context.slice(0,3300),
  'STYLE: '+style.context.slice(0,1200),
  'Output {"base":[...ops],'+(layer.kind==='animated'?'"motion":[{"dx":0,"dy":0,"ops":[]},{"dx":1,"dy":0,"ops":[]},{"dx":0,"dy":0,"ops":[]},{"dx":-1,"dy":0,"ops":[]}]':'"motion": OMIT THIS FIELD')+'}.',
  'Valid ops: {"op":"pixel","x":9,"y":8,"color":"K"}, {"op":"rect","x":4,"y":5,"w":12,"h":9,"color":"R","fill":true}, {"op":"line","x":4,"y":6,"x2":16,"y2":8,"color":"K"}, {"op":"ellipse","x":4,"y":5,"w":8,"h":8,"color":"K"}, {"op":"polygon","points":[[4,8],[10,2],[18,8],[15,20],[7,20]],"color":"R"}, {"op":"span","x":5,"y":9,"colors":"KKRRR.."}, {"op":"stamp","x":9,"y":8,"rows":[".KK.","KRRK",".KK."]}.',
  'ALL shapes stay strictly inside x/y 0–23. Only use palette symbols. Use large polygons/rects for mass, plus small span/stamp pixel CLUSTERS for distinctive stepped edges and materials. Avoid filling the entire asset as raw rows.',
  'For animated layers, base is the stable reference drawing; 4 motion entries apply integer dx/dy to it, then optional ops overpaint (color "." erases). Plan 4 coherent poses with a natural closed loop. For static layers OMIT motion entirely, engine will freeze every frame bit-for-bit.',
  'If clipTo is specified, all your output will be deterministically clipped to that earlier layer. Respect the provided 24x24 visual guide.',
  'No markdown, no explanation, never draw any frozen previous layer again.'
 ].join('\n\n');
}
export async function generateSemantic(idea,env=process.env,fetchImpl=fetch){
 const brief=String(idea||'').trim();
 if(brief.length<4||brief.length>500)throw Error('描述必须为 4–500 个字符');
 const enabled=env.PIXELWEAVE_KNOWLEDGE!=='off';
 const style=artDirection(env.PIXELWEAVE_ART_STYLE||'none','director');
 const guide=pickKnowledge(brief,'director',{enabled});
 let calls=0;
 const stages=[];
 const ask=async prompt=>{
  calls++;
  return callTextModel([{role:'system',content:'You produce ONLY valid, bounded JSON data for a pixel-art workstation. No executable code.'},{role:'user',content:prompt}],env,fetchImpl);
 };
 async function attempt(stage,prompt,validate,maxAttempts=2){
  let failed='',lastError='';
  for(let n=1;n<=maxAttempts;n++){
   const raw=await ask(prompt+(failed?'\n\nVALIDATOR FEEDBACK: '+lastError+'\nRepair ONLY the current stage. Previous invalid answer:\n'+failed.slice(0,3500):''));
   try{
    const value=validate(parseModelJSON(raw));
    stages.push({stage,attempts:n,status:'accepted'});
    return value;
   }catch(e){lastError=e.message;failed=raw;}
  }
  stages.push({stage,attempts:maxAttempts,status:'rejected',error:lastError});
  throw Error(stage+' 校验失败；没有覆盖任何已完成图层：'+lastError);
 }
 const plan=await attempt('director',directorInstructions(brief,guide,style),validatedPlan);
 const program={format:SEMANTIC_FORMAT,name:plan.name,width:W,height:H,frames:FRAMES,fps:FPS,palette:plan.palette,layers:[]};
 let last=null;
 for(const layer of plan.layers){
  const knowledge=pickKnowledge(brief+' '+layer.purpose,layer.kind==='animated'?'effects':'fill',{enabled,limit:10});
  const step=layerInstructions(plan,layer,brief,last?.asset,knowledge,artDirection(style.id,layer.kind==='animated'?'effects':program.layers.length===0?'silhouette':'fill'));
  const candidate=await attempt('layer:'+layer.id,step,output=>{
   if(!output||typeof output!=='object'||Array.isArray(output))throw Error('需要图层指令对象');
   if(!Array.isArray(output.base))throw Error('缺少 base 形状指令');
   const generated={id:layer.id,name:layer.name,kind:layer.kind,base:output.base,...(layer.clipTo?{clipTo:layer.clipTo}:{})};
   if(layer.kind==='animated')generated.motion=output.motion;
   else if(output.motion!==undefined)throw Error('静态层不能生成 motion');
   // Validate the entire cumulative program. Earlier layers are immutable.
   const inspected=compileSemanticProgram({...program,layers:[...program.layers,generated]});
   if(!inspected.asset.layers.some(l=>l.id===layer.id))throw Error('图层未编译成功');
   return {generated,inspected};
  });
  program.layers.push(candidate.generated);
  last=candidate.inspected;
 }
 const warnings=last.issues.map(x=>x.message);
 if(last.metrics.coverage<5)warnings.push('主体面积过小：建议检查 1x 可读性');
 if(last.metrics.coverage>85)warnings.push('画布过满：建议检查负空间');
 return {asset:last.asset,program,metrics:last.metrics,warnings,planned:true,attempts:calls,pipeline:'semantic-v1',stages,artStyle:{id:style.id,enabled:style.enabled},knowledge:{enabled,ruleIds:guide.ruleIds,tags:guide.tags}};
}
