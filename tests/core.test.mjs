import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMOS,renderAsset,validateMatrix,makeImported,makePrompt,SIZE} from '../src/engine.js';
function fakeCanvas(){
 let strokes=0;const c={
 fillRect(){strokes++},strokeRect(){strokes++},beginPath(){},closePath(){},moveTo(){},lineTo(){},
 clip(){},fill(){strokes++},clearRect(){},save(){},restore(){},scale(){},translate(){}
 };
 return {canvas:{width:SIZE,height:SIZE,getContext:()=>c},count:()=>strokes};
}
test('four gallery demos draw every frame without exceptions',()=>{
 assert.equal(DEMOS.length,4);
 for(const a of DEMOS){
  const f=fakeCanvas();for(let i=0;i<a.frames;i++)renderAsset(f.canvas,a,i);
  assert.ok(f.count()>50,a.name+' drew no meaningful pixels');
 }
});
test('single-palette sprite frame validates',()=>{
 const s={name:'Test',width:4,height:4,palette:{'.':'transparent',R:'#c53253'},frames:[['.RR.','RRRR','RRRR','.RR.']]};
 const v=validateMatrix(s);assert.equal(v.frames.length,1);
 const i=makeImported(v);assert.equal(i.frames,1);
 const f=fakeCanvas();renderAsset(f.canvas,i,0);assert.ok(f.count()>0);
});
test('rejects mismatched row width',()=>{
 const s={name:'invalid',width:4,height:4,palette:{'.':'transparent',R:'#c53253'},frames:[['.RR','RRRR','RRRR','.RR.']]};
 assert.throws(()=>validateMatrix(s),/宽度错误/);
});
test('rejects unknown character and untrusted palette value',()=>{
 const s={name:'invalid',width:4,height:4,palette:{'.':'transparent',R:'#c53253'},frames:[['.RR.','RRRR','RRRR','XRR.']]};
 assert.throws(()=>validateMatrix(s),/未定义颜色/);
 assert.throws(()=>validateMatrix({...s,palette:{'.':'transparent',R:'red'}}),/调色板/);
});
test('rejects excessive dimensions and frame counts',()=>{
 const x={name:'too big',width:100,height:100,palette:{'.':'transparent'},frames:[]};
 assert.throws(()=>validateMatrix(x),/width/);
 const s={width:4,height:4,palette:{'.':'transparent'},frames:Array.from({length:17},()=>['....','....','....','....'])};
 assert.throws(()=>validateMatrix(s),/frames/);
});
test('valid generated prompt describes purely text based frame protocol',()=>{
 const p=makePrompt('红色血瓶');assert.ok(p.includes('红色血瓶'));assert.ok(p.includes('JSON'));assert.ok(p.includes('不要使用'));
});
