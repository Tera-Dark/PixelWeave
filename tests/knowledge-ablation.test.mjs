import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {generateProgressive} from '../src/progressive.mjs';
import {pickKnowledge} from '../src/knowledge.mjs';
import {diagnoseLayered} from '../src/scoped-patch.mjs';

test('lesson manifest points to every new diagram, visual lab and reference resource',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../knowledge/pixel-art/manifest.json',import.meta.url),'utf8'));
 const paths=[...(manifest.modules.labs||[]),...(manifest.modules.illustrations||[]),manifest.modules.rulebook,manifest.modules.referenceAssets,manifest.modules.interactiveLab];
 for(const path of paths)assert.ok(existsSync(new URL('../knowledge/pixel-art/'+path,import.meta.url)),path);
});
test('previous learning potion bubble no longer escapes above liquid',()=>{
 const d=JSON.parse(readFileSync(new URL('../knowledge/pixel-art/examples/learning-potion.layered.json',import.meta.url),'utf8'));
 assert.equal(diagnoseLayered(d).filter(x=>x.id==='BUBBLE_OUTSIDE_LIQUID').length,0);
});
test('knowledge retrieval includes specific reference case for potion and cloth',()=>{
 assert.equal(pickKnowledge('血瓶药液气泡','effects').caseAsset,'examples/reference/scarlet-vial.layered.json');
 assert.equal(pickKnowledge('风中飘扬的布旗','effects').caseAsset,'examples/reference/wind-banner.layered.json');
});
test('mock LLM sees rule IDs only in knowledge-enabled branch',async()=>{
 const blank='.'.repeat(16),row='....KKKKKKKK....';
 const sample=JSON.stringify({frames:Array.from({length:4},()=>Array.from({length:16},(_,y)=>y===8?row:blank))});
 const director=JSON.stringify({name:'Audit Fixture',palette:{K:'#242131',L:'#ed6476',H:'#ffacad'}});
 const run=async(mode)=>{
  const messages=[];let n=0;
  const fetchImpl=async(_url,opts)=>{
   messages.push(JSON.parse(opts.body).messages[1].content);n++;
   return {ok:true,json:async()=>({choices:[{message:{content:n===1?director:sample}}]})};
  };
  const result=await generateProgressive('一个循环的红色血瓶',{PIXELWEAVE_MODEL:'fake',PIXELWEAVE_KNOWLEDGE:mode},fetchImpl);
  return {messages,result};
 };
 const enabled=await run('on'),disabled=await run('off');
 assert.ok(enabled.messages.join(' ').includes('GLASS-001'));
 assert.ok(!disabled.messages.join(' ').includes('GLASS-001'));
 assert.equal(enabled.result.asset.width,disabled.result.asset.width);
 assert.equal(enabled.result.knowledge.enabled,true);
 assert.equal(disabled.result.knowledge.enabled,false);
});
