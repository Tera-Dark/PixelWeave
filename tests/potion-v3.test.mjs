import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildNativePotion,POTION_ID,POTION_FRAMES} from '../src/native-potion.mjs';
import {loadPotionAsset} from '../src/potion-loader.js';
import {validateLayered,metrics} from '../src/layered.js';
import {explodedLayout,layerAtPosition} from '../src/exploded.js';
const a=validateLayered(buildNativePotion());
test('potion is 100% native authored pixel data, 64x64 and 12 frames',()=>{
 assert.equal(a.width,64);assert.equal(a.height,64);assert.equal(a.fps,8);
 assert.equal(a.layers.length,11);assert.equal(a.layers[0].frames.length,POTION_FRAMES);
 assert.ok(Object.keys(a.palette).length<=32);
 assert.equal(POTION_ID,'vermilion-native-v1');
 assert.ok(!readFileSync(new URL('../src/potion-loader.js',import.meta.url),'utf8').includes('DecompressionStream'));
});
test('native asset loader returns a validated editable pixel matrix',async()=>{
 assert.deepEqual(await loadPotionAsset(),a);
});
test('sturdy glass, physical copper repairs and cork are frozen in every frame',()=>{
 for(const id of ['ground_shadow','back_glass','interior_tint','front_rim','copper_repair','neck_collar','cork_wax']){
  const l=a.layers.find(l=>l.id===id);
  assert.ok(l,id);
  for(const frame of l.frames)assert.deepEqual(frame,l.frames[0],id);
 }
});
test('liquid, refraction, bubbles and glow have distinct animated pixels',()=>{
 for(const id of ['crimson_liquid','deep_refraction','inner_bubbles','specular_glow']){
  const l=a.layers.find(l=>l.id===id);
  assert.ok(l,id);assert.ok(new Set(l.frames.map(r=>r.join(''))).size>=3,id+' does not animate');
 }
 const m=metrics(a);
 assert.equal(m.layers,11);assert.equal(m.frames,12);assert.ok(m.coverage>15);
});
test('small bubbles never draw outside the painted liquid on their active frames',()=>{
 const l=a.layers.find(x=>x.id==='crimson_liquid'),b=a.layers.find(x=>x.id==='inner_bubbles');
 for(let f=0;f<12;f++)for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  if(b.frames[f][y][x]!=='.')assert.notEqual(l.frames[f][y][x],'.','out of liquid frame '+f+' position '+x+','+y);
 }
});
test('exploded diagram has one selectable card per real layer in increasing diagonal positions',()=>{
 const p=explodedLayout(11,65);
 assert.equal(p.length,11);
 for(let i=1;i<p.length;i++){assert.ok(p[i].x>p[i-1].x);assert.ok(p[i].y<p[i-1].y);}
 assert.equal(layerAtPosition(p[10].x+180,p[10].y+60,11,65),10);
 assert.equal(layerAtPosition(-100,-100,11,65),-1);
});
test('production gallery contains only one approved native asset plus editable exploded structure',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(main.includes('state.items=[asset]'));
 assert.ok(main.includes("a.id===POTION_ID"));
 assert.ok(!main.includes('items:[...DEMOS]'));
 assert.ok(!html.includes('id="toggle-archive"'));
 assert.ok(html.includes('id="exploded-canvas"'));
 assert.ok(main.includes('renderExploded('));
});
