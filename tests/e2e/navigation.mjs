import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {SITE_SECTIONS} from '../../src/site-nav.mjs';

const origin='http://127.0.0.1:4173';
const server=spawn(process.execPath,['dev-server.mjs'],{cwd:process.cwd(),env:{...process.env,PIXELWEAVE_MODEL:''},stdio:['ignore','pipe','pipe']});
let serverErrors='';server.stderr.on('data',x=>serverErrors+=String(x));
async function serve(){
 for(let n=0;n<75;n++){try{if((await fetch(origin+'/index.html')).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}
 throw Error('Dev server did not start: '+serverErrors);
}
let browser;
try{
 await serve();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 const check=async id=>{
  await page.locator('.pw-header[data-pw-mounted="true"] .pw-nav-link').first().waitFor({timeout:20000});
  const links=page.locator('.pw-header .pw-nav-link');
  assert.equal(await links.count(),SITE_SECTIONS.length,'one menu item per canonical section');
  for(let i=0;i<SITE_SECTIONS.length;i++){
   const b=links.nth(i),expected=SITE_SECTIONS[i];
   assert.equal((await b.innerText()).trim().replace(/\s+/g,' ').split(' ')[0],expected.label);
   assert.equal(await b.getAttribute('data-pw-nav'),expected.id);
   assert.equal(await b.getAttribute('aria-current'),expected.id===id?'page':null);
  }
  assert.equal(await page.locator('.pw-header').count(),1,'single shared header');
  assert.equal(await page.locator('.pw-main-nav [aria-current="page"]').count(),1,'exactly one active nav');
  const headerStyle=await page.locator('.pw-header').evaluate(el=>({background:getComputedStyle(el).backgroundColor,height:Math.round(el.getBoundingClientRect().height)}));
  assert.equal(headerStyle.background,'rgb(17, 30, 45)','shared header background');
  return headerStyle;
 };
 await page.goto(origin+'/index.html#gallery',{waitUntil:'domcontentloaded'});
 const gallery=await check('gallery');
 const timeBefore=await page.evaluate(()=>performance.timeOrigin);
 await page.locator('.pw-nav-link[data-pw-nav="studio"]').click();
 await page.waitForFunction(()=>!document.querySelector('#studio-page').hidden);
 await check('studio');
 assert.equal(await page.evaluate(()=>performance.timeOrigin),timeBefore,'SPA navigation must not reload');
 assert.equal(new URL(page.url()).hash,'#studio');
 await page.goBack({waitUntil:'domcontentloaded'});
 await check('gallery');
 await page.goForward({waitUntil:'domcontentloaded'});
 await check('studio');
 await page.locator('.pw-nav-link[data-pw-nav="atlas"]').click();
 await page.waitForURL('**/references/');
 const atlas=await check('atlas');
 assert.equal(atlas.height,gallery.height,'same global desktop header height');
 await page.locator('.pw-nav-link[data-pw-nav="lab"]').click();
 await page.waitForURL('**/knowledge/pixel-art/lab.html');
 const lab=await check('lab');
 assert.equal(lab.height,gallery.height,'Learning Lab must use global header dimensions');
 assert.equal(await page.locator('.lab-resource-links a').count(),2,'lab study links remain in contextual toolbar');
 await page.locator('.pw-nav-link[data-pw-nav="studio"]').click();
 await page.waitForURL('**/index.html#studio');
 await check('studio');
 // Check every standalone document at desktop, tablet and mobile widths.
 const routes=[['/index.html#studio','studio'],['/references/','atlas'],['/knowledge/pixel-art/lab.html','lab']];
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:900});
  for(const [path,id] of routes){
   await page.goto(origin+path,{waitUntil:'domcontentloaded'});
   await check(id);
   const dimensions=await page.evaluate(()=>{
    const h=document.querySelector('.pw-header'),nav=h.querySelector('.pw-main-nav');
    return {pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,headerWidth:Math.ceil(h.getBoundingClientRect().width),navWidth:nav.clientWidth,navScrollWidth:nav.scrollWidth};
   });
   assert.equal(dimensions.headerWidth,width,'header must fit viewport at '+width+' on '+id);
   assert.ok(dimensions.navWidth>0,'navigation remains visible');
   assert.ok(dimensions.pageWidth<=width+2,'unexpected page-level horizontal overflow at '+width+' on '+id+': '+JSON.stringify(dimensions));
   // The final link must remain reachable even when compact mobile width scrolls its nav rail.
   await page.locator('.pw-nav-link[data-pw-nav="lab"]').scrollIntoViewIfNeeded();
   assert.ok(await page.locator('.pw-nav-link[data-pw-nav="lab"]').isVisible());
  }
 }
 assert.deepEqual(errors,[],'No uncaught JS errors across navigation: '+errors.join('; '));
 console.log('PixelWeave site navigation Chromium E2E: PASS (4 shared links, 3 pages, active hash, Back/Forward, desktop/mobile)');
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
