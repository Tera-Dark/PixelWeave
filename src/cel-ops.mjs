/**
 * Data-only frame/cel editing for PixelWeave layered-v1.
 * A Cel is the data at one layer ID and one frame index; no new schema or
 * shared references. Every operation remains reversible via JSON snapshots.
 */
const okIndex=(n,count)=>Number.isInteger(n)&&n>=0&&n<count;
function layerAt(d,id){const l=d.layers.find(l=>l.id===id);if(!l)throw Error('图层不存在：'+id);return l;}
function frameCount(d){return d.layers[0].frames.length;}
const rowsCopy=rows=>rows.slice();
const blank=d=>Array.from({length:d.height},()=>'.'.repeat(d.width));
export function getCel(d,id,frame){const l=layerAt(d,id);if(!okIndex(frame,frameCount(d)))throw Error('帧编号越界');return rowsCopy(l.frames[frame]);}
export function celHasPixels(d,id,frame){return getCel(d,id,frame).some(row=>row.includes('.')?/[^\x2e]/.test(row):row.length>0);}
export function copyCel(d,id,frame){return {format:'pixelweave/cel-v1',width:d.width,height:d.height,rows:getCel(d,id,frame)};}
export function pasteCel(d,id,frame,clipboard){
 if(!clipboard||clipboard.format!=='pixelweave/cel-v1'||clipboard.width!==d.width||clipboard.height!==d.height||
 !Array.isArray(clipboard.rows)||clipboard.rows.length!==d.height||clipboard.rows.some(r=>typeof r!=='string'||r.length!==d.width||[...r].some(c=>!Object.hasOwn(d.palette,c))))throw Error('Cel 剪贴板与项目大小或色板不匹配');
 layerAt(d,id).frames[frame]=rowsCopy(clipboard.rows);
}
export function clearCel(d,id,frame){layerAt(d,id).frames[frame]=blank(d);}
export function moveCel(d,fromId,fromFrame,toId,toFrame){
 const cell=copyCel(d,fromId,fromFrame);
 pasteCel(d,toId,toFrame,cell);
 if(fromId!==toId||fromFrame!==toFrame)clearCel(d,fromId,fromFrame);
}
export function insertFrame(d,at,mode='blank'){
 const n=frameCount(d);
 if(n>=16)throw Error('最多 16 帧');
 if(!okIndex(at,n+1))throw Error('插入位置错误');
 for(const l of d.layers){
  const value=mode==='duplicate'&&n>0?rowsCopy(l.frames[Math.max(0,at-1)]):blank(d);
  l.frames.splice(at,0,value);
 }
}
export function moveFrame(d,from,to){
 const n=frameCount(d);
 if(!okIndex(from,n)||!okIndex(to,n))throw Error('帧移动位置越界');
 if(from===to)return false;
 for(const l of d.layers){const [f]=l.frames.splice(from,1);l.frames.splice(to,0,f);}
 return true;
}
export function celStats(d,id,frame){
 const rows=getCel(d,id,frame);
 let pixels=0;for(const row of rows)for(const c of row)if(c!=='.'&&d.palette[c]!=='transparent')pixels++;
 return {pixels,empty:pixels===0};
}
