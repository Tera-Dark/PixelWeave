/** Deterministic animation playback and explainable pixel-frame diagnostics. */
export function stepPlayback(frame,count,dir=1,mode='loop'){
 if(!Number.isInteger(count)||count<1)throw Error('无效帧数');
 if(mode==='reverse')return {frame:(frame-1+count)%count,direction:-1};
 if(mode==='pingpong'){
  if(count===1)return {frame:0,direction:1};
  let d=dir>=0?1:-1,at=frame+d;
  if(at>=count){d=-1;at=count-2;}else if(at<0){d=1;at=1;}
  return {frame:at,direction:d};
 }
 return {frame:(frame+1)%count,direction:1};
}
function composite(d,f){
 const pixels=Array(d.width*d.height).fill('.');
 for(const l of d.layers){
  if(l.visible===false||l.opacity===0)continue;
  const rows=l.frames[f];
  for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){
   const px=x+l.x,py=y+l.y,s=rows[y][x];
   if(d.palette[s]!=='transparent'&&px>=0&&py>=0&&px<d.width&&py<d.height)pixels[py*d.width+px]=s;
  }
 }return pixels;
}
export function inspectAnimation(d,{stableLayers=[]}={}){
 const count=d.layers[0].frames.length,total=d.width*d.height;
 const frames=Array.from({length:count},(_,f)=>composite(d,f));
 const delta=(a,b)=>a.reduce((n,p,i)=>n+(p!==b[i]?1:0),0);
 const between=frames.slice(1).map((x,i)=>({from:i,to:i+1,pixels:delta(frames[i],x)}));
 const seam=delta(frames.at(-1),frames[0]);
 const warnings=[];
 for(const id of stableLayers){
  const l=d.layers.find(x=>x.id===id);if(!l)continue;
  const first=l.frames[0].join('\n');
  for(let f=1;f<count;f++)if(l.frames[f].join('\n')!==first){warnings.push({type:'STATIC_CHANGED',layer:id,frame:f});}
 }
 return {frames:count,dimensions:[d.width,d.height],transitions:between,meanDelta:Math.round(between.reduce((s,t)=>s+t.pixels,0)/Math.max(1,between.length)),seamPixels:seam,seamRatio:Math.round(seam/total*1000)/10,warnings,artScore:null};
}
