/**
 * PixelWeave curated-knowledge loader.
 * Reads ONLY allowlisted files declared inside the repository manifest.
 * No network access, no arbitrary user-supplied paths, no prompt-time JS execution.
 */
import {readFileSync} from 'node:fs';
const base = new URL('../knowledge/pixel-art/',import.meta.url);
const parse = name => JSON.parse(readFileSync(new URL(name,base),'utf8'));
const manifest = parse('manifest.json');
const rulebook = parse('rules.json');
const routes=[
 {id:'potion',tests:[/药水|药瓶|血瓶|魔药|液面|potion|vial|elixir|flask|bottle/i],tags:['potion','glass']},
 {id:'water',tests:[/水|流体|波浪|water|liquid|wave/i],tags:['water']},
 {id:'lantern',tests:[/提灯|油灯|灯笼|lantern|lamp/i],tags:['lantern','metal','fire']},
 {id:'fire',tests:[/火焰|火舌|篝火|fire|flame|ember/i],tags:['fire']},
 {id:'crystal',tests:[/晶体|水晶|宝石|crystal|gem|prism/i],tags:['crystal']},
 {id:'key',tests:[/钥匙|金属|key|metal|brass/i],tags:['key','metal']},
 {id:'cloth',tests:[/布料|旗|衣服|披风|风吹|cloth|fabric|banner|flag|cape/i],tags:['cloth','banner']},
 {id:'character',tests:[/角色|人物|走路|步行|跑步|character|walk|run|idle/i],tags:['character']},
 {id:'wallpaper',tests:[/壁纸|桌面|wallpaper/i],tags:['wallpaper','scene']},
 {id:'scene',tests:[/场景|车站|建筑|雨夜|scene|station|background|parallax/i],tags:['scene']}
];
export function classifyBrief(brief){
 const goal=String(brief||'').slice(0,500),tags=new Set(['all']);
 for(const route of routes)if(route.tests.some(regex=>regex.test(goal)))for(const tag of route.tags)tags.add(tag);
 return [...tags];
}
export function pickKnowledge(brief,stage='director',{enabled=true,limit=9}={}){
 if(!enabled)return {enabled:false,tags:[],ruleIds:[],rules:[],chapters:[],context:''};
 const tags=classifyBrief(brief),stageName=stage==='motion'?'effects':stage;
 const selected=rulebook.rules.filter(rule=>{
  const matchStage=rule.stages.includes('all')||rule.stages.includes(stageName);
  const matchTag=rule.tags.some(tag=>tags.includes(tag));
  return matchStage&&matchTag;
 });
 const rank=(r)=>r.level==='hard'?0:r.level==='diagnostic'?1:2;
 selected.sort((a,b)=>rank(a)-rank(b)||Number(!a.tags.includes('all'))-Number(!b.tags.includes('all'))||a.id.localeCompare(b.id));
 const rules=selected.slice(0,Math.min(16,Math.max(1,limit)));
 const techniqueTags=tags.filter(t=>t!=='all');
 const profile=(manifest.routeProfiles||[]).find(p=> {
  const map={'animated-potion':['potion'],'static-potion':['glass'],
    'character-idle':['character'],'rainy-station':['scene'],
    'wallpaper':['wallpaper'],'silhouette-icon':['key']};
  return (map[p.id]||[]).some(t=>techniqueTags.includes(t));
 });
 const chapters=(profile?.techniques||['01-FOUNDATIONS.md']).slice(0,2).filter(p=>manifest.chapters.some(c=>c.file===p));
 // Read a bounded excerpt of the authoritative chapters. They are also loaded
 // into context for semantic background, while precise instructions come from rule IDs.
 const excerpts=chapters.map(name=>{
  const file=readFileSync(new URL(name,base),'utf8');
  return {name,excerpt:file.slice(0,850)};
 });
 const texts=rules.map(r=>'['+r.id+'] ('+r.level+') '+r.text);
 const context=[
  'PIXELWEAVE CURATED KNOWLEDGE / '+stageName.toUpperCase(),
  'Text-only LLM. Art advice is not a hard software invariant.',
  'Brief tags: '+tags.join(', '),
  ...texts,
  ...excerpts.map(c=>'[Chapter '+c.name+'] '+c.excerpt)
 ].join('\n');
 return {enabled:true,tags,ruleIds:rules.map(r=>r.id),rules,chapters,context:context.slice(0,6500)};
}
export function knowledgeInventory(){
 return {version:rulebook.version,totalRules:rulebook.rules.length,courseFiles:manifest.chapters.map(c=>c.file)};
}
