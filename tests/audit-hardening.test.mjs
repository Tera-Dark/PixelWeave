import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localRequestAllowed,localApiRequestAllowed,isPublicProjectPath} from '../src/local-request-guard.mjs';
import {buildNativePotion} from '../src/native-potion.mjs';
import {renderExploded,resetExplodedCache} from '../src/exploded.js';

const native=buildNativePotion();
test('localhost-only model proxy denies hostile Origin, malicious Host and cross-site fetches',()=>{
 const ok={host:'127.0.0.1:4173',origin:'http://127.0.0.1:4173','sec-fetch-site':'same-origin','content-type':'application/json'};
 assert.equal(localRequestAllowed(ok),true);
 assert.equal(localApiRequestAllowed(ok,'POST'),true);
 assert.equal(localApiRequestAllowed({host:'localhost:4173','content-type':'application/json'},'POST'),true);
 assert.equal(localRequestAllowed({...ok,host:'pixelweave.attacker.net:4173'}),false);
 assert.equal(localRequestAllowed({...ok,origin:'https://malicious.example'}),false);
 assert.equal(localRequestAllowed({...ok,origin:'not-a-valid-origin'}),false);
 assert.equal(localRequestAllowed({...ok,'sec-fetch-site':'cross-site'}),false);
 assert.equal(localRequestAllowed({...ok,'sec-fetch-site':'same-site'}),false);
 assert.equal(localApiRequestAllowed({...ok,'content-type':'text/plain'},'POST'),false);
 assert.equal(localApiRequestAllowed({...ok,'content-type':'application/json;charset=UTF-8'},'POST'),true);
});
test('local proxy actually enforces request guards for API and static routes',()=>{
 const server=readFileSync(new URL('../dev-server.mjs',import.meta.url),'utf8');
 assert.match(server,/localRequestAllowed\(req\.headers\)/);
 assert.match(server,/localApiRequestAllowed\(req\.headers,req\.method\)/);
 assert.match(server,/\.listen\(4173,'127\.0\.0\.1'/);
});
test('Studio restores saved user edits and never resurrects old rejected gallery sprites',()=>{
 const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const a=src.indexOf('  state.items=[asset];'),r=src.indexOf('  restore();',a),g=src.indexOf('  renderGallery();refresh();',r);
 assert.ok(a>=0&&r>a&&g>r);
 assert.match(src,/if\(v\.id!==POTION_ID&&!\/\^layered-/);
 assert.match(src,/localStorage\.setItem\('pixelweave\.v04'/);
});
test('Studio onion-skin layer is optional, frame-aware and not part of the exported artwork',()=>{
 const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/pixel-ui.css',import.meta.url),'utf8');
 for(const id of ['onion-canvas','toggle-onion'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(src,/const showOnion=onionEnabled&&!state\.play/);
 assert.match(src,/renderAsset\(onion,current\(\),\(state\.frame\+current\(\)\.frames-1\)%current\(\)\.frames,layers\(\)\)/);
 assert.match(css,/pointer-events:none;opacity:\.28/);
});
function fakeContext(stats,offscreen=false){
 return {
  clearRect(){},fillRect(){if(offscreen)stats.paint++;},drawImage(){stats.draw++;},
  createLinearGradient(){return {addColorStop(){}};},
  setLineDash(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},
  fill(){},stroke(){},strokeRect(){},ellipse(){},fillText(){},
  save(){},restore(){},set globalAlpha(_v){},get globalAlpha(){return 1;},
  set fillStyle(_v){},get fillStyle(){return ''},set strokeStyle(_v){},
  set imageSmoothingEnabled(_v){},set font(_v){},set lineWidth(_v){}
 };
}
test('exploded view renders each native frame once and invalidates only edited pixel content',()=>{
 const prior=globalThis.document;
 const stats={paint:0,draw:0};
 const offscreen=()=>({width:0,height:0,getContext:()=>fakeContext(stats,true)});
 globalThis.document={createElement:offscreen};
 try{
  resetExplodedCache();
  const canvas={width:1280,height:610,getContext:()=>fakeContext(stats)};
  renderExploded(canvas,native,0,{activeLayer:'crimson_liquid'});
  const originalPaint=stats.paint;assert.ok(originalPaint>100);
  renderExploded(canvas,native,0,{activeLayer:'back_glass'});
  assert.equal(stats.paint,originalPaint,'changing the selected plate should not repaint every pixel');
  // One pixel edit invalidates the corresponding raster cache.
  const a=native.layers.find(l=>l.id==='back_glass');
  const old=a.frames[0][20];
  a.frames[0][20]='0'+old.slice(1);
  renderExploded(canvas,native,0,{activeLayer:'back_glass'});
  assert.ok(stats.paint>originalPaint,'edited source row should invalidate raster');
 }finally{resetExplodedCache();globalThis.document=prior;}
});
test('Atlas always clears tainted foreign pixels before local frame-diff inspection',()=>{
 const viewer=readFileSync(new URL('../references/reference.js',import.meta.url),'utf8');
 assert.match(viewer,/canvas\.width=canvas\.width/);
 assert.match(viewer,/const serial=\+\+loadSerial/);
 assert.match(viewer,/serial!==loadSerial/);
 assert.match(viewer,/Math\.max\(0\.01,fit\)/);
});

test('static server never exposes dotfiles or sensitive development directories',()=>{
 for(const name of ['/index.html','/references/','/src/main.js','/knowledge/pixel-art/lab.html'])assert.equal(isPublicProjectPath(name),true);
 for(const name of ['/.env','/.git/config','/src/.env.local','/node_modules/package/index.js','/tests/pixel-lab.test.mjs','/dev-server.mjs','/private/config.json'])assert.equal(isPublicProjectPath(name),false,name);
 const server=readFileSync(new URL('../dev-server.mjs',import.meta.url),'utf8');
 assert.match(server,/isPublicProjectPath\(path\)/);
});
