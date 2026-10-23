import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const ids=[...src.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);
test('every referenced Studio control exists in the HTML',()=>{
 for(const id of new Set(ids))assert.ok(html.includes('id="'+id+'"'),'Missing #'+id);
});
test('HTML document contains no duplicate IDs',()=>{
 const found=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(found).size,found.length);
});
test('static site imports ES modules relatively and has no hardcoded API secret',()=>{
 assert.match(html,/src="\.\/src\/main\.js"/);
 assert.ok(!src.includes('sk-proj-'));
});
