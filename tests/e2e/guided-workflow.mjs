import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {startGuidedDraft,actGuidedDraft,inspectGuidedDraft,validateGuidedDraft} from '../../src/guided-workflow.mjs';

const origin='http://127.0.0.1:4173';
const server=spawn(process.execPath,['dev-server.mjs'],{cwd:process.cwd(),env:{...process.env,PIXELWEAVE_MODEL:''},stdio:['ignore','pipe','pipe']});
let serverError='';server.stderr.on('data',d=>serverError+=String(d));
async function ready(){for(let i=0;i<75;i++){try{if((await fetch(origin+'/index.html')).ok)return;}catch{}await new Promise(r=>setTimeout(r,150));}throw Error(serverError);}
const director=JSON.stringify({name:'Night Lantern',concept:'Rusted frame and four-frame ember',palette:{'.':'transparent',K:'#231d31',R:'#c74a5a'},anchors:['immovable rim'],layers:[
 {id:'cage',name:'Rusted cage',kind:'static',purpose:'Keep the silhouette and cage geometry immovable'},
 {id:'flame',name:'Ember',kind:'animated',purpose:'Distinct four-frame, coherent moving red flame'}
]});
const cage=JSON.stringify({base:[{op:'rect',x:5,y:4,w:14,h:15,color:'K',fill:false}]});
const flame=JSON.stringify({base:[{op:'ellipse',x:9,y:10,w:6,h:6,color:'R'}],motion:[
 {dx:0,dy:0,ops:[]},{dx:1,dy:0,ops:[]},{dx:0,dy:-1,ops:[]},{dx:-1,dy:0,ops:[]}
]});
let modelCalls=0;
const rawModel=async()=>({ok:true,json:async()=>({choices:[{message:{content:[director,cage,flame][modelCalls++]}}]})});
const env={PIXELWEAVE_MODEL:'mock-text-model'};
let browser;
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1360,height:940}});
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 await page.route('**/api/status',async route=>route.fulfill({json:{available:true,model:'mock-text-model',pipeline:'semantic-v1'}}));
 await page.route('**/api/workflow',async route=>{
  try{
   const input=route.request().postDataJSON();
   let draft;
   if(input.action==='start')draft=await startGuidedDraft(input.brief,input.styleId,env,rawModel);
   else if(input.action==='inspect')draft=validateGuidedDraft(input.draft);
   else draft=await actGuidedDraft(input.draft,input.action,{feedback:input.feedback||'',env,transport:rawModel});
   await route.fulfill({status:200,json:{draft,view:inspectGuidedDraft(draft)}});
  }catch(e){await route.fulfill({status:422,json:{error:e.message}});}
 });
 await page.goto(origin+'/index.html#studio',{waitUntil:'domcontentloaded'});
 await page.locator('#studio-composer-drawer summary').click();
 await page.locator('#guided-start').waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.querySelector('#guided-start').disabled);
 await page.locator('#guided-start').click();
 await page.waitForFunction(()=>document.querySelector('#guided-phase')?.textContent==='等待导演审阅');
 assert.equal(await page.locator('#guided-preview-wrap').isHidden(),true,'plan must precede painting');
 assert.match(await page.locator('#guided-plan').innerText(),/Rusted cage/);
 await page.locator('#guided-accept').click();
 await page.locator('#guided-next').click();
 await page.waitForFunction(()=>document.querySelector('#guided-phase')?.textContent==='等待图层审阅');
 assert.equal(await page.locator('#guided-preview-wrap').isVisible(),true);
 const alpha=await page.locator('#guided-preview').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).filter((_,i)=>i%4===3&&_!==0).length);
 assert.ok(alpha>0,'candidate image canvas should show real raster pixels');
 assert.equal(await page.locator('#guided-approved').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).some((v,i)=>i%4===3&&v!==0)),false,'approved canvas empty before first acceptance');
 // Refresh during review: candidate must survive without another model call.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#studio-composer-drawer summary').click();
 await page.locator('#guided-resume').click();
 await page.waitForFunction(()=>document.querySelector('#guided-phase')?.textContent==='等待图层审阅');
 assert.equal(modelCalls,2,'refresh/resume must make zero model requests');
 await page.locator('#guided-accept').click();
 await page.locator('#guided-next').click();
 await page.waitForFunction(()=>document.querySelector('#guided-phase')?.textContent==='等待图层审阅');
 const approvedAlpha=await page.locator('#guided-approved').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).some((v,i)=>i%4===3&&v!==0));
 assert.ok(approvedAlpha,'accepted previous layers visible in comparison pane');
 await page.locator('#guided-frame').evaluate(el=>{el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.match(await page.locator('#guided-frame-label').innerText(),/F03/);
 await page.locator('#guided-accept').click();
 await page.waitForFunction(()=>document.querySelector('#guided-phase')?.textContent==='已完成');
 await page.locator('#guided-publish').click();
 await page.waitForFunction(()=>document.querySelector('#asset-name')?.textContent==='Night Lantern');
 assert.equal(await page.locator('#cel-grid .cel-cell').count(),8,'completed 2 x 4 asset becomes editable cels');
 assert.equal(modelCalls,3);
 assert.deepEqual(pageErrors,[],'UI errors: '+pageErrors.join('; '));
 console.log('PixelWeave Guided Workstation Chromium E2E PASS: plan review, real pixel preview, refresh recovery, layer freeze, frame choice, human publish.');
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
