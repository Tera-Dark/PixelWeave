import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildNativePotion} from '../src/native-potion.mjs';
import {layerBounds,layerView,renderSingleLayer} from '../src/layer-focus.js';
const a=buildNativePotion();
function canvas(width=320,height=320){
 let draws=0,alpha=1;
 const ctx={clearRect(){},fillRect(){draws++;},set fillStyle(v){this.color=v;},set imageSmoothingEnabled(v){this.smooth=v;},set globalAlpha(v){alpha=v;},get globalAlpha(){return alpha;}};
 return {width,height,getContext:()=>ctx,draws:()=>draws,alpha:()=>alpha};
}
test('native selected layer inspector reads the real editable frame rows',()=>{
 const liquid=layerBounds(a,'crimson_liquid',0);
 assert.ok(liquid);
 assert.ok(liquid.width>12&&liquid.width<=64);
 assert.ok(liquid.height>12&&liquid.height<=64);
 assert.ok(liquid.pixels>100);
 assert.equal(layerBounds(a,'missing',0),null);
});
test('bounds are frame-sensitive while stable repair layer stays spatially fixed',()=>{
 const stable=Array.from({length:12},(_,f)=>layerBounds(a,'copper_repair',f));
 stable.slice(1).forEach(item=>assert.deepEqual(item,stable[0]));
 const liquid=Array.from({length:12},(_,f)=>layerBounds(a,'crimson_liquid',f));
 assert.ok(new Set(liquid.map(item=>JSON.stringify(item))).size>1);
});
test('auto-fit magnifies sparse layers without exceeding integer pixel scale or changing source',()=>{
 const original=JSON.stringify(a);
 const full=layerView(a,'inner_bubbles',0,{fit:false});
 const fitted=layerView(a,'inner_bubbles',0,{fit:true});
 assert.ok(fitted.scale>=full.scale);
 assert.ok(Number.isInteger(fitted.scale));
 assert.ok(fitted.scale<=24);
 assert.equal(JSON.stringify(a),original);
});
test('inspector draws layer only, respects native alpha and supports transparent export',()=>{
 const c=canvas();const result=renderSingleLayer(c,a,'crimson_liquid',2,{fit:true,background:'checker'});
 assert.ok(result.bounds.pixels>0);
 assert.ok(c.draws()>result.bounds.pixels);
 assert.equal(c.alpha(),1);
 const native=canvas(64,64);
 renderSingleLayer(native,a,'copper_repair',0,{native:true});
 assert.ok(native.draws()>0);
 assert.equal(native.alpha(),1);
});
test('selected-layer controls and pixel UI theme are present and accessible',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const code=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const style=readFileSync(new URL('../src/pixel-ui.css',import.meta.url),'utf8');
 for(const id of ['focus-canvas','focus-fit','focus-bg','focus-export','focus-layer-index','focus-pixels','focus-bounds','focus-layer-state','exploded-canvas']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(html,/src\/pixel-ui\.css/);
 assert.match(html,/aria-pressed="true"/);
 assert.match(code,/renderSingleLayer\(\$\('focus-canvas'\)/);
 assert.match(code,/renderSingleLayer\(native/);
 assert.match(style,/\.focus-panel/);
 assert.match(style,/@media\(max-width:610px\)/);
});
