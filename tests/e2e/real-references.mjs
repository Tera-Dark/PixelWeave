import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../../references/curation.json',import.meta.url),'utf8')).items;
const base='http://127.0.0.1:4173';
const server=spawn(process.execPath,['dev-server.mjs'],{cwd:process.cwd(),env:{...process.env,PIXELWEAVE_MODEL:''},stdio:['ignore','pipe','pipe']});
let serverErrors='';server.stderr.on('data',d=>serverErrors+=String(d));
async function ready(){for(let i=0;i<75;i++){try{if((await fetch(base+'/references/')).ok)return;}catch{}await new Promise(r=>setTimeout(r,180));}throw Error(serverErrors);}
let browser;
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1420,height:920}});
 const exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
 await page.goto(base+'/references/',{waitUntil:'domcontentloaded'});
 await page.locator('.atlas-ref').first().waitFor({timeout:20000});
 assert.equal(await page.locator('.atlas-ref').count(),catalog.length);
 for(const item of catalog){
  await page.locator('.atlas-ref[data-id="'+item.id+'"]').click();
  await page.waitForFunction(title=>document.getElementById('study-title').textContent===title,item.title,{timeout:14000});
  await page.waitForFunction(()=>{
   const el=document.getElementById('remote-info');
   return el.textContent.includes('已加载作者')||el.textContent.includes('原作者 CC0 动画帧已加载');
  },{timeout:20000});
  assert.equal(await page.locator('#timeline').getAttribute('max'),String(item.frames-1),'real frame count '+item.id);
  const first=await page.locator('#ref-canvas').evaluate(el=>Array.from(el.getContext('2d',{willReadFrequently:true}).getImageData(0,0,el.width,el.height).data));
  await page.locator('#next').click();
  const second=await page.locator('#ref-canvas').evaluate(el=>Array.from(el.getContext('2d',{willReadFrequently:true}).getImageData(0,0,el.width,el.height).data));
  let different=0;for(let i=0;i<first.length;i+=4)if(first[i]!==second[i]||first[i+1]!==second[i+1]||first[i+2]!==second[i+2]||first[i+3]!==second[i+3])different++;
  assert.ok(different>=4,item.id+' first two real frames must visibly differ; got '+different);
  await page.locator('#difference').check();
  assert.equal(await page.locator('#difference').isChecked(),true,'author PNG must support real pixel difference analysis '+item.id);
  assert.ok(!await page.locator('#difference').isDisabled(),'author PNG must be same-origin accessible '+item.id);
  await page.locator('#difference').uncheck();
  const thumbs=await page.locator('#contact button').count();
  assert.ok(thumbs>=Math.min(item.frames,3),'real keyframe strip should exist for '+item.id);
  console.log('AUTHORED FRAME VERIFIED '+item.id+' '+item.author+' '+item.frames+' frames '+different+' pixel changes');
 }
 assert.deepEqual(exceptions,[],'JS failures: '+exceptions.join('; '));
 console.log('PixelWeave artist-reference E2E: PASS '+catalog.length+' original human-authored playable animations');
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
