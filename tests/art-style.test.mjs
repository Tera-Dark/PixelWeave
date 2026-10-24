import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {artDirection,ART_STYLES,getArtStyleConfig} from '../src/art-style.mjs';
import {generateProgressive} from '../src/progressive.mjs';
const style=JSON.parse(readFileSync(new URL('../knowledge/pixel-art/styles/ashen-reliquary.json',import.meta.url),'utf8'));
test('style research source and artistic evidence are documented separately',()=>{
 for(const path of [
  '../knowledge/pixel-art/studies/BLASPHEMOUS-CASE-STUDY.md',
  '../knowledge/pixel-art/studies/V2-ASSET-CRITIQUE.md',
  '../knowledge/pixel-art/styles/ASHEN-RELIQUARY.md'
 ])assert.ok(existsSync(new URL(path,import.meta.url)),path);
 assert.equal(style.version,'pixelweave/art-style-v0.1');
 assert.equal(style.gates.length,8);
 assert.equal(style.pillars.length,4);
 assert.equal(style.status.expertReviewed,false);
 assert.equal(style.originality.copiesThirdPartySprite,false);
});
test('art style is opt-in; invalid values fail closed',()=>{
 assert.equal(artDirection('none','director').context,'');
 assert.equal(artDirection('ashen-reliquary','director').enabled,true);
 assert.ok(artDirection('ashen-reliquary','silhouette').context.includes('three'));
 assert.ok(artDirection('ashen-reliquary','effects').context.includes('stable'));
 assert.throws(()=>artDirection('Blasphemous','director'),/未知的美术风格/);
 assert.throws(()=>artDirection('ashen-reliquary','unknown'),/未知的绘制阶段/);
 assert.equal(ART_STYLES.length,2);
 assert.equal(getArtStyleConfig().gates.length,8);
});
test('palette roles and source licensing boundaries are explicit',()=>{
 assert.deepEqual(Object.keys(style.moods).sort(),['cinder','moonwater','moss']);
 assert.ok(style.sources.length>=3);
 assert.ok(style.originality.forbidden.some(x=>x.includes('Blasphemous')));
});
test('progressive LLM generation uses optional style only when selected',async()=>{
 const empty='.'.repeat(16),rows=Array.from({length:16},(_,y)=>y===8?'....KKKKKKKK....':empty);
 const director=JSON.stringify({name:'Measured Item',palette:{K:'#242131',M:'#bf5160',W:'#ffddab'}});
 const frame=JSON.stringify({frames:[rows,rows,rows,rows]});
 const mock=async styleName=>{
  const prompts=[];let index=0;
  const transport=async(_url,opts)=>{
   const input=JSON.parse(opts.body);prompts.push(input.messages[1].content);
   return {ok:true,json:async()=>({choices:[{message:{content:index++===0?director:frame}}]})};
  };
  const result=await generateProgressive('An ancient pixel art lantern',{PIXELWEAVE_MODEL:'fake',PIXELWEAVE_ART_STYLE:styleName},transport);
  return {result,prompts};
 };
 const off=await mock('none'),on=await mock('ashen-reliquary');
 assert.equal(off.result.artStyle.enabled,false);
 assert.equal(on.result.artStyle.enabled,true);
 assert.ok(!off.prompts.join(' ').includes('ORIGINAL PIXELWEAVE ART DIRECTION'));
 assert.ok(on.prompts.join(' ').includes('ORIGINAL PIXELWEAVE ART DIRECTION'));
 assert.equal(off.result.asset.width,on.result.asset.width);
});
