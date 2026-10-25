/**
 * Diagonal exploded layer viewer for native pixel art. Uses exactly the
 * layered-v1 rows rendered by the Studio, without tracing or image conversion.
 * Presentation-only scaling is nearest-neighbor and never mutates the asset.
 */
export function explodedLayout(count,spread=65){
 const step=37+spread*.72;
 const baseX=48,baseY=389;
 return Array.from({length:count},(_,i)=>({
  index:i,x:baseX+i*step,y:baseY-i*23,
  width:186,height:197
 }));
}
export function layerAtPosition(x,y,count,spread=65){
 const layout=explodedLayout(count,spread);
 for(let i=layout.length-1;i>=0;i--){
  const p=layout[i];
  if(x>=p.x&&x<=p.x+p.width&&y>=p.y&&y<=p.y+p.height)return i;
 }
 return -1;
}
// Cache rasterized *source layers*, not flattened artworks. Keys include every
// palette and row value so editing a pixel invalidates the exact frame cache.
const cellCache=new Map();
export function resetExplodedCache(){cellCache.clear();}
function cachedLayerCanvas(asset,layer,frame){
 const rows=layer.frames[frame%layer.frames.length];
 const paletteKey=JSON.stringify(asset.palette);
 const key=asset.width+'x'+asset.height+'|'+layer.x+','+layer.y+'|'+paletteKey+'|'+rows.join('');
 const prior=cellCache.get(key);
 if(prior)return prior;
 const cell=document.createElement('canvas');cell.width=asset.width;cell.height=asset.height;
 const c=cell.getContext('2d');
 for(let y=0;y<asset.height;y++)for(let x=0;x<asset.width;x++){
  const col=asset.palette[rows[y][x]];
  if(!col||col==='transparent')continue;
  const px=x+layer.x,py=y+layer.y;
  if(px<0||py<0||px>=asset.width||py>=asset.height)continue;
  c.fillStyle=col;c.fillRect(px,py,1,1);
 }
 cellCache.set(key,cell);
 if(cellCache.size>180)cellCache.delete(cellCache.keys().next().value);
 return cell;
}
const ellipse=(ctx,x,y,rx,ry,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
export function renderExploded(canvas,asset,frame=0,{activeLayer=null,spread=65,solo=false}={}){
 if(!asset||!asset.layers)return;
 const ctx=canvas.getContext('2d');const W=canvas.width,H=canvas.height;
 ctx.clearRect(0,0,W,H);
 const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#111c2d');bg.addColorStop(1,'#101827');
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 // Purposeful drafting lines establish a real diagonal exploded assembly axis.
 const pos=explodedLayout(asset.layers.length,spread);
 const first=pos[0],last=pos.at(-1);
 ctx.strokeStyle='#8f829663';ctx.lineWidth=1;ctx.setLineDash([5,7]);
 ctx.beginPath();ctx.moveTo(first.x+92,first.y+87);ctx.lineTo(last.x+92,last.y+87);ctx.stroke();ctx.setLineDash([]);
 // Align transparent layers without inventing color for empty pixels.
 for(let i=asset.layers.length-1;i>=0;i--){
  const layer=asset.layers[i],p=pos[i];
  const selected=layer.id===activeLayer,dim=solo&&!selected;
  if(dim)continue;
  const a=selected?1:.94;
  ctx.save();ctx.globalAlpha=a;
  // Thin beveled translucent cards. The artwork itself is always unmorphed.
  ctx.fillStyle=selected?'#334254dd':'#243246c9';
  ctx.beginPath();ctx.moveTo(p.x,p.y+11);ctx.lineTo(p.x+12,p.y);
  ctx.lineTo(p.x+178,p.y);ctx.lineTo(p.x+186,p.y+10);
  ctx.lineTo(p.x+186,p.y+170);ctx.lineTo(p.x+175,p.y+180);
  ctx.lineTo(p.x+11,p.y+180);ctx.lineTo(p.x,p.y+169);ctx.closePath();ctx.fill();
  ctx.strokeStyle=selected?'#ffd9b5':'#586982a4';ctx.lineWidth=selected?2:1;ctx.stroke();
  ctx.fillStyle=selected?'#f7c69f':'#869aae';
  ctx.font='bold 12px ui-monospace, Consolas, monospace';
  ctx.fillText(String(i+1).padStart(2,'0'),p.x+14,p.y+20);
  ctx.fillStyle='#c7d2df';ctx.font='11px ui-monospace, Consolas, monospace';
  const display=layer.id.replaceAll('_',' ');
  ctx.fillText(display.slice(0,23),p.x+37,p.y+20);
  // Render native one-layer pixel cells at an exact factor of 2.
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(cachedLayerCanvas(asset,layer,frame),p.x+29,p.y+29,128,128);
  ctx.strokeStyle=selected?'#e8a77f90':'#62718735';
  ctx.strokeRect(p.x+29.5,p.y+29.5,128,128);
  ctx.fillStyle=selected?'#fbdcba':'#a4b1c3';
  ctx.font='10px ui-monospace, Consolas, monospace';
  ctx.fillText(layer.visible===false?'○ HIDDEN':'● '+Math.round(layer.opacity*100)+'%',p.x+13,p.y+173);
  ctx.restore();
  ellipse(ctx,p.x+94,p.y+191,8,2,selected?'#edaf8c':'#65758b');
 }
 ctx.fillStyle='#dfb6a3';ctx.font='bold 12px ui-monospace, Consolas, monospace';
 ctx.fillText('LAYER STACK  /  BACK  →  FRONT',34,35);
 ctx.fillStyle='#9aafc2';ctx.font='11px ui-monospace, Consolas, monospace';
 ctx.fillText('SELECT ANY PLATE · EACH PLATE IS A REAL EDITABLE PIXEL LAYER',34,53);
 ctx.fillStyle='#98aabd';ctx.fillText('F'+String(frame+1).padStart(2,'0')+' / '+String(asset.layers[0].frames.length).padStart(2,'0'),W-110,35);
}
