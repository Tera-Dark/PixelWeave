import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4191';
const server=spawn(process.execPath,['dev-server.mjs'],{cwd:process.cwd(),env:{...process.env,PIXELWEAVE_MODEL:'',PIXELWEAVE_PORT:'4191'},stdio:['ignore','pipe','pipe']});
let errorText='';server.stderr.on('data',d=>errorText+=String(d));
async function ready(){for(let i=0;i<75;i++){try{if((await fetch(origin+'/index.html')).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error(errorText);}
let browser;
try{
 await ready();
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1380,height:870},reducedMotion:'reduce'});
 const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
 let modelRequests=0;page.on('request',r=>{if(r.url().includes('/api/status'))modelRequests++;});
 await page.addInitScript(()=>{
  window.__pixelPaints={hero:0,studio:0};
  const original=CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect=function(...args){
   if(this.canvas?.id==='hero-canvas')window.__pixelPaints.hero++;
   if(this.canvas?.id==='studio-canvas')window.__pixelPaints.studio++;
   return original.apply(this,args);
  };
 });
 await page.goto(origin+'/index.html#gallery',{waitUntil:'domcontentloaded'});
 await page.locator('#gallery-grid .work-card').first().waitFor({timeout:20000});
 assert.equal(await page.locator('#cel-grid .cel-cell').count(),0,'gallery must not initialize 132 offscreen Cel controls');
 assert.equal(modelRequests,0,'landing page must not probe optional local model proxy');
 await page.locator('.pw-nav-link[data-pw-nav="studio"]').click();
 await page.locator('#cel-grid .cel-cell').first().waitFor({timeout:20000});
 assert.equal(await page.locator('#cel-grid .cel-cell').count(),132,'Studio initializes exactly once on first entry');
 const afterStudio=await page.evaluate(()=>({...window.__pixelPaints}));
 await page.waitForTimeout(380);
 const idleStudio=await page.evaluate(()=>({...window.__pixelPaints}));
 assert.equal(idleStudio.hero,afterStudio.hero,'hidden gallery hero must not repaint while Studio animates');
 assert.ok(idleStudio.studio>afterStudio.studio,'visible animated editor continues to work');
 assert.equal(modelRequests,0,'visiting Studio alone must not request optional LLM API');
 await page.locator('.pw-nav-link[data-pw-nav="gallery"]').click();
 const afterGallery=await page.evaluate(()=>({...window.__pixelPaints}));
 await page.waitForTimeout(380);
 const idleGallery=await page.evaluate(()=>({...window.__pixelPaints}));
 assert.equal(idleGallery.studio,afterGallery.studio,'hidden Studio must not repaint while Gallery animates');
 // Main gallery art remains animated whenever it enters the viewport.
 await page.locator('#hero-canvas').scrollIntoViewIfNeeded();
 await page.waitForTimeout(380);
 const visibleGallery=await page.evaluate(()=>({...window.__pixelPaints}));
 assert.ok(visibleGallery.hero>afterGallery.hero,'gallery hero still animates onscreen');
 await page.locator('.pw-nav-link[data-pw-nav="studio"]').click();
 assert.equal(await page.locator('#cel-grid .cel-cell').count(),132,'re-entering Studio must reuse existing timeline');
 await page.locator('#studio-composer-drawer summary').click();
 await page.waitForTimeout(200);
 assert.equal(modelRequests,1,'opening the LLM assistant requests local proxy status only on demand');
 await page.goto(origin+'/references/',{waitUntil:'domcontentloaded'});
 await page.locator('#ref-list .atlas-ref').first().waitFor({timeout:20000});
 const refCatalog=await page.evaluate(async()=>await(await fetch('./curation.json')).json());
 assert.equal(await page.locator('#ref-list .atlas-ref').count(),refCatalog.items.length,'reference catalog shows all verified playable assets');
 assert.deepEqual(jsErrors,[],'runtime JS errors: '+jsErrors.join('; '));
 console.log('PixelWeave Chromium performance regression: PASS (lazy Studio, inactive surfaces, visibility rendering, deferred API, Atlas)');
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
