import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {validateLayered,renderLayered} from '../src/layered.js';

const root=fileURLToPath(new URL('../knowledge/pixel-art/',import.meta.url));
const read=p=>readFileSync(join(root,p),'utf8');
const manifest=JSON.parse(read('manifest.json'));

test('knowledge source manifest is complete and versioned',()=>{
 assert.equal(manifest.$schemaVersion,'pixelweave-knowledge-v1');
 assert.equal(manifest.chapters.length,7);
 assert.ok(manifest.routeProfiles.length>=6);
 assert.equal(manifest.sourceCatalog.curatedReferences,27);
 assert.ok(read('SOURCES.md').includes('S27'));
});

test('all chapter and resource links point to real handbook files',()=>{
 for(const c of manifest.chapters){
  assert.ok(existsSync(join(root,c.file)),c.file);
  assert.ok(read(c.file).length>=1500,'lesson is too short: '+c.file);
 }
 for(const name of manifest.modules.core)assert.ok(existsSync(join(root,name)));
 for(const key of ['creativePipeline','curriculum','sources'])assert.ok(existsSync(join(root,manifest.modules[key])));
 for(const p of manifest.routeProfiles){
  assert.ok(p.techniques.length>=1&&p.techniques.length<=3,p.id);
  for(const file of p.techniques)assert.ok(existsSync(join(root,file)),p.id+': '+file);
 }
});

test('learning prerequisites resolve without circular dependencies',()=>{
 const chapters=new Map(manifest.chapters.map(c=>[c.id,c]));
 const visiting=new Set(),done=new Set();
 const visit=id=>{
  assert.ok(chapters.has(id),'unknown prerequisite '+id);
  if(done.has(id))return;
  assert.ok(!visiting.has(id),'cycle at '+id);
  visiting.add(id);
  for(const prev of chapters.get(id).requires)visit(prev);
  visiting.delete(id);done.add(id);
 };
 for(const c of manifest.chapters)visit(c.id);
});

test('training potion is a valid layered asset with frozen body and moving liquid',()=>{
 const d=validateLayered(JSON.parse(read('examples/learning-potion.layered.json')));
 assert.equal(d.width,16);assert.equal(d.height,16);
 assert.equal(d.layers.length,6);assert.equal(d.layers[0].frames.length,4);
 const outline=d.layers.find(l=>l.id==='outline'),liquid=d.layers.find(l=>l.id==='liquid');
 assert.ok(outline.frames.every(frame=>JSON.stringify(frame)===JSON.stringify(outline.frames[0])));
 assert.notDeepEqual(liquid.frames[0],liquid.frames[1]);
 let painted=0;
 const ctx={clearRect(){},fillRect(){painted++},set globalAlpha(v){},get globalAlpha(){return 1;}};
 const c={width:96,height:96,getContext:()=>ctx};
 for(let f=0;f<4;f++)renderLayered(c,d,f);
 assert.ok(painted>20);
});

test('knowledge assets remain distinct from third-party republished tutorial content',()=>{
 const sources=read('SOURCES.md');
 assert.ok(sources.includes('不复制教程'));
 assert.ok(manifest.policy.copyright.includes('never redistribute'));
 assert.ok(manifest.ruleClasses.hard&&manifest.ruleClasses.diagnostic&&manifest.ruleClasses.aesthetic);
});
