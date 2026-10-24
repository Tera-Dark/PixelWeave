/**
 * Optional, original PixelWeave art-direction system.
 * Loaded from repository-owned JSON; never copies licensed sprites.
 */
import {readFileSync} from 'node:fs';
const guide=JSON.parse(readFileSync(new URL('../knowledge/pixel-art/styles/ashen-reliquary.json',import.meta.url),'utf8'));
const STAGES=new Set(['director','silhouette','fill','highlights','effects','repair']);
export const DEFAULT_STYLE='none';
export const ART_STYLES=Object.freeze([{id:'none',name:'不指定风格（遵从主题）'},{id:guide.id,name:guide.displayName}]);
export function artDirection(styleId='none',stage='director',mood='cinder'){
 if(styleId===null||styleId===undefined||styleId===''||styleId==='none')return {enabled:false,id:'none',mood:null,context:''};
 if(styleId!==guide.id)throw Error('未知的美术风格：'+String(styleId).slice(0,100));
 if(!STAGES.has(stage))throw Error('未知的绘制阶段');
 if(!Object.hasOwn(guide.moods,mood))throw Error('未知的情绪分支');
 const variant=guide.moods[mood];
 const stagePrompt=guide.stageGuidance[stage];
 const pillars=guide.pillars.map(x=>x.en+': '+x.description);
 const context=[
 'ORIGINAL PIXELWEAVE ART DIRECTION / '+guide.displayName,
 'This is a coherent craft methodology, NOT a request to imitate or trace recognizable third-party artworks.',
 'ARTISTIC PRIORITIES: '+pillars.join(' | '),
 'MOOD: '+mood+' / '+variant.meaning,
 'SUGGESTED palette roles (modify for subject): '+JSON.stringify(variant.swatches),
 'STAGE TASK: '+stagePrompt,
 'Avoid generic symmetric RPG icons, thick uniform black outlines, pillow shading, random highlights and always-on sparkles.',
 'Preserve the user brief, all explicit constraints, and PixelWeave layered-v1 data shape. Do NOT reproduce copyrighted Blasphemous character art, sprites, architecture or iconography.',
 'If a design choice conflicts with user requirements or readable silhouette, prioritize the brief and readability. Art advice does not override hard data validation.'
 ].join('\n');
 return {enabled:true,id:guide.id,mood,version:guide.version,context:context.slice(0,3000)};
}
export function getArtStyleConfig(){return {id:guide.id,version:guide.version,gates:guide.gates.map(g=>g.id),pillars:guide.pillars.map(p=>p.id)};}
