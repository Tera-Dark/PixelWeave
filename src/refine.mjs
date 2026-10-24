import {callTextModel} from './generator.mjs';
import {parseModelJSON} from './llm.js';
import {pickKnowledge} from './knowledge.mjs';
import {validateLayered} from './layered.js';
import {applyScopedPatch,diagnoseLayered,PATCH_FORMAT} from './scoped-patch.mjs';

/** Return a structurally verified localized edit. No generated JS is run. */
export async function refineOneLayer(input,env=process.env,transport=fetch){
 const data=validateLayered(input?.asset);
 const target=String(input?.layerId||'');
 const layer=data.layers.find(l=>l.id===target);
 if(!layer)throw Error('选择需要重绘的有效图层');
 const frames=Array.isArray(input?.frames)?input.frames:[0];
 if(frames.length<1||frames.length>8)throw Error('一次只允许 1–8 个指定帧');
 const bbox=input?.bbox||{x:0,y:0,width:data.width,height:data.height};
 const idea=String(input?.idea||'').trim().slice(0,500);
 if(idea.length<4)throw Error('请用文字说明具体要修改的画面元素');
 const frozen=data.layers.filter(l=>l.id!==target).map(l=>l.id);
 const scope={layerId:target,allowedFrames:frames,bbox,frozenLayers:frozen};
 const know=pickKnowledge(idea+' '+data.name+' '+target,'repair',{limit:12});
 const original=frames.map(i=>({frame:i,rows:layer.frames[i]}));
 const prompt=[
  'ROLE: professional pixel-art retoucher. Operate within a typed PIXEL PATCH, never redraw complete images.',
  'BRIEF: '+idea,'ASSET: '+data.name,
  'TASK LAYER: '+target,'APPROVED FRAMES: '+JSON.stringify(frames),
  'APPROVED BOUNDING BOX: '+JSON.stringify(bbox),
  'Palette: '+JSON.stringify(data.palette),
  'Layer offset: '+JSON.stringify({x:layer.x,y:layer.y}),
  'CURRENT PIXELS: '+JSON.stringify(original),
  'OTHER LAYERS ARE FROZEN: '+frozen.join(', '),
  'CURATED KNOWLEDGE: '+know.context,
  'JSON ONLY: {"format":"'+PATCH_FORMAT+'","layerId":"'+target+'","edits":[{"frame":0,"x":10,"y":10,"symbol":"R"}]}',
  'One edit is ONE changed pixel in global canvas coordinates. Max 256 edits recommended; only palette symbols. Do not include comments or markdown.'
 ].join('\n\n');
 let previous='',lastError='',attempts=0;
 for(let i=0;i<2;i++){
  attempts++;
  const request=i?prompt+'\n\nThe previous patch failed: '+lastError+'\n'+previous.slice(0,6000)+'\nReturn fully corrected patch only.':prompt;
  previous=await callTextModel([
   {role:'system',content:'Return precise data-only pixel edits, obey target-layer and frozen-layer constraints.'},
   {role:'user',content:request}
  ],env,transport);
  try{
   const patch=parseModelJSON(previous);
   const applied=applyScopedPatch(data,patch,scope);
   return {asset:applied.asset,changed:applied.changed,scope:applied.scope,audit:applied.audit,attempts,knowledge:{ruleIds:know.ruleIds,tags:know.tags},diagnostics:diagnoseLayered(applied.asset)};
  }catch(e){lastError=e.message;}
 }
 throw Error('两次局部生成均不合格：'+lastError);
}
