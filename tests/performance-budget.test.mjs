import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {resolve,dirname,extname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const content=path=>readFileSync(resolve(root,path),'utf8');
const projectPath=(base,path)=>relative(root,resolve(root,dirname(base),path)).replaceAll('\\','/');
const htmlEntries=[
 {html:'index.html',budgetKiB:220},
 {html:'references/index.html',budgetKiB:85},
 {html:'knowledge/pixel-art/lab.html',budgetKiB:80}
];
function inputGraph(entry,seen=new Set()){
 if(seen.has(entry))return seen;seen.add(entry);
 const src=content(entry);
 // ES imports are static and can be transitively counted without a bundler.
 for(const match of src.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?:[^'\n]*?\sfrom\s*)?['"](\.[^'"]+)['"]/g)){
  let rel=projectPath(entry,match[1]);
  if(!extname(rel))rel+='.js';
  inputGraph(rel,seen);
 }
 return seen;
}
function stylesIn(htmlPath){
 const h=content(htmlPath);
 return [...h.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)]
  .map(x=>x[1]).filter(x=>!x.startsWith('http')).map(x=>projectPath(htmlPath,x));
}
function jsIn(htmlPath){
 const h=content(htmlPath);
 const m=[...h.matchAll(/<script\b[^>]*type="module"[^>]*src="([^"]+)"/g)];
 assert.equal(m.length,1,htmlPath+' must have exactly one top-level entry module');
 return projectPath(htmlPath,m[0][1]);
}
test('page-specific synchronous first-party CSS+module graph budgets',()=>{
 for(const {html,budgetKiB} of htmlEntries){
  const files=[...inputGraph(jsIn(html)),...stylesIn(html)];
  const total=[...new Set(files)].reduce((bytes,p)=>bytes+statSync(resolve(root,p)).size,0);
  assert.ok(total<budgetKiB*1024,html+' = '+Math.round(total/1024)+' KiB > '+budgetKiB+' KiB budget');
 }
});
test('Atlas and Lab never synchronously load the heavyweight editor stylesheet',()=>{
 for(const page of ['references/index.html','knowledge/pixel-art/lab.html']){
  assert.ok(stylesIn(page).includes('src/site-base.css'));
  assert.ok(!stylesIn(page).includes('src/style.css'));
  assert.ok(!stylesIn(page).includes('src/pixel-ui.css'));
 }
});
test('fonts are optional and never block stylesheet waterfall',()=>{
 for(const page of htmlEntries){
  const h=content(page.html);
  assert.match(h,/fonts\.googleapis\.com/);
  assert.match(h,/media="print" onload="this\.media='all'"/);
 }
 for(const file of ['src/style.css','src/pixel-ui.css','knowledge/pixel-art/lab.css'])
  assert.doesNotMatch(content(file),/@import\s+url\(/);
});
test('offscreen and inactive animation surfaces do not render each animation frame',()=>{
 const main=content('src/main.js'),ref=content('references/reference.js');
 assert.match(main,/if\(document\.hidden\)/);
 assert.match(main,/if\(!\$\('studio-page'\)\.hidden\)/);
 assert.match(main,/isArtVisible\(x\.c\)/);
 assert.match(main,/isArtVisible\(cv\)/);
 assert.match(ref,/viewerVisible/);
 assert.match(ref,/document\.hidden/);
});
test('reference list thumbnails are lazy, selection is cheap and decoded image cache bounded',()=>{
 const ref=content('references/reference.js');
 assert.match(ref,/thumbnailObserver\.observe\(thumb\)/);
 assert.match(ref,/IMAGE_CACHE_LIMIT=12/);
 assert.match(ref,/while\(imageCache\.size>IMAGE_CACHE_LIMIT\)/);
 assert.match(ref,/for\(const b of \$\('ref-list'\)\.children\)/);
 assert.doesNotMatch(ref,/panel\(item\);renderLibrary\(\)/);
});
test('optional local model probe happens only when LLM panel opens',()=>{
 const main=content('src/main.js');
 assert.match(main,/composer\.addEventListener\('toggle'/);
 assert.match(main,/composer\.open&&!modelStatusRequested/);
 assert.doesNotMatch(main,/mountSiteNavigation\(\);events\(\);beginLLMStatus\(\)/);
});
