import {validateLayered,paintLayerPixel} from './layered.js';
export const PATCH_FORMAT='pixelweave/layer-patch-v1';
const boxValid=(v,max)=>Number.isInteger(v)&&v>=0&&v<max;
const independent = d=>JSON.parse(JSON.stringify(d));
const fingerprint = layer=>JSON.stringify({id:layer.id,frames:layer.frames,x:layer.x,y:layer.y,visible:layer.visible,opacity:layer.opacity});
/**
 * Apply a restricted text-LLM pixel patch to exactly one layer. All other
 * layers must preserve byte-for-byte JSON visual structure. Never evaluates JS.
 */
export function applyScopedPatch(document,patch,scope){
 const source=validateLayered(document);
 if(!patch||typeof patch!=='object'||patch.format!==PATCH_FORMAT)throw Error('补丁格式不正确');
 if(!scope||typeof scope!=='object'||!scope.layerId)throw Error('必须提供明确的目标图层');
 if(patch.layerId!==scope.layerId)throw Error('补丁试图修改未授权图层');
 const idx=source.layers.findIndex(l=>l.id===scope.layerId);
 if(idx<0)throw Error('指定的目标图层不存在');
 if((scope.frozenLayers||[]).includes(scope.layerId))throw Error('目标图层已冻结');
 const nframes=source.layers[0].frames.length;
 const allowed=new Set(scope.allowedFrames||Array.from({length:nframes},(_,i)=>i));
 if(!allowed.size||[...allowed].some(n=>!boxValid(n,nframes)))throw Error('允许修改的帧编号非法');
 const b=scope.bbox||{x:0,y:0,width:source.width,height:source.height};
 for(const key of ['x','y','width','height'])if(!Number.isInteger(b[key]))throw Error('bbox 必须为整数');
 if(b.width<1||b.height<1||b.x<0||b.y<0||b.x+b.width>source.width||b.y+b.height>source.height)throw Error('bbox 超出画布');
 if(!Array.isArray(patch.edits)||patch.edits.length<1||patch.edits.length>512)throw Error('补丁必须包含 1–512 个像素变更');
 const out=independent(source),before=source.layers.map(fingerprint);
 const seen=new Set();let changed=0;
 for(const op of patch.edits){
  if(!op||typeof op!=='object'||!Number.isInteger(op.x)||!Number.isInteger(op.y)||!Number.isInteger(op.frame)||typeof op.symbol!=='string')throw Error('编辑项格式错误');
  if(!allowed.has(op.frame))throw Error('试图修改未授权帧 '+op.frame);
  if(op.x<b.x||op.y<b.y||op.x>=b.x+b.width||op.y>=b.y+b.height)throw Error('编辑坐标越出授权区域');
  if(!Object.hasOwn(out.palette,op.symbol))throw Error('未定义色板符号 '+op.symbol);
  const id=op.frame+':'+op.x+':'+op.y;
  if(seen.has(id))throw Error('同一帧同一坐标不能多次覆盖');
  seen.add(id);
  const layer=out.layers[idx],row=op.y-layer.y,col=op.x-layer.x;
  if(!boxValid(row,out.height)||!boxValid(col,out.width))throw Error('编辑位置无法映射到目标图层');
  if(layer.frames[op.frame][row][col]!==op.symbol){
   paintLayerPixel(out,scope.layerId,op.frame,op.x,op.y,op.symbol);changed++;
  }
 }
 if(!changed)throw Error('补丁没有产生任何实际像素变化');
 const clean=validateLayered(out);
 for(let i=0;i<clean.layers.length;i++){
  if(i!==idx&&fingerprint(clean.layers[i])!==before[i])throw Error('其他图层意外发生变化');
 }
 // Target layer may change ONLY in the allowed frames.
 for(let i=0;i<nframes;i++)if(!allowed.has(i)&&JSON.stringify(clean.layers[idx].frames[i])!==JSON.stringify(source.layers[idx].frames[i]))throw Error('未授权帧发生变化');
 return {asset:clean,changed,scope:{layerId:scope.layerId,allowedFrames:[...allowed],bbox:{...b}},audit:{frozenLayersUnchanged:true,unauthorizedFramesUnchanged:true}};
}
/** Structural diagnostics, not subjective artistic quality. */
export function diagnoseLayered(input,{staticLayerIds=[],liquidLayerId='liquid',bubbleLayerId='bubbles'}={}){
 const d=validateLayered(input),issues=[];
 for(const id of staticLayerIds){
  const layer=d.layers.find(l=>l.id===id);if(!layer)continue;
  const baseline=JSON.stringify(layer.frames[0]);
  layer.frames.forEach((frame,i)=>{if(JSON.stringify(frame)!==baseline)issues.push({id:'STATIC_LAYER_CHANGED',layerId:id,frame:i,severity:'warning',message:'本应静止的图层逐帧改变'});});
 }
 const bubbles=d.layers.find(l=>l.id===bubbleLayerId);
 const liquid=d.layers.find(l=>l.id===liquidLayerId);
 if(bubbles&&liquid){
  for(let f=0;f<bubbles.frames.length;f++)for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){
   const ch=bubbles.frames[f][y][x];if(d.palette[ch]==='transparent')continue;
   const gx=x+bubbles.x,gy=y+bubbles.y,lx=gx-liquid.x,ly=gy-liquid.y;
   if(!boxValid(lx,d.width)||!boxValid(ly,d.height)||d.palette[liquid.frames[f][ly][lx]]==='transparent'){
    issues.push({id:'BUBBLE_OUTSIDE_LIQUID',layerId:bubbleLayerId,frame:f,x:gx,y:gy,severity:'warning',message:'气泡未被当前帧液体像素覆盖'});
   }
  }
 }
 return issues;
}
