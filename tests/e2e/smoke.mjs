/**
 * v0.8 end-to-end smoke test using real headless Chromium.
 * Run: npm install --no-save playwright
 *      npx playwright install --with-deps chromium
 *      node tests/e2e/smoke.mjs
 */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const url='http://127.0.0.1:4173/';
const server=spawn(process.execPath,['dev-server.mjs'],{cwd:process.cwd(),env:{...process.env,PIXELWEAVE_MODEL:''},stdio:['ignore','pipe','pipe']});
let serverErrors='';
server.stderr.on('data',b=>{serverErrors+=String(b);});
async function available(){
 for(let i=0;i<75;i++){
  try{const r=await fetch(url);if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 throw Error('Dev server did not start: '+serverErrors.slice(-600));
}
let browser;
async function exported(page){
 const pending=page.waitForEvent('download');
 await page.locator('#export-json').click();
 const dl=await pending;
 return JSON.parse(await readFile(await dl.path(),'utf8'));
}
try{
 await available();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1450,height:920},acceptDownloads:true,reducedMotion:'reduce'});
 const uncaught=[];page.on('pageerror',e=>uncaught.push(e.message));
 await page.goto(url+'#studio',{waitUntil:'domcontentloaded'});
 await page.locator('#cel-grid .cel-cell').first().waitFor({timeout:20000});
 const cells=await page.locator('#cel-grid .cel-cell').count();
 assert.equal(cells,11*12,'expected layer×frame grid');
 await page.locator('#cel-grid .cel-cell[data-layer="crimson_liquid"][data-frame="4"]').click();
 assert.equal(await page.locator('#cel-grid .cel-cell.selected-cel').count(),1);
 // Choose palette symbol m and draw into an otherwise transparent corner.
 await page.locator('#layer-palette .palette-swatch[title^="m "]').click();
 const drawing=page.locator('#studio-canvas');
 const rect=await drawing.boundingBox();
 assert.ok(rect,'drawing canvas must be visible');
 const xp=rect.x+rect.width*(2.5/64),yp=rect.y+rect.height*(2.5/64);
 await page.mouse.move(xp,yp);await page.mouse.down();await page.mouse.move(xp+rect.width*3/64,yp);await page.mouse.up();
 let data=await exported(page);
 assert.equal(data.layers.find(l=>l.id==='crimson_liquid').frames[4][2].slice(2,6),'mmmm','brush line must not skip pixel positions');
 await page.locator('#layer-undo').click();
 data=await exported(page);
 assert.equal(data.layers.find(l=>l.id==='crimson_liquid').frames[4][2][2],'.','one undo must revert the entire drag');
 await page.locator('#layer-redo').click();
 data=await exported(page);
 assert.equal(data.layers.find(l=>l.id==='crimson_liquid').frames[4][2].slice(2,6),'mmmm');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#cel-grid .cel-cell').first().waitFor({timeout:20000});
 data=await exported(page);
 assert.equal(data.layers.find(l=>l.id==='crimson_liquid').frames[4][2].slice(2,6),'mmmm','autopersist on reload');
 await page.locator('#cel-grid .cel-cell[data-layer="crimson_liquid"][data-frame="4"]').click();
 await page.locator('#cel-copy').click();
 await page.locator('#cel-grid .cel-cell[data-layer="inner_bubbles"][data-frame="3"]').click();
 await page.locator('#cel-paste').click();
 data=await exported(page);
 assert.deepEqual(data.layers.find(l=>l.id==='inner_bubbles').frames[3],data.layers.find(l=>l.id==='crimson_liquid').frames[4],'Cel paste must use native rows');
 await page.locator('#cel-move-right').click();
 data=await exported(page);
 assert.deepEqual(data.layers.find(l=>l.id==='inner_bubbles').frames[4],data.layers.find(l=>l.id==='crimson_liquid').frames[4],'whole-frame move keeps layers together');
 await page.locator('#diagnose-animation').click();
 assert.match(await page.locator('#diagnosis-output').innerText(),/平均变化/);
 await page.locator('#play-mode').selectOption('pingpong');
 await page.locator('#tool-fill').click();
 assert.equal(await page.locator('#tool-fill').getAttribute('aria-pressed'),'true');
 await page.setViewportSize({width:390,height:844});
 await page.locator('#cel-grid .cel-cell').first().waitFor();
 assert.equal(uncaught.length,0,'browser JS exceptions: '+uncaught.join('\n'));
 console.log('PixelWeave v0.8 Chromium smoke: PASS (Cel, brush, undo, redo, persist, copy, move, diagnostics, responsive)');
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
