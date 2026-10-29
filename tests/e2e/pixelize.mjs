import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const origin='http://127.0.0.1:4181';
const server=spawn(process.execPath,['dev-server.mjs'],{cwd:process.cwd(),env:{...process.env,PIXELWEAVE_MODEL:'',PIXELWEAVE_PORT:'4181'},stdio:['ignore','pipe','pipe']});
let stderr='';server.stderr.on('data',x=>stderr+=String(x));
let browser;
async function ready(){
 for(let i=0;i<75;i++){try{if((await fetch(origin+'/pixelize/')).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}
 throw Error('Pixelizer server did not start: '+stderr);
}
try{
 await ready();
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1200,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/pixelize/',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('.pw-main-nav [aria-current="page"]').count(),1);
 assert.equal(await page.locator('.pw-main-nav [aria-current="page"]').getAttribute('data-pw-nav'),'pixelize');
 const bytes=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=96;c.height=64;const ctx=c.getContext('2d');
  ctx.fillStyle='#ca5f42';ctx.fillRect(0,0,48,64);
  ctx.fillStyle='#1d537e';ctx.fillRect(48,0,48,64);
  const b=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
  return [...new Uint8Array(await b.arrayBuffer())];
 });
 await page.locator('#px-file').setInputFiles({name:'pixelizer-test.png',mimeType:'image/png',buffer:Buffer.from(bytes)});
 await page.waitForFunction(()=>document.querySelector('#px-result').width===96);
 await page.locator('#px-grid-settings summary').click();await page.locator('#px-color-settings summary').click();
 await page.locator('#px-edge-number').fill('32');await page.locator('#px-edge-number').dispatchEvent('change');
 await page.waitForFunction(()=>document.querySelector('#px-result').width===32);
 const nativeDims=await page.locator('#px-result').evaluate(c=>[c.width,c.height]);
 assert.deepEqual(nativeDims,[32,21]);
 for(const factor of [3,7,11]){
  await page.locator('#px-scale').fill(String(factor));
  const pending=page.waitForEvent('download');
  await page.locator('#px-download-scaled').click();
  const dl=await pending,buffer=await readFile(await dl.path());
  assert.equal(buffer.subarray(1,4).toString(),'PNG');
  assert.equal(buffer.readUInt32BE(16),nativeDims[0]*factor,'correct PNG width at '+factor+'x');
  assert.equal(buffer.readUInt32BE(20),nativeDims[1]*factor,'correct PNG height at '+factor+'x');
  const proof=await page.locator('#px-result').evaluate((canvas,n)=>{
   const c=document.createElement('canvas');c.width=canvas.width*n;c.height=canvas.height*n;
   const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(canvas,0,0,c.width,c.height);
   const p=ctx.getImageData(0,0,c.width,c.height).data,w=c.width;
   for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const corner=((y*n)*w+x*n)*4;
    for(let yy=0;yy<n;yy++)for(let xx=0;xx<n;xx++){
     const at=((y*n+yy)*w+x*n+xx)*4;
     for(let channel=0;channel<4;channel++)if(p[at+channel]!==p[corner+channel])return false;
    }
   }
   return true;
  },factor);
  assert.equal(proof,true,'every source pixel becomes an exact NxN rectangle at '+factor+'x');
 }
 // More than 128x is valid when the native grid is small enough to export safely.
 await page.locator('#px-edge-number').fill('8');await page.locator('#px-edge-number').dispatchEvent('change');
 await page.waitForFunction(()=>document.querySelector('#px-result').width===8);
 await page.locator('#px-scale').fill('129');
 assert.equal(await page.locator('#px-download-scaled').isEnabled(),true);
 const largePending=page.waitForEvent('download');
 await page.locator('#px-download-scaled').click();
 const largeFile=await largePending,largePng=await readFile(await largeFile.path());
 assert.equal(largePng.readUInt32BE(16),8*129);
 assert.equal(largePng.readUInt32BE(20),5*129);
 await page.locator('#px-scale').fill('100000');
 assert.equal(await page.locator('#px-download-scaled').isDisabled(),true);
 await page.locator('#px-scale').fill('4');
 await page.locator('#px-edge-number').fill('32');await page.locator('#px-edge-number').dispatchEvent('change');
 await page.waitForFunction(()=>document.querySelector('#px-result').width===32);
 await page.locator('#px-colors-number').fill('16');await page.locator('#px-colors-number').dispatchEvent('change');
 await page.waitForFunction(()=>document.querySelector('#px-stat-colors').textContent.includes('PALETTE'));
 await page.locator('#px-send-studio').click();
 await page.waitForURL('**/workspace/#editor',{timeout:20000});
 await page.waitForFunction(()=>document.querySelector('#aw-canvas')?.width===32,{timeout:20000});
 assert.deepEqual(await page.locator('#aw-canvas').evaluate(c=>[c.width,c.height]),[32,21]);
 assert.deepEqual(errors,[],'no browser exceptions: '+errors.join('; '));
 console.log('PixelWeave pixelization Chromium E2E: PASS (image import, 3x/7x/11x export, pixel blocks, Studio handoff)');
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
