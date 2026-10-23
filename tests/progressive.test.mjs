import test from 'node:test';
import assert from 'node:assert/strict';
import {generateProgressive} from '../src/progressive.mjs';
test('LLM can produce independent layers with schema-level composition',async()=>{
 let count=0;
 const base='.'.repeat(16),make=(id)=>{
  const lines=Array.from({length:16},()=>base);
  if(id!=='effects')lines[8]='....KKKKKKKK....';
  else lines[8]='......H.........';
  return JSON.stringify({frames:Array.from({length:4},(_,frame)=>lines.map((row,y)=>y===9&&id==='effects'&&frame%2?'.......H........':row))});
 };
 const data=[
  JSON.stringify({name:'Text LLM Bottle',palette:{K:'#251d33',R:'#c03e58',H:'#f3d4b5'},layers:[]}),
  make('silhouette'),make('fill'),make('highlights'),make('effects')
 ];
 const fakeFetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:data[count++]}}]})});
 const r=await generateProgressive('A cinematic crimson potion in pixel art',{PIXELWEAVE_MODEL:'test-model'},fakeFetch);
 assert.equal(count,5);assert.equal(r.asset.layers.length,4);
 assert.equal(r.asset.layers[0].frames.length,4);
 assert.equal(r.asset.width,16);assert.equal(r.asset.palette['.'],'transparent');
 assert.equal(r.pipeline,'progressive');
});
