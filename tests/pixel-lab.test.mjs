import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../knowledge/pixel-art/lab.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../knowledge/pixel-art/lab.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../knowledge/pixel-art/lab-pixel.css',import.meta.url),'utf8');
test('learning lab now showcases only the first authorized native potion',()=>{
 assert.match(js,/buildNativePotion/);
 assert.match(js,/index=\[\{id:'vermilion-native-v1'/);
 assert.ok(!js.includes('examples/reference/index.json'));
 assert.match(js,/await choose\(0\)/);
});
test('learning lab uses shared pixel UI theme with scoped layout fixes',()=>{
 assert.match(html,/src\/pixel-ui\.css/);
 assert.match(html,/lab-pixel\.css/);
 assert.match(css,/\.lab-layout/);
 assert.match(css,/@media\(max-width:740px\)/);
});
test('gallery stays single asset while archived examples are not reintroduced',()=>{
 const app=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(app,/state\.items=\[asset\]/);
 assert.match(app,/const featured=state\.items\.filter\(a=>a\.id===POTION_ID\)/);
 assert.ok(!app.includes('toggle-archive'));
});
