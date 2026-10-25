/**
 * Opt-in REAL text-model evaluation: no requests unless --run is explicit.
 * This measures schema reliability and cost drivers; it does not claim artistic quality.
 *
 * node tools/benchmark-guided.mjs                 # print dry run only
 * node tools/benchmark-guided.mjs --run --max-calls=32 --repeats=1
 */
import {performance} from 'node:perf_hooks';
import {startGuidedDraft,actGuidedDraft,inspectGuidedDraft} from '../src/guided-workflow.mjs';
import {modelSettings} from '../src/generator.mjs';
const CASES=[
 {id:'readable-key',brief:'24x24 旧铜钥匙，具有辨识度的钥匙齿、斜向高光，4 帧轻微反光循环'},
 {id:'potion',brief:'24x24 异世界红色药瓶，玻璃与瓶塞稳定，瓶内的液体每帧轻微晃动'},
 {id:'ember-fire',brief:'24x24 生锈的地牢火把，手柄固定，火焰以四帧有节奏的自然变化循环'},
 {id:'character-idle',brief:'24x24 带兜帽的旅人，胸口呼吸、披风轻微飘动，身体比例和双脚位置稳定'},
 {id:'water',brief:'24x24 小水池景物，石质边框静止，水面高光形成四帧连贯移动循环'}
];
const argv=process.argv.slice(2);
function arg(name,fallback){const item=argv.find(s=>s.startsWith('--'+name+'='));return item?item.split('=').slice(1).join('='):fallback;}
const real=argv.includes('--run');
const repeats=Number(arg('repeats','1')),maxCalls=Number(arg('max-calls','0'));
if(!Number.isInteger(repeats)||repeats<1||repeats>3)throw Error('--repeats 只能为 1–3');
if(real&&(!Number.isInteger(maxCalls)||maxCalls<1||maxCalls>200))throw Error('真实请求必须提供 --max-calls=1..200，不能无限制调用');
const chosen=arg('cases',CASES.map(c=>c.id).join(',')).split(',');
if(chosen.some(id=>!CASES.some(c=>c.id===id)))throw Error('--cases 包含未知题材');
const tasks=CASES.filter(c=>chosen.includes(c.id)).flatMap(c=>Array.from({length:repeats},(_,i)=>({...c,rep:i+1})));
console.log(JSON.stringify({status:real?'RUNNING':'DRY_RUN',models:[process.env.PIXELWEAVE_MODEL||'(unset)'],attempts:tasks.length,requestedCases:chosen,repeats,maxCalls:real?maxCalls:'unset',worstCaseCalls:tasks.length*14,notice:'Structural metrics are NOT visual quality scores.'},null,2));
if(!real)process.exit(0);
const cfg=modelSettings();
if(!cfg.configured)throw Error('真实评测必须设置 PIXELWEAVE_MODEL');
const transport=async(...args)=>{
 if(callCount>=maxCalls)throw Error('已达到 --max-calls 模型请求硬上限，停止付费 API 调用');
 callCount++;return fetch(...args);
};
let callCount=0;
const reports=[];
for(const task of tasks){
 const begin=performance.now(),before=callCount;
 const record={case:task.id,rep:task.rep,model:cfg.model,pass:false,elapsedMs:0,modelCalls:0,metrics:null,warnings:[],error:null,humanReview:'not_reviewed'};
 try{
  let d=await startGuidedDraft(task.brief,'none',process.env,transport);
  d=await actGuidedDraft(d,'accept');
  while(d.phase!=='complete'){
   d=await actGuidedDraft(d,'next',{env:process.env,transport});
   d=await actGuidedDraft(d,'accept');
  }
  const v=inspectGuidedDraft(d);
  record.pass=true;record.metrics=v.approvedAsset?{
   layers:v.approvedAsset.layers.length,frames:v.approvedAsset.layers[0].frames.length,
   paletteColors:Object.keys(v.approvedAsset.palette).length-1,
   staticLayers:v.plan.layers.filter(l=>l.kind==='static').length
  }:null;
  record.warnings=v.warnings;
 }catch(e){record.error=String(e.message).slice(0,500);}
 record.elapsedMs=Math.round(performance.now()-begin);record.modelCalls=callCount-before;
 reports.push(record);
 console.log(JSON.stringify(record));
 if(callCount>=maxCalls)break;
}
const passed=reports.filter(r=>r.pass).length;
console.log(JSON.stringify({status:'DONE',total:reports.length,passed,failed:reports.length-passed,modelCalls:callCount,unattempted:tasks.length-reports.length,next:'Render assets and conduct blind human review before any claims about aesthetics.'},null,2));
