import {LAYERED_FORMAT,validateLayered,metrics} from './layered.js';

const instructions = [
'Act as a careful professional pixel artist. You have NO image generation models or tools.',
'Output EXACTLY ONE JSON object, without markdown, explanation, or source code.',
'Use format: "pixelweave/layered-v1", width:16, height:16, fps:8, and EXACTLY 4 animation frames per layer.',
'Create exactly 4 independent layers named silhouette, fill, highlights, effects, ordered from back to front.',
'Each layer has id,name,visible:true,opacity:1,x:0,y:0,frames.',
'Every layer.frames has four elements; each frame has exactly 16 ASCII strings of length EXACTLY 16.',
'Palette includes ".":"transparent" and no more than 12 additional single-ASCII-character keys with #RRGGBB colors.',
'Every pixel character must belong to the palette. Duplicate static frames exactly rather than inventing jitter.',
'Emphasize a recognizable silhouette, pixel clusters, limited palette, controlled highlights, logical animated parts.',
'Keep the sprite centered. Preserve overall volume, shading, and frame continuity.',
'All frames must loop. Include no URLs, files, HTML, arbitrary JS, SVG, diffusion or external imagery.'
];
export function makeLayeredPrompt(idea,plan=null){
 const goal=String(idea||'Animated pixel art health potion').slice(0,500);
 return ['ART BRIEF: '+goal,plan?'ART DIRECTION: '+JSON.stringify(plan).slice(0,4000):'Style: polished dark-fantasy pixel-art game item.',...instructions].join('\n\n');
}
export function directorPrompt(idea){
 return [
 'You are the art director for handcrafted 16-bit fantasy pixel sprites.',
 'Plan this artwork: '+String(idea).slice(0,500),
 'Return JSON ONLY with fields: name, subject, silhouette, palette, layers, motion, lighting, paletteRoles.',
 'Plan exactly four layers: silhouette, fill, highlights, effects. Limit the palette to twelve colors.',
 'Focus on art direction, readable forms, asymmetry, sophisticated materials and animation coherence.'
 ].join('\n\n');
}
export function repairPrompt(idea,previous,error){
 return makeLayeredPrompt(idea)+'\n\nFAILED VALIDATION: '+String(error).slice(0,1600)+'\n\nFAILED PREVIOUS OUTPUT:\n'+String(previous).slice(0,45000)+'\n\nRegenerate ENTIRE JSON, count every row. No markdown.';
}
export function parseModelJSON(output){
 if(typeof output!=='string'||output.length>1000000)throw Error('模型回复无效或超过 1MB');
 let s=output.trim();
 if(s.startsWith('```'))s=s.replace(/^`{3}[a-z]*\s*/i,'').replace(/\s*`{3}$/,'');
 try{return JSON.parse(s);}catch{}
 const l=s.indexOf('{'),r=s.lastIndexOf('}');
 if(l<0||r<l)throw Error('模型没有返回 JSON');
 return JSON.parse(s.slice(l,r+1));
}
export function inspectAsset(input){
 const data=validateLayered(input),stats=metrics(data),warnings=[];
 if(stats.coverage<8)warnings.push('主体覆盖面积太小');
 if(stats.coverage>88)warnings.push('画布过满，缺少留白');
 if(stats.meanMotion===0)warnings.push('动画帧完全相同');
 if(stats.meanMotion>30)warnings.push('帧间变化过大，可能发生闪烁');
 if(stats.seam>15)warnings.push('循环首尾差异过大');
 return {data,stats,warnings};
}
