import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SITE_SECTIONS,SITE_VERSION,siteUrl,currentSection} from '../src/site-nav.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('all top-level routes are defined once with stable names and ordering',()=>{
 assert.deepEqual(SITE_SECTIONS.map(s=>s.id),['gallery','studio','atlas','lab']);
 assert.deepEqual(SITE_SECTIONS.map(s=>s.label),['作品画廊','创作工作站','动画参考库','学习实验室']);
 assert.equal(new Set(SITE_SECTIONS.map(s=>s.path)).size,4);
 assert.equal(SITE_VERSION,'v0.8');
 for(const s of SITE_SECTIONS)assert.ok(new URL(siteUrl(s.id)).pathname);
 assert.throws(()=>siteUrl('missing'));
});
test('route awareness supports Pages subdirectories, nested lab and direct anchors',()=>{
 assert.equal(currentSection('/PixelWeave/','#gallery'),'gallery');
 assert.equal(currentSection('/PixelWeave/index.html','#studio'),'studio');
 assert.equal(currentSection('/PixelWeave/references/'),'atlas');
 assert.equal(currentSection('/PixelWeave/references/index.html'),'atlas');
 assert.equal(currentSection('/PixelWeave/knowledge/pixel-art/lab.html'),'lab');
 assert.equal(currentSection('/PixelWeave/index.html','#collection'),'gallery');
});
test('every authored page uses one shared navigation mount, no independently duplicated menu items',()=>{
 for(const [page,css] of [
  ['index.html','./src/site-nav.css'],
  ['references/index.html','../src/site-nav.css'],
  ['knowledge/pixel-art/lab.html','../../src/site-nav.css']
 ]){
  const html=read(page);
  assert.equal([...html.matchAll(/data-pw-header/g)].length,1,page+' mount');
  assert.ok(html.includes('href="'+css+'"'),page+' shared stylesheet');
  assert.equal([...html.matchAll(/<nav\b/g)].length,0,page+' should not hardcode top nav');
  assert.equal([...html.matchAll(/<header\b/g)].length,1,page+' should have one header');
 }
 const entries=[
 ['src/main.js',"mountSiteNavigation();events()"],
 ['references/reference.js','mountSiteNavigation();'],
 ['knowledge/pixel-art/lab.js','mountSiteNavigation();']
 ];
 for(const [path,marker] of entries)assert.ok(read(path).includes(marker),path+' mount');
});
test('SPA route state can use real history without full document navigation',()=>{
 const s=read('src/main.js'),shell=read('src/site-nav.mjs');
 assert.match(s,/history\.pushState/);
 assert.match(s,/addEventListener\('popstate'/);
 assert.match(s,/e\.preventDefault\(\);route\(b\.dataset\.page\)/);
 assert.match(s,/syncSiteNavigation\(\)/);
 assert.match(shell,/aria-current/);
 assert.match(shell,/dataset\.pwNav/);
});
test('global shared styles are scoped and have mobile rail overflow handling',()=>{
 const css=read('src/site-nav.css');
 assert.match(css,/\.pw-header \.pw-nav-link/);
 assert.match(css,/overflow-x:auto!important/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/\.pw-header \.pw-main-nav/);
});
