import test from 'node:test';
import assert from 'node:assert/strict';
import {startGuidedDraft,actGuidedDraft,validateGuidedDraft,inspectGuidedDraft,GUIDED_FORMAT} from '../src/guided-workflow.mjs';
const env={PIXELWEAVE_MODEL:'fixture-text-llm'};
const director=JSON.stringify({name:'Red Ember',concept:'Fixed metal shell with animated light',palette:{'.':'transparent',K:'#241c30',R:'#e75a64',H:'#ffce8b'},anchors:['shell rigid'],layers:[
 {id:'shell',name:'Shell',kind:'static',purpose:'Stable, recognizable rigid iron shell'},
 {id:'flame',name:'Inner fire',kind:'animated',purpose:'Moving four-frame upward torch flame'}
]});
const shell=JSON.stringify({base:[{op:'rect',x:5,y:5,w:14,h:16,color:'K',fill:false}]});
const flame=JSON.stringify({base:[{op:'ellipse',x:9,y:9,w:6,h:7,color:'R'}],motion:[
 {dx:0,dy:0,ops:[]},{dx:1,dy:0,ops:[]},{dx:0,dy:-1,ops:[{op:'pixel',x:10,y:8,color:'H'}]},{dx:-1,dy:0,ops:[]}
]});
function fake(responses){
 let index=0;const prompts=[];
 return {prompts,transport:async(_url,options)=>{
  prompts.push(JSON.parse(options.body).messages[1].content);
  const v=responses[index++];
  if(v===undefined)throw Error('Unexpected fixture model call '+index);
  return {ok:true,json:async()=>({choices:[{message:{content:v}}]})};
 }};
}
test('guided workflow has explicit review gates, actual rendered candidate and immutable accepted frames',async()=>{
 const m=fake([director,shell,flame]);
 let d=await startGuidedDraft('一盏古老的地牢火炬','none',env,m.transport);
 assert.equal(d.format,GUIDED_FORMAT);
 assert.equal(d.phase,'review-director');
 assert.equal(inspectGuidedDraft(d).preview,null);
 await assert.rejects(actGuidedDraft(d,'next',{env,transport:m.transport}),/请先接受/);
 d=await actGuidedDraft(d,'accept');
 assert.equal(d.phase,'ready-layer');
 assert.equal(d.program.layers.length,0);
 d=await actGuidedDraft(d,'next',{env,transport:m.transport});
 assert.equal(d.phase,'review-layer');assert.equal(d.program.layers.length,0);
 assert.ok(inspectGuidedDraft(d).preview.layers[0].frames[0].some(x=>x.includes('K')));
 d=await actGuidedDraft(d,'accept');
 assert.equal(d.phase,'ready-layer');assert.equal(d.program.layers.length,1);
 const frozen=JSON.stringify(inspectGuidedDraft(d).approvedAsset.layers[0].frames);
 d=await actGuidedDraft(d,'next',{env,transport:m.transport});
 assert.equal(d.program.layers.length,1);
 assert.equal(inspectGuidedDraft(d).preview.layers.length,2);
 assert.equal(JSON.stringify(inspectGuidedDraft(d).approvedAsset.layers[0].frames),frozen);
 d=await actGuidedDraft(d,'accept');
 assert.equal(d.phase,'complete');assert.equal(inspectGuidedDraft(d).readyToPublish,true);
 assert.equal(JSON.stringify(inspectGuidedDraft(d).approvedAsset.layers[0].frames),frozen);
 assert.notDeepEqual(inspectGuidedDraft(d).approvedAsset.layers[1].frames[0],inspectGuidedDraft(d).approvedAsset.layers[1].frames[1]);
 await assert.rejects(actGuidedDraft(d,'next',{env,transport:m.transport}),/请先接受当前阶段/);
 assert.equal(m.prompts.length,3);
});
test('retry respects user feedback, replaces ONLY the pending proposal, and carries a revision history',async()=>{
 const invalid=JSON.stringify({base:[{op:'rect',x:23,y:23,w:9,h:9,color:'R'}],motion:[{dx:0,dy:0,ops:[]},{dx:1,dy:0,ops:[]},{dx:0,dy:0,ops:[]},{dx:-1,dy:0,ops:[]}]});
 const m=fake([director,shell,invalid,flame,flame]);
 let d=await startGuidedDraft('一盏摇曳的红色灯笼','none',env,m.transport);
 d=await actGuidedDraft(d,'accept');
 d=await actGuidedDraft(d,'next',{env,transport:m.transport});
 d=await actGuidedDraft(d,'accept');
 const accepted=JSON.stringify(d.program.layers);
 d=await actGuidedDraft(d,'next',{env,transport:m.transport});
 assert.equal(d.history.at(-1).attempts,2);
 assert.equal(JSON.stringify(d.program.layers),accepted);
 d=await actGuidedDraft(d,'retry',{feedback:'让火焰的亮部更有层次，保留原本笼身',env,transport:m.transport});
 assert.equal(d.phase,'review-layer');
 assert.equal(JSON.stringify(d.program.layers),accepted);
 assert.ok(m.prompts.at(-1).includes('让火焰的亮部更有层次'));
 assert.equal(d.history.at(-1).action,'retry');
});
test('draft is portable between JSON saves and validates complete/pending programs before restore',async()=>{
 const m=fake([director,shell]);
 let d=await startGuidedDraft('地牢金属外壳和内部火光','none',env,m.transport);
 d=await actGuidedDraft(d,'accept');
 d=await actGuidedDraft(d,'next',{env,transport:m.transport});
 const restored=validateGuidedDraft(JSON.parse(JSON.stringify(d)));
 assert.equal(restored.phase,'review-layer');assert.equal(inspectGuidedDraft(restored).preview.layers.length,1);
 const tampered=structuredClone(d);tampered.pending.layer.base[0].x=24;
 assert.throws(()=>validateGuidedDraft(tampered),/越出画布|必须是/);
 const wrong=structuredClone(d);wrong.program.layers.push({...d.pending.layer,id:'different'});
 assert.throws(()=>validateGuidedDraft(wrong),/图层 ID/);
 const huge=structuredClone(d);huge.history=Array.from({length:31},()=>({stage:'layer',action:'accept',attempts:0}));
 assert.throws(()=>validateGuidedDraft(huge),/历史记录数量非法/);
 const weird=structuredClone(d);weird.phase='complete';
 assert.throws(()=>validateGuidedDraft(weird),/完成状态不一致/);
});
test('stage failure does not mutate the prior approved source draft',async()=>{
 const bad=JSON.stringify({base:[{op:'rect',x:23,y:23,w:8,h:9,color:'K'}]});
 const m=fake([director,shell,bad,bad]);
 let d=await startGuidedDraft('一盏老旧的地牢火把','none',env,m.transport);
 d=await actGuidedDraft(d,'accept');
 d=await actGuidedDraft(d,'next',{env,transport:m.transport});
 d=await actGuidedDraft(d,'accept');
 const approved=JSON.stringify(d);
 await assert.rejects(actGuidedDraft(d,'next',{env,transport:m.transport}),/连续两次未通过校验/);
 assert.equal(JSON.stringify(d),approved);
});
test('human feedback and malicious workflow controls are rejected before model calls',async()=>{
 const m=fake([director]);
 const d=await startGuidedDraft('一个循环燃烧的提灯','none',env,m.transport);
 await assert.rejects(actGuidedDraft(d,'retry',{feedback:'z'.repeat(451),env,transport:m.transport}),/最多/);
 await assert.rejects(actGuidedDraft(d,'publish',{env,transport:m.transport}),/未知/);
 assert.equal(m.prompts.length,1);
});
