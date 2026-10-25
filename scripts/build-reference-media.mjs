/**
 * Build-time acquisition of original artist-authored CC0 frame files.
 * Never image-generate, trace, resize, or transcode the artist's pixels.
 * Fail closed: a missing / HTML / invalid original blocks the deploy.
 *
 * Usage: node scripts/build-reference-media.mjs
 * Inputs: references/curation.json (sourceFile/sourceImages).
 * Output: references/media/*.png (for local E2E and the published site).
 */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),index=JSON.parse(await readFile(resolve(root,'references/curation.json'),'utf8'));
const media=resolve(root,'references/media');
await mkdir(media,{recursive:true});
if(!Array.isArray(index.items)||!index.items.length)throw Error('No reviewed reference animations');
let bytes=0;
const downloads=[];
for(const a of index.items){
 if(a.mode!=='sheet'&&a.mode!=='frames')throw Error(a.id+': no link-only placeholders permitted');
 if(a.license!=='CC0'||!a.url?.startsWith('https://opengameart.org/content/'))throw Error(a.id+': unverified artist/license');
 const urls=a.sourceImages||[a.sourceFile],dest=a.images||[a.sheet];
 if(!urls.every(x=>typeof x==='string')||urls.length!==dest.length)throw Error(a.id+': missing real frame source');
 if(a.mode==='sheet'&&(!Number.isInteger(a.cols)||!Number.isInteger(a.rows)||a.cols*a.rows<2))throw Error(a.id+': invalid frame layout');
 for(let i=0;i<urls.length;i++){
  const u=urls[i],target=dest[i];
  if(!u.startsWith('https://opengameart.org/sites/default/files/')||!target.startsWith('./media/')||!/^\.\/media\/[a-z0-9-]+\.png$/.test(target))throw Error(a.id+': unauthorized source path');
  downloads.push({id:a.id,url:u,path:resolve(root,'references/',target),target,cols:a.cols,rows:a.rows});
 }
}
const seen=new Set();for(const d of downloads){if(seen.has(d.target))throw Error('Duplicate media target '+d.target);seen.add(d.target);}
async function downloadOne(d){
 let error;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(d.url,{
    headers:{'User-Agent':'Mozilla/5.0 (compatible; PixelWeave-Credit-First-Reference-Builder/1.0)','Accept':'image/png,image/*;q=0.9'},
    signal:AbortSignal.timeout(17000)
   });
   if(!response.ok)throw Error('HTTP '+response.status);
   const raw=Buffer.from(await response.arrayBuffer());
   if(raw.length<70||raw.length>1024*1024)throw Error('unexpected image bytes: '+raw.length);
   if(raw.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('not original PNG (possibly an HTML error page)');
   const width=raw.readUInt32BE(16),height=raw.readUInt32BE(20);
   if(width<8||height<8||width>8192||height>8192)throw Error('unsafe image dimensions '+width+'x'+height);
   if(d.cols&&((width%d.cols)||(height%d.rows)))throw Error('spritesheet grid is not divisible: '+width+'x'+height+' / '+d.cols+'x'+d.rows);
   await mkdir(dirname(d.path),{recursive:true});await writeFile(d.path,raw);bytes+=raw.length;
   console.log('CC0 VERIFIED '+d.id+' / '+d.target+' '+width+'x'+height+' '+raw.length+' B sha256:'+createHash('sha256').update(raw).digest('hex').slice(0,16));
   return;
  }catch(e){error=e;if(attempt<2)await new Promise(r=>setTimeout(r,600*(attempt+1)));}
 }
 throw Error(d.id+': cannot fetch original artwork from '+d.url+' — '+error.message);
}
for(const d of downloads)await downloadOne(d);
if(bytes>1000*1024)throw Error('Reference art exceeded total 1 MB budget');
console.log('CC0 artist frames validated: '+index.items.length+' animations, '+downloads.length+' source PNGs, '+bytes+' bytes. No placeholder entries.');
