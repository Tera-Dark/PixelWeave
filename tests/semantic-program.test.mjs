import test from 'node:test';
import assert from 'node:assert/strict';
import {compileSemanticProgram,SEMANTIC_FORMAT,makeSemanticPrompt} from '../src/semantic-program.mjs';
import {generateSemantic} from '../src/semantic-generator.mjs';

const program=()=>({
 format:SEMANTIC_FORMAT,name:'Lantern Study',width:24,height:24,frames:4,fps:8,
 palette:{'.':'transparent',K:'#23212a',R:'#cc405b',H:'#ffe2a6'},
 layers:[
  {id:'cage',name:'Rigid cage',kind:'static',base:[{op:'rect',x:4,y:4,w:13,h:15,color:'K',fill:false}]},
  {id:'flame',name:'Flame',kind:'animated',base:[{op:'ellipse',x:7,y:9,w:6,h:7,color:'R'}],
   motion:[{dx:0,dy:0,ops:[]},{dx:1,dy:-1,ops:[]},{dx:0,dy:0,ops:[{op:'pixel',x:10,y:7,color:'H'}]},{dx:-1,dy:0,ops:[]}]}
 ]
});
test('semantic program compiles genuine layers with frozen static cels and a moving layer',()=>{
 const r=compileSemanticProgram(program()),d=r.asset;
 assert.equal(d.format,'pixelweave/layered-v1');assert.equal(d.width,24);assert.equal(d.layers.length,2);
 assert.equal(d.layers[0].frames.length,4);
 assert.deepEqual(d.layers[0].frames[0],d.layers[0].frames[3]);
 assert.notDeepEqual(d.layers[1].frames[0],d.layers[1].frames[1]);
 assert.ok(d.layers[0].frames[0].some(row=>row.includes('K')));
 assert.ok(d.layers[1].frames[0].some(row=>row.includes('R')));
});
test('semantic clipTo strictly masks later layer against the per-frame approved predecessor',()=>{
 const p=program();p.layers[1].clipTo='cage';
 // Cage has ONLY its outline; flame does not overlap that outline.
 assert.throws(()=>compileSemanticProgram(p),/完全空白/);
 p.layers[0].base[0].fill=true;
 const result=compileSemanticProgram(p).asset;
 for(let f=0;f<4;f++)for(let y=0;y<24;y++)for(let x=0;x<24;x++){
  if(result.layers[1].frames[f][y][x]!=='.')assert.notEqual(result.layers[0].frames[f][y][x],'.');
 }
});
test('fails closed on unsafe ops, invalid color, out-of-bounds and static motion',()=>{
 const p=program();p.layers[0].base[0].op='eval';
 assert.throws(()=>compileSemanticProgram(p),/未授权绘图指令/);
 const c=program();c.layers[0].base[0].color='Z';
 assert.throws(()=>compileSemanticProgram(c),/未定义的色板符号/);
 const o=program();o.layers[0].base[0].x=23;
 assert.throws(()=>compileSemanticProgram(o),/超出画布/);
 const s=program();s.layers[0].motion=[{dx:1,dy:0,ops:[]}];
 assert.throws(()=>compileSemanticProgram(s),/静态图层不允许 motion/);
 const j=program();j.layers[1].motion=Array.from({length:4},()=>({dx:0,dy:0,ops:[]}));
 assert.throws(()=>compileSemanticProgram(j),/没有真正的帧间变化/);
});
test('offline LLM instructions are self-contained and compile-ready',()=>{
 const prompt=makeSemanticPrompt('古老的地牢灯笼');
 for(const token of ['古老的地牢灯笼','semantic-v1','motion','static','polygon','JSON'])assert.ok(prompt.includes(token));
});
const director=JSON.stringify({name:'Red Lantern',palette:{'.':'transparent',K:'#23212a',R:'#cc405b'},anchors:['fixed handle'],layers:[
 {id:'cage',name:'Solid cage',kind:'static',purpose:'Draw the rigid dark lantern enclosure'},
 {id:'flame',name:'Flame',kind:'animated',purpose:'Animate a red flame behind metal frame'}
]});
const cage=JSON.stringify({base:[{op:'rect',x:5,y:5,w:12,h:14,color:'K',fill:false}]});
const flame=JSON.stringify({base:[{op:'ellipse',x:9,y:10,w:4,h:6,color:'R'}],motion:[
 {dx:0,dy:0,ops:[]},{dx:1,dy:0,ops:[]},{dx:0,dy:-1,ops:[]},{dx:-1,dy:0,ops:[]}
]});
function model(responses){
 let n=0;const prompts=[];
 return {prompts,fetch:async(_url,opt)=>{
  prompts.push(JSON.parse(opt.body).messages[1].content);
  const value=responses[n++];
  if(value===undefined)throw Error('unexpected model request '+n);
  return {ok:true,json:async()=>({choices:[{message:{content:value}}]})};
 }};
}
test('director plans custom layers; semantic pipeline validates each accepted stage',async()=>{
 const mock=model([director,cage,flame]);
 const r=await generateSemantic('一盏有真实四帧火焰的古老灯笼',{PIXELWEAVE_MODEL:'fake'},mock.fetch);
 assert.equal(r.pipeline,'semantic-v1');assert.equal(r.attempts,3);assert.equal(r.stages.length,3);
 assert.equal(r.asset.layers[0].id,'cage');assert.equal(r.asset.layers[1].id,'flame');
 assert.notDeepEqual(r.asset.layers[1].frames[0],r.asset.layers[1].frames[1]);
 assert.ok(mock.prompts[2].includes('PREVIOUS COMPILED ART'));
 assert.ok(mock.prompts[2].includes('K'));
});
test('repair failures are scoped to the current layer; accepted previous layers remain unchanged',async()=>{
 const bad=JSON.stringify({base:[{op:'rect',x:23,y:23,w:12,h:12,color:'R'}],motion:[{dx:0,dy:0,ops:[]},{dx:1,dy:0,ops:[]},{dx:0,dy:0,ops:[]},{dx:-1,dy:0,ops:[]}]});
 const mock=model([director,cage,bad,flame]);
 const r=await generateSemantic('一盏需要轻微摇曳的红色灯笼',{PIXELWEAVE_MODEL:'fake'},mock.fetch);
 assert.equal(r.attempts,4);assert.equal(r.stages[2].attempts,2);
 assert.ok(mock.prompts[3].includes('图形超出画布'));
 assert.deepEqual(r.asset.layers[0].frames[0],r.asset.layers[0].frames[3]);
});
test('invalid director plan is not silently replaced by unrelated potion template',async()=>{
 const mock=model(['{}','{}']);
 await assert.rejects(generateSemantic('一位正在走路的像素骑士',{PIXELWEAVE_MODEL:'fake'},mock.fetch),/director 校验失败/);
 assert.equal(mock.prompts.length,2);
});
