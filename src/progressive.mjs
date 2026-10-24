import {callTextModel} from './generator.mjs';
import {directorPrompt,parseModelJSON,inspectAsset} from './llm.js';
import {LAYERED_FORMAT,validateLayered} from './layered.js';
import {pickKnowledge} from './knowledge.mjs';
import {diagnoseLayered} from './scoped-patch.mjs';

const LAYERS=[
 ['silhouette','主体轮廓','Solid silhouette and outline. Keep identity EXACTLY stable across all frames.'],
 ['fill','主体色块','Interior forms and lighting/shadow color clusters. Do not redraw outline; transparency outside silhouette.'],
 ['highlights','材质高光','Small, purposeful pixel clusters for glass, metal, cloth or other relevant reflective surface.'],
 ['effects','动态特效','Animated internal liquid, flame, spark, mist or other semantic motion. Four intentionally different but looping frames.']
];
const DEFAULT_PALETTE={'.':'transparent',K:'#231d31',D:'#584459',M:'#bb405b',H:'#f6b49c',L:'#ed6476',S:'#a78297',W:'#ffe8d9'};
const hex=/^#[\da-f]{6}$/i;
function safePalette(p){
 if(!p||typeof p!=='object')return {...DEFAULT_PALETTE};
 const cleaned={'.':'transparent'};
 for(const [key,value] of Object.entries(p)){
  if(key!=='.'&&/^[A-Za-z0-9!?@#$%^&*]$/.test(key)&&typeof value==='string'&&hex.test(value))cleaned[key]=value;
  if(Object.keys(cleaned).length>=13)break;
 }
 return Object.keys(cleaned).length>=4?cleaned:{...DEFAULT_PALETTE};
}
function outlinePrompt(idea,plan,palette,[id,name,task],existing){
 const refs=existing.map(l=>({id:l.id,frame0:l.frames[0]}));
 return [
  'You are a meticulous human-caliber pixel artist hand-authoring a single isolated layer of a sprite animation. No diffusion, image AI, SVG or image tools.',
  'Art brief: '+String(idea).slice(0,500),
  'CURATED TECHNIQUE NOTES: '+pickKnowledge(idea,id==='silhouette'?'silhouette':id==='fill'?'fill':id==='highlights'?'highlights':'effects').context,
  'Art director notes: '+JSON.stringify(plan).slice(0,1600),
  'Output ONLY this ONE-layer JSON: {"frames":[["16 characters per row" x 16 rows], ["...frame 2"], ["...frame 3"], ["...frame 4"]]}',
  'Current layer: '+id+' / '+name+'. Artistic task: '+task,
  'Fixed 16x16 canvas, exactly 4 frames per layer. Each frame must contain EXACTLY 16 rows, every row EXACTLY 16 ASCII characters.',
  'Use only these palette symbols: '+JSON.stringify(palette),
  'Every pixel outside this individual layer should be transparent ".". Do not add arbitrary characters.',
  'Previously completed layers frame 1 (alignment reference): '+JSON.stringify(refs).slice(0,2500),
  id==='silhouette'?'Build a compact legible outer shape centered in the canvas with deliberate volume and negative space.':'Align all nontransparent pixels to the intended subject and previously generated layers.',
  'Do not invent random text, extraneous details, or wobbling outlines. At least effects frames should change intentionally.',
  'IMPORTANT: output JSON object with ONLY the frames array, no markdown or explanation.'
 ].join('\n\n');
}
function checkOneLayer(candidate,id,palette){
 const frames=candidate?.frames||candidate?.layers?.[0]?.frames;
 if(!Array.isArray(frames)||frames.length!==4)throw Error(id+': 必须恰好 4 帧');
 for(const [i,rows] of frames.entries()){
  if(!Array.isArray(rows)||rows.length!==16)throw Error(id+': 第 '+i+' 帧必须有 16 行');
  for(const row of rows){
   if(typeof row!=='string'||row.length!==16)throw Error(id+': 每行必须精确 16 个字符');
   for(const ch of row)if(!Object.hasOwn(palette,ch))throw Error(id+': 未定义的色板符号 '+ch);
  }
 }
 return frames;
}
export async function generateProgressive(idea,env=process.env,fetchImpl=fetch){
 const brief=String(idea||'').trim();
 if(brief.length<4||brief.length>500)throw Error('描述需包含 4–500 字');
 let plan={name:'Layered Sprite'},calls=0;
 const guidance=pickKnowledge(brief,'director');
 const ask=async(messages)=>{
  calls++;return await callTextModel(messages,env,fetchImpl);
 };
 try{plan=parseModelJSON(await ask([{role:'system',content:'Professional pixel art director. JSON only.'},{role:'user',content:directorPrompt(brief)+'\n\n'+guidance.context}]));}
 catch{plan={name:'Layered Sprite'};}
 const palette=safePalette(plan.palette);
 const layers=[];
 const repairs=[];
 for(const desc of LAYERS){
  let raw='',error='',rows=null;
  for(let attempt=0;attempt<3;attempt++){
   const prompt=outlinePrompt(brief,plan,palette,desc,layers);
   const repair=attempt?'\n\nPREVIOUS INVALID OUTPUT: '+raw.slice(0,14000)+'\nVALIDATION ERROR: '+error+'\nRegenerate the whole 4-frame layer and COUNT EACH ROW.':'';
   raw=await ask([{role:'system',content:'Render ONE pixel-art layer as exact data-only 16x16x4 JSON. No code or image generation.'},{role:'user',content:prompt+repair}]);
   try{rows=checkOneLayer(parseModelJSON(raw),desc[0],palette);break;}
   catch(e){error=e.message;}
  }
  if(!rows)throw Error('无法构建图层 '+desc[0]+'：'+error);
  repairs.push({layer:desc[0],attempts:1}); // transport attempts are counted in calls
  layers.push({id:desc[0],name:desc[1],visible:true,opacity:1,x:0,y:0,frames:rows});
 }
 const work=validateLayered({format:LAYERED_FORMAT,name:String(plan.name||'Layered Sprite').slice(0,64),width:16,height:16,fps:8,palette,layers});
 const result=inspectAsset(work);
 return {asset:work,metrics:result.stats,warnings:result.warnings,planned:!!plan?.name,attempts:calls,pipeline:'progressive',knowledge:{version:'pixelweave-knowledge-rules-v1',tags:guidance.tags,ruleIds:guidance.ruleIds},diagnostics:diagnoseLayered(work,{staticLayerIds:['silhouette']})};
}
