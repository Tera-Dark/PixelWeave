import test from 'node:test';
import assert from 'node:assert/strict';
import {LAYERED_FORMAT,LAYERED_SAMPLE,validateLayered,createLayeredAsset,renderLayered,pixelCoordinates,paintLayerPixel,addEmptyLayer,reorderLayer,duplicateFrame,deleteFrame,createBlankLayered,metrics} from '../src/layered.js';
import {makeLayeredPrompt,parseModelJSON,inspectAsset} from '../src/llm.js';
import {modelSettings,generateWithLLM} from '../src/generator.mjs';
const clone=o=>JSON.parse(JSON.stringify(o));
function stub(){
 let draws=0,alpha=1;
 const ctx={clearRect(){},fillRect(){draws++},set globalAlpha(v){alpha=v;},get globalAlpha(){return alpha;}};
 return {canvas:{width:96,height:96,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:192,height:192})},draws:()=>draws,alpha:()=>alpha};
}
test('seven-layer sample is valid and all ten frames render',()=>{
 const d=validateLayered(LAYERED_SAMPLE);assert.equal(d.layers.length,7);assert.equal(d.layers[0].frames.length,10);
 const f=stub();for(let i=0;i<10;i++)renderLayered(f.canvas,d,i);assert.ok(f.draws()>100);assert.equal(f.alpha(),1);
});
test('layer visibility and coordinate mapping',()=>{
 const d=clone(LAYERED_SAMPLE),f=stub();
 assert.deepEqual(pixelCoordinates(f.canvas,d,4,4),{x:0,y:0});
 assert.deepEqual(pixelCoordinates(f.canvas,d,191,191),{x:31,y:31});
 assert.equal(pixelCoordinates(f.canvas,d,210,100),null);
 d.layers.forEach(l=>l.visible=false);renderLayered(f.canvas,d,0);assert.equal(f.draws(),0);
});
test('painting one layer and frame preserves all other frames',()=>{
 const d=clone(LAYERED_SAMPLE),l=d.layers[2],row=l.frames[1][16];
 assert.equal(paintLayerPixel(d,l.id,0,15,16,'H'),true);
 assert.equal(l.frames[1][16],row);assert.equal(l.frames[0][16][15],'H');
 assert.equal(paintLayerPixel(d,l.id,0,100,16,'R'),false);
});
test('layer creation, ordering and frame operations preserve schema',()=>{
 const d=createBlankLayered('Draft',16,16,4);
 const l=addEmptyLayer(d,'Effects');assert.equal(d.layers.length,2);
 assert.equal(reorderLayer(d,l.id,-1),true);assert.equal(d.layers[0].id,l.id);
 duplicateFrame(d,1);assert.equal(d.layers[0].frames.length,5);
 deleteFrame(d,0);assert.equal(d.layers[0].frames.length,4);
 assert.doesNotThrow(()=>validateLayered(d));
});
test('malformed or untrusted pixel data is rejected',()=>{
 const d=clone(LAYERED_SAMPLE);d.layers[0].frames[0][0]='BAD';assert.throws(()=>validateLayered(d),/行宽/);
 const e=clone(LAYERED_SAMPLE);e.palette.K='red';assert.throws(()=>validateLayered(e),/palette/);
 const f=clone(LAYERED_SAMPLE);f.layers[1].id=f.layers[0].id;assert.throws(()=>validateLayered(f),/id/);
});
test('prompt, model JSON extraction, and quality diagnostics',()=>{
 const p=makeLayeredPrompt('紫色梦境水晶');assert.ok(p.includes('紫色梦境水晶')&&p.includes(LAYERED_FORMAT));
 assert.equal(parseModelJSON('{"success":true}').success,true);
 const m=metrics(LAYERED_SAMPLE);assert.equal(m.layers,7);assert.ok(m.coverage>0);
 assert.equal(inspectAsset(LAYERED_SAMPLE).stats.frames,10);
});
test('import object and Ollama local proxy config',()=>{
 const a=createLayeredAsset(LAYERED_SAMPLE);assert.equal(a.type,'layered');assert.equal(a.frames,10);
 const cfg=modelSettings({PIXELWEAVE_MODEL:'qwen3:8b',PIXELWEAVE_API_BASE:'http://127.0.0.1:11434/v1'});
 assert.equal(cfg.url,'http://127.0.0.1:11434/v1/chat/completions');assert.equal(cfg.configured,true);
});
test('LLM flow uses director then rejects invalid JSON and repairs',async()=>{
 const generated=createBlankLayered('LLM Test',16,16,4);let n=0;
 const fakeFetch=async()=>{n++;return {ok:true,json:async()=>({choices:[{message:{content:n===1?'{"name":"Art Plan"}':n===2?'NOT JSON':JSON.stringify(generated)}}]})};};
 const result=await generateWithLLM('A crimson pixel-art potion',{PIXELWEAVE_MODEL:'fake-model'},fakeFetch);
 assert.equal(n,3);assert.equal(result.attempts,2);assert.equal(result.asset.name,'LLM Test');
});
