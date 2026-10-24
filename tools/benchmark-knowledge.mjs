/**
 * Text LLM knowledge A/B runner.
 * No network or paid API requests until --run is explicitly supplied.
 * Compares schema/diagnostic outcomes, NOT aesthetic quality.
 */
import {writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {generateProgressive} from '../src/progressive.mjs';
import {diagnoseLayered} from '../src/scoped-patch.mjs';
const cases=[
 {id:'key',brief:'16x16 side-view fantasy key with readable silhouette and limited metallic highlights'},
 {id:'potion',brief:'16x16 crimson glass health potion, liquid gently looping and bubbles rising inside bottle'},
 {id:'fire',brief:'16x16 lantern flame with a stable wick, changing flame tip and a warm bright inner core'},
 {id:'crystal',brief:'16x16 amethyst crystal with coherent flat facets and very limited shimmer'},
 {id:'cloth',brief:'16x16 cloth banner attached to stable pole, loose fabric moves gently with wind'}
];
const run=process.argv.includes('--run'),caseArg=process.argv.find(x=>x.startsWith('--case='));
const work=caseArg?cases.filter(x=>x.id===caseArg.slice(7)):cases.slice(0,2);
if(!work.length)throw Error('未知案例名称');
if(!run){
 console.log('DRY RUN ONLY — no model calls. Cases: '+work.map(x=>x.id).join(', '));
 console.log('Run explicitly: PIXELWEAVE_MODEL=... node tools/benchmark-knowledge.mjs --run --case=potion');
 console.log('Each case uses two conditions × ~5 model requests plus retries. Review provider costs before running.');
 process.exit(0);
}
if(!process.env.PIXELWEAVE_MODEL)throw Error('需要 PIXELWEAVE_MODEL，停止运行');
const rows=[];
for(const c of work){
 const sequence=c.id==='potion'?['off','on']:['on','off'];
 for(const mode of sequence){
  const start=Date.now();
  try{
   const result=await generateProgressive(c.brief,{...process.env,PIXELWEAVE_KNOWLEDGE:mode});
   const problems=diagnoseLayered(result.asset,{staticLayerIds:['silhouette']});
   rows.push({
    caseId:c.id,mode,success:true,attempts:result.attempts,elapsedSeconds:Math.round((Date.now()-start)/1000),
    meanMotion:result.metrics.meanMotion,loopSeam:result.metrics.seam,
    structuralWarnings:result.warnings.length,semanticWarnings:problems.length,
    modelId:process.env.PIXELWEAVE_MODEL,sourceRuleIds:result.knowledge.ruleIds,
    humanSilhouetteScore:null,humanMaterialScore:null,humanAnimationScore:null,
    note:'Aesthetic assessment intentionally missing; manually review PNG/video at 1×.'
   });
  }catch(error){
   rows.push({caseId:c.id,mode,success:false,attempts:null,elapsedSeconds:Math.round((Date.now()-start)/1000),error:String(error.message),modelId:process.env.PIXELWEAVE_MODEL});
  }
  console.log(c.id+' / '+mode+': '+(rows.at(-1).success?'structural pass':'failed'));
 }
}
mkdirSync('benchmark-results',{recursive:true});
const fname='knowledge-comparison-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
writeFileSync(join('benchmark-results',fname),JSON.stringify({method:'uncontrolled small pilot; not causal proof',results:rows},null,2));
console.log('Saved '+join('benchmark-results',fname)+'. Add blinded human ratings before interpreting art quality.');
