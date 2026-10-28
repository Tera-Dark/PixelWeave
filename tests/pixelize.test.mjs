import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {logicalSize,exportSize,pixelizeImageData,toLayeredProject,TRANSFER_KEY} from '../src/pixelize-core.mjs';
import {validateLayered} from '../src/layered.js';

function image(w,h,fn){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const rgba=fn(x,y),i=(y*w+x)*4;
  data.set(rgba,i);
 }
 return {width:w,height:h,data};
}
test('pixel grid keeps aspect ratio with arbitrary original dimensions',()=>{
 assert.deepEqual(logicalSize(1024,768,96),{width:96,height:72});
 assert.deepEqual(logicalSize(5,9,64),{width:36,height:64});
 assert.deepEqual(logicalSize(1,1,8),{width:8,height:8});
 assert.throws(()=>logicalSize(256,128,0),/原生长边/);
 assert.throws(()=>logicalSize(256,128,513),/原生长边/);
});
test('nearest-neighbor export accepts EVERY integer scale, not just powers of two',()=>{
 for(const n of [1,2,3,5,7,11,13,17,31,64,128]){
  assert.deepEqual(exportSize(32,24,n),{width:32*n,height:24*n,scale:n});
 }
 for(const n of [0,1.5,-3,129,Infinity,NaN])assert.throws(()=>exportSize(32,32,n),/整数/);
 assert.throws(()=>exportSize(512,512,128),/过大/);
});
test('quantizer emits discrete colors only and retains transparent pixels',()=>{
 const src=image(8,8,(x,y)=>x===0?[255,0,255,0]:x<4?[255,12+y,10,255]:[8,y*2,241,255]);
 const out=pixelizeImageData(src,{colors:2,alphaThreshold:128});
 const used=new Set();
 for(let i=0;i<out.data.length;i+=4){
  const alpha=out.data[i+3];
  assert.ok(alpha===0||alpha===255);
  if(alpha===255)used.add([...out.data.slice(i,i+3)].join(','));
 }
 assert.equal(out.data[3],0);
 assert.equal(used.size,2);
 assert.ok(out.palette.length<=2);
});
test('ordered dithering is deterministic and keeps the selected palette limit',()=>{
 const src=image(32,32,(x,y)=>[x*7,y*6,(x+y)*3,255]);
 const a=pixelizeImageData(src,{colors:8,dither:true});
 const b=pixelizeImageData(src,{colors:8,dither:true});
 assert.deepEqual(a.data,b.data);
 assert.ok(a.palette.length<=8);
 const colors=new Set();
 for(let i=0;i<a.data.length;i+=4)colors.add([...a.data.slice(i,i+3)].join(','));
 assert.ok(colors.size<=8);
});
test('one-frame image bridge produces validated editable PixelWeave layered project',()=>{
 const src=image(24,16,(x,y)=>x<12?[20,50,80,255]:[240,140,70,255]);
 const quantized=pixelizeImageData(src,{colors:16});
 const project=toLayeredProject(quantized,'AI image → Sprite');
 const checked=validateLayered(project);
 assert.equal(checked.layers.length,1);
 assert.equal(checked.layers[0].frames.length,1);
 assert.equal(checked.layers[0].frames[0].length,16);
 assert.equal(checked.layers[0].frames[0][0].length,24);
 assert.equal(checked.palette['.'],'transparent');
 assert.equal(typeof TRANSFER_KEY,'string');
 assert.throws(()=>toLayeredProject(image(65,65,()=>[20,50,80,255])) ,/8–64/);
});
test('pixelizer page is isolated and wired to shared navigation and Studio handoff',()=>{
 const html=readFileSync(new URL('../pixelize/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/pixelize.js',import.meta.url),'utf8');
 assert.equal([...html.matchAll(/data-pw-header/g)].length,1);
 assert.match(html,/src="\.\.\/src\/pixelize\.js"/);
 for(const id of ['px-file','px-edge-number','px-colors-number','px-scale','px-dither','px-result','px-download-native','px-download-scaled','px-send-studio','px-status'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/ctx\.imageSmoothingEnabled=false/);
 assert.match(js,/sessionStorage\.setItem\(TRANSFER_KEY/);
 const studio=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(studio,/sessionStorage\.getItem\(TRANSFER_KEY\)/);
 const wf=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 assert.match(wf,/cp -R src references knowledge docs pixelize _site\//);
});
