import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4185';
const server=spawn(process.execPath,['dev-server.mjs'],{cwd:process.cwd(),env:{...process.env,PIXELWEAVE_PORT:'4185'},stdio:['ignore','pipe','pipe']});
let browser,stderr='';server.stderr.on('data',c=>stderr+=String(c));
try{
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/api/pixel-fixer/status')).ok)break;}catch{}if(i===99)throw Error('server failed: '+stderr);await new Promise(r=>setTimeout(r,100));}
 assert.equal((await fetch(origin+'/tools/pixel-fixer/restore.py')).status,403);
 assert.equal((await fetch(origin+'/api/pixel-fixer/restore',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.com'},body:'{}'})).status,403);
 assert.equal((await fetch(origin+'/api/pixel-fixer/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:'invalid'})})).status,400);
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/pixelize/');
 const bytes=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=128;c.height=192;const ctx=c.getContext('2d');for(let y=0;y<24;y++)for(let x=0;x<16;x++){let v=(x*67+y*97+(x*y*13))%256;ctx.fillStyle=`rgb(${v},${(v*3)%256},${(v*5)%256})`;ctx.fillRect(x*8,y*8,8,8);}return [...new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer())];});
 await page.locator('#px-file').setInputFiles({name:'grid.png',mimeType:'image/png',buffer:Buffer.from(bytes)});
 await page.waitForFunction(()=>!document.querySelector('#px-restore').disabled);
 await page.locator('#px-restore').click();
 await page.waitForFunction(()=>/恢复网格|恢复失败/.test(document.querySelector('#px-restore-info').textContent),null,{timeout:120000});
 assert.match(await page.locator('#px-restore-info').innerText(),/恢复网格/);
 const dimensions=await page.locator('#px-result').evaluate(c=>[c.width,c.height]);assert.ok(dimensions[0]>1&&dimensions[0]<=128&&dimensions[1]>1&&dimensions[1]<=192);
 await page.locator('#px-compare-range').fill('25');
 assert.match(await page.locator('#px-compare-clip').getAttribute('style'),/25%/);
 const box=await page.locator('#px-compare-frame').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.5);await page.mouse.up();
 assert.ok(Number(await page.locator('#px-compare-range').inputValue())>=68,'dragging image updates comparison slider');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  const cmp=await page.locator('#px-compare-frame').evaluate(e=>{const r=e.getBoundingClientRect(),parent=e.parentElement.getBoundingClientRect();return {ratio:r.width/r.height,inside:r.left>=parent.left-1&&r.right<=parent.right+1&&r.top>=parent.top-1&&r.bottom<=parent.bottom+1};});
  assert.ok(cmp.inside,'comparison is not cropped');assert.ok(Math.abs(cmp.ratio-2/3)<0.01,'comparison keeps original aspect ratio');
  const ratio=await page.locator('#px-compare-result').evaluate(c=>{const r=c.getBoundingClientRect();return [r.width/r.height,c.width/c.height];});assert.ok(Math.abs(ratio[0]-ratio[1])<0.01,'result pixels keep their proportions');
 }
 await page.locator('#px-mode-side').click();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  const preview=await page.locator('#px-result').evaluate(c=>{const box=c.getBoundingClientRect(),frame=c.closest('.px-view').getBoundingClientRect();return {ratio:box.width/box.height,native:c.width/c.height,inside:box.left>=frame.left-1&&box.right<=frame.right+1&&box.top>=frame.top-1&&box.bottom<=frame.bottom+1};});
  assert.ok(preview.inside,'preview remains inside its panel at '+width);assert.ok(Math.abs(preview.ratio-preview.native)<0.01,'preview preserves aspect ratio');
 }
 await page.locator('#px-grid-settings summary').click();
 await page.locator('#px-edge-number').fill('32');await page.locator('#px-edge-number').dispatchEvent('change');await page.waitForFunction(()=>document.querySelector('#px-result').height===32);
 assert.deepEqual(errors,[]);console.log('High quality grid restoration: PASS');
}finally{if(browser)await browser.close();server.kill();}
