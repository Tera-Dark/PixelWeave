import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildReferenceLibrary} from '../tools/build-reference-assets.mjs';
import {validateLayered} from '../src/layered.js';
import {applyScopedPatch,diagnoseLayered,PATCH_FORMAT} from '../src/scoped-patch.mjs';
import {pickKnowledge,knowledgeInventory,classifyBrief} from '../src/knowledge.mjs';
import {refineOneLayer} from '../src/refine.mjs';
const load=()=>buildReferenceLibrary();
const snapshot=o=>JSON.stringify(o);
test('six reference artworks are reproducible and data-valid',()=>{
 const list=load();assert.equal(list.length,6);
 for(const {id,asset} of list){
  const fromDisk=JSON.parse(readFileSync(new URL('../knowledge/pixel-art/examples/reference/'+id+'.layered.json',import.meta.url),'utf8'));
  assert.deepEqual(validateLayered(asset),validateLayered(fromDisk),id);
 }
});
test('reference art fixed layers remain exactly identical across frames',()=>{
 const expected={
  'scarlet-vial':['ground_shadow','glass_back','glass_front','gold_collar'],
  'hearth-lantern':['shadow','metal_body','glass_chamber','lattice','metal_specular'],
  'prism-crystal':['shadow','mineral_rind','cut_crystal','facet_planes','refraction'],
  'wind-banner':['ground','pole'],
  'ember-flame':['ground_shadow','charred_logs','light_on_wood']
 };
 for(const {id,asset} of load()){
  const statics=expected[id]||[];
  const issues=diagnoseLayered(asset,{staticLayerIds:statics});
  assert.equal(issues.filter(x=>x.id==='STATIC_LAYER_CHANGED').length,0,id);
 }
});
test('potion bubble mask never leaves its liquid layer',()=>{
 const a=load().find(x=>x.id==='scarlet-vial').asset;
 const issues=diagnoseLayered(a);
 assert.equal(issues.filter(i=>i.id==='BUBBLE_OUTSIDE_LIQUID').length,0);
 const bad=structuredClone(a);bad.layers.find(l=>l.id==='bubbles').frames[2][4]='.'.repeat(16)+'W'+'.'.repeat(15);
 assert.ok(diagnoseLayered(bad).some(i=>i.id==='BUBBLE_OUTSIDE_LIQUID'));
});
test('knowledge routing retrieves situation-specific rules with source identifiers',()=>{
 const potion=pickKnowledge('玻璃血瓶液体气泡循环','effects');
 const cloth=pickKnowledge('风吹动的红旗布料','effects');
 assert.ok(potion.ruleIds.includes('BUBBLE-001'));
 assert.ok(cloth.ruleIds.includes('CLOTH-001'));
 assert.ok(!cloth.ruleIds.includes('BUBBLE-001'));
 assert.ok(potion.context.includes('Chapter'));
 assert.ok(potion.context.length<6501);
 assert.ok(knowledgeInventory().totalRules>=19);
 assert.deepEqual(pickKnowledge('火焰','effects',{enabled:false}).ruleIds,[]);
});
test('target-layer patch changes permitted pixels only and keeps all other frames and layers intact',()=>{
 const a=load().find(x=>x.id==='scarlet-vial').asset,before=structuredClone(a);
 const p={format:PATCH_FORMAT,layerId:'liquid',edits:[{frame:0,x:12,y:16,symbol:'W'}]};
 const result=applyScopedPatch(a,p,{layerId:'liquid',allowedFrames:[0],bbox:{x:10,y:13,width:5,height:5},frozenLayers:['glass','stopper']});
 assert.equal(result.changed,1);assert.equal(result.audit.frozenLayersUnchanged,true);
 assert.deepEqual(a,before);
 for(let i=0;i<a.layers.length;i++){
  if(a.layers[i].id!=='liquid')assert.deepEqual(result.asset.layers[i],a.layers[i]);
 }
 assert.deepEqual(result.asset.layers.find(l=>l.id==='liquid').frames.slice(1),a.layers.find(l=>l.id==='liquid').frames.slice(1));
});
test('patch disallows unauthorized layers/frames/bbox/palette/duplicate pixels',()=>{
 const a=load().find(x=>x.id==='scarlet-vial').asset;
 const scope={layerId:'liquid',allowedFrames:[0],bbox:{x:10,y:13,width:5,height:5},frozenLayers:['glass']};
 const testPatch=(layerId,frame,x,y,symbol)=>({format:PATCH_FORMAT,layerId,edits:[{frame,x,y,symbol}]});
 assert.throws(()=>applyScopedPatch(a,testPatch('glass',0,12,16,'W'),scope),/未授权图层/);
 assert.throws(()=>applyScopedPatch(a,testPatch('liquid',2,12,16,'W'),scope),/未授权帧/);
 assert.throws(()=>applyScopedPatch(a,testPatch('liquid',0,2,1,'W'),scope),/越出授权区域/);
 assert.throws(()=>applyScopedPatch(a,testPatch('liquid',0,12,16,'?'),scope),/色板/);
 const dupe=testPatch('liquid',0,12,16,'W');dupe.edits.push({...dupe.edits[0]});
 assert.throws(()=>applyScopedPatch(a,dupe,scope),/多次覆盖/);
});
test('model refine endpoint flow uses only patch JSON, never evaluates a script',async()=>{
 const a=load().find(x=>x.id==='scarlet-vial').asset;
 let n=0;
 const fetchStub=async()=>{n++;return {ok:true,json:async()=>({choices:[{message:{content:n===1?'not json':JSON.stringify({format:PATCH_FORMAT,layerId:'liquid',edits:[{frame:0,x:12,y:16,symbol:'W'}]})}}]})};};
 const answer=await refineOneLayer({asset:a,layerId:'liquid',frames:[0],idea:'仅将药液中央一个暗像素改成柔和高光'}, {PIXELWEAVE_MODEL:'test-model'},fetchStub);
 assert.equal(n,2);assert.equal(answer.changed,1);
 assert.ok(answer.knowledge.ruleIds.some(r=>r.startsWith('CORE-')));
});
test('ablation fixture: curated guidance changes prompts, not proven aesthetic quality',()=>{
 const base=pickKnowledge('生命药水气泡','effects',{enabled:false});
 const informed=pickKnowledge('生命药水气泡','effects',{enabled:true});
 assert.equal(base.context,'');assert.ok(informed.context.includes('BUBBLE-001'));
});
