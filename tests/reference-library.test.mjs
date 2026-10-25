import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {frameDimensions,framePosition,previewIndices,validGrid} from '../references/viewer-core.mjs';
const library=JSON.parse(readFileSync(new URL('../references/curation.json',import.meta.url),'utf8'));
const page=readFileSync(new URL('../references/index.html',import.meta.url),'utf8');
const viewer=readFileSync(new URL('../references/reference.js',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('curated reference library is explicitly independent and source attributed',()=>{
 assert.equal(library.format,'pixelweave/reference-v1');
 assert.ok(library.items.length>=8);
 assert.equal(new Set(library.items.map(i=>i.id)).size,library.items.length);
 for(const r of library.items){
  assert.ok(r.author&&r.title&&r.license&&r.question);
  assert.match(r.url,/^https:\/\//);
  assert.ok(['sheet','frames','external'].includes(r.mode));
  if(r.mode==='sheet'){
   assert.match(r.sheet,/^https:\/\//);
   assert.equal(r.cols*r.rows,r.frames);
  }
  if(r.mode==='frames')assert.equal(r.images.length,r.frames);
  if(r.license==='All rights reserved')assert.equal(r.mode,'external');
 }
});
test('external sources remain references and never become project original gallery sprites',()=>{
 assert.match(home,/href="\.\/references\//);
 assert.ok(!viewer.includes("createLayeredAsset("));
 assert.ok(!viewer.includes("state.items.push("));
 assert.ok(!viewer.includes("fetch('/api/generate'"));
 assert.match(page,/原作者页面/);
 assert.match(page,/不上传/);
});
test('frame grid math handles long 10x6 sheet and 4x3 sheet',()=>{
 assert.deepEqual(frameDimensions(640,384,10,6),{width:64,height:64,count:60});
 assert.deepEqual(framePosition(59,10,6),{x:9,y:5});
 assert.deepEqual(framePosition(0,10,6),{x:0,y:0});
 assert.deepEqual(framePosition(12,4,3),{x:0,y:0});
 assert.equal(validGrid(127,32,4,1),false);
 assert.throws(()=>frameDimensions(127,32,4,1));
});
test('timeline contact sampling preserves first, last and ordered unique frames',()=>{
 const sample=previewIndices(60,12);
 assert.equal(sample.length,12);
 assert.equal(sample[0],0);
 assert.equal(sample.at(-1),59);
 assert.ok(sample.every((n,i)=>i===0||n>sample[i-1]));
 assert.deepEqual(previewIndices(4,12),[0,1,2,3]);
 assert.deepEqual(previewIndices(0),[]);
});
test('reference studio UI provides playback, local import, attribution and reusable research notes',()=>{
 const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['ref-canvas','timeline','play','prev','next','speed','onion','difference','background','study-notes','favorite','original-link','import-file','import-cols','import-rows','apply-grid','surprise','only-saved']){
  assert.ok(ids.includes(id),id);
 }
 assert.match(viewer,/localStorage/);
 assert.match(viewer,/getImageData/);
 assert.match(viewer,/onion/);
 assert.match(viewer,/sourcePart/);
});
