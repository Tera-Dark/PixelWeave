import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../references/index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../references/reference.js',import.meta.url),'utf8');
const style=readFileSync(new URL('../references/reference.css',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const homeScript=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const pixelCss=readFileSync(new URL('../src/pixel-ui.css',import.meta.url),'utf8');
test('Atlas structural order keeps library, player and inspector as sibling work panes',()=>{
 const order=['id="atlas-library"','class="atlas-main"','id="atlas-side"'].map(x=>html.indexOf(x));
 assert.ok(order.every(x=>x>=0));
 assert.ok(order[0]<order[1]&&order[1]<order[2]);
 assert.ok(html.indexOf('id="ref-canvas"')>order[1]);
 assert.ok(html.indexOf('id="study-notes"')>order[2]);
});
test('Atlas controls all remain reachable after three-pane restructuring',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['search','category','sort','only-playable','only-saved','clear-filters',
   'ref-list','ref-canvas','timeline','play','prev','next','speed','contact','onion','difference',
   'study-notes','panel-notes','panel-source','tab-notes','tab-source','toggle-library','toggle-inspector',
   'keyboard-help','shortcut-panel','close-shortcuts','main-source-link','import-file','apply-grid']){
  assert.ok(ids.includes(id),id);
 }
});
test('workspace layout follows progressive disclosure and saves local UI preferences',()=>{
 assert.match(html,/role="tablist"/);
 assert.match(html,/<details class="atlas-import"/);
 assert.match(html,/aria-controls="atlas-library"/);
 assert.match(html,/aria-controls="atlas-side"/);
 assert.match(script,/pixelweave\.atlas\.layout\.v1/);
 assert.match(script,/persistLayout/);
 assert.match(script,/function applyLayout/);
 assert.match(script,/layoutPreference\.tab==='source'/);
 assert.match(style,/\.atlas-body\.library-hidden/);
 assert.match(style,/\.atlas-body\.inspector-hidden/);
});
test('quick tools route reliably and avoid typing shortcuts inside editable controls',()=>{
 assert.match(script,/closest\?\.\('input,textarea,select,\[contenteditable=true\]'\)/);
 assert.match(script,/e\.key==='ArrowLeft'/);
 assert.match(script,/e\.key==='ArrowRight'/);
 assert.match(script,/e\.key==='f'/);
 assert.match(script,/\$\('clear-filters'\)\.onclick/);
 assert.match(script,/visible\.sort/);
});
test('Studio defaults to focused authoring and leaves the single potion artifact unchanged',()=>{
 assert.match(home,/id="studio-composer-drawer"/);
 assert.match(home,/<details class="studio-composer-drawer"/);
 assert.match(home,/id="jump-exploded"/);
 assert.match(home,/id="jump-composer"/);
 assert.match(homeScript,/\$\('jump-exploded'\)\.onclick/);
 assert.match(homeScript,/\$\('jump-composer'\)\.onclick/);
 assert.match(homeScript,/state\.items=\[asset\]/);
 assert.match(pixelCss,/\.studio-composer-drawer/);
});
test('responsive containers and human legibility take precedence over decorative pixels',()=>{
 assert.match(style,/@media\(max-width:700px\)/);
 assert.match(style,/@media\(max-width:960px\)/);
 assert.match(pixelCss,/@media\(max-width:600px\)/);
 assert.match(style,/\.atlas-shortcuts\[hidden\]\{display:none!important\}/);
});
