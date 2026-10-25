import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {expandPackedAsset} from '../src/potion-loader.js';
import {validateLayered} from '../src/layered.js';
const base64=readFileSync(new URL('../assets/vermilion-v3.pack',import.meta.url),'utf8').trim();
const compressed=Buffer.from(base64,'base64');
const packed=JSON.parse(gunzipSync(compressed).toString('utf8'));
const asset=validateLayered(expandPackedAsset(packed));
test('packed potion expands into actual 64x64 editable 12-frame art',()=>{
 assert.equal(asset.width,64);assert.equal(asset.height,64);assert.equal(asset.fps,8);
 assert.equal(asset.layers.length,10);assert.equal(asset.layers[0].frames.length,12);
 assert.ok(Object.keys(asset.palette).length<=32);
});
test('bottle, glass, copper and seal stay pixel-identical through entire loop',()=>{
 for(const id of ['aged_glass_body','front_glass_highlights','copper_repair','sealed_cork']){
  const l=asset.layers.find(l=>l.id===id);
  assert.ok(l,id);
  for(const rows of l.frames)assert.deepEqual(rows,l.frames[0],id);
 }
});
test('meniscus, bubbles, inner glow and highlight glints have real animated frames',()=>{
 for(const id of ['liquid_surface','floating_bubbles','inner_glow','reflection_glints']){
  const l=asset.layers.find(l=>l.id===id);
  assert.ok(new Set(l.frames.map(rows=>rows.join(''))).size>=3,'not animated: '+id);
 }
});
test('production gallery contains only the new potion; old 11 assets are not loaded',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(main.includes("state.items=[asset]"));
 assert.ok(main.includes("a.id==='potion-v3'"));
 assert.ok(!main.includes("items:[...DEMOS]"));
 assert.ok(!html.includes('id="toggle-archive"'));
});
