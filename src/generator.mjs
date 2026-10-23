import {makeLayeredPrompt,directorPrompt,repairPrompt,parseModelJSON,inspectAsset} from './llm.js';

export function modelSettings(env=process.env){
 const base=(env.PIXELWEAVE_API_BASE||'http://127.0.0.1:11434/v1').trim();
 const model=(env.PIXELWEAVE_MODEL||'').trim();
 const key=(env.PIXELWEAVE_API_KEY||'ollama').trim();
 const url=new URL(base);
 if(!['http:','https:'].includes(url.protocol))throw Error('API_BASE 必须为 HTTP(S) 地址');
 url.pathname=url.pathname.replace(/\/+$/,'')+(url.pathname.endsWith('/chat/completions')?'':'/chat/completions');
 return {url:url.toString(),model,key,configured:Boolean(model)};
}
export async function callTextModel(messages,env=process.env,fetchImpl=fetch){
 const cfg=modelSettings(env);
 if(!cfg.configured)throw Error('请先设置 PIXELWEAVE_MODEL 环境变量');
 const res=await fetchImpl(cfg.url,{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+cfg.key},
  body:JSON.stringify({model:cfg.model,messages,temperature:0.35,max_tokens:12000,stream:false}),
  signal:AbortSignal.timeout(110000)
 });
 if(!res.ok){const s=(await res.text()).slice(0,350);throw Error('文本模型请求失败 HTTP '+res.status+': '+s);}
 const body=await res.json(),value=body?.choices?.[0]?.message?.content;
 if(typeof value==='string')return value;
 if(Array.isArray(value))return value.filter(v=>v.type==='text').map(v=>v.text).join('');
 throw Error('API 应返回 choices[0].message.content');
}
export async function generateWithLLM(idea,env=process.env,fetchImpl=fetch){
 const brief=String(idea??'').trim();
 if(brief.length<4||brief.length>500)throw Error('创作描述应为 4–500 个字符');
 let plan=null;
 try{plan=parseModelJSON(await callTextModel([
  {role:'system',content:'You are a senior pixel art director. JSON only.'},
  {role:'user',content:directorPrompt(brief)}
 ],env,fetchImpl));}catch{plan=null;}
 const normal=makeLayeredPrompt(brief,plan);
 let previous='',error='';
 for(let i=0;i<3;i++){
  previous=await callTextModel([
   {role:'system',content:'You only emit valid data-only layered pixel-art JSON. No prose, no markdown.'},
   {role:'user',content:i===0?normal:repairPrompt(brief,previous,error)}
  ],env,fetchImpl);
  try{
   const inspected=inspectAsset(parseModelJSON(previous));
   return {asset:inspected.data,metrics:inspected.stats,warnings:inspected.warnings,attempts:i+1,planned:!!plan};
  }catch(e){error=e.message;}
 }
 throw Error('连续三次生成均未通过分层资产校验：'+error);
}
