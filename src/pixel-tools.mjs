/**
 * Integer-only pixel painting primitives. Operations affect only a selected
 * layer, selected frame and palette symbols, never composite screenshots.
 */
const inBox=(d,x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<d.width&&y<d.height;
function target(d,id,frame){const l=d.layers.find(x=>x.id===id);if(!l||!l.frames[frame])throw Error('目标 Cel 不存在');return l;}
function write(d,l,frame,x,y,code){
 const cx=x-l.x,cy=y-l.y;
 if(!inBox(d,cx,cy)||!Object.hasOwn(d.palette,code))return false;
 const before=l.frames[frame][cy];if(before[cx]===code)return false;
 l.frames[frame][cy]=before.slice(0,cx)+code+before.slice(cx+1);return true;
}
export function paintLine(d,id,frame,x1,y1,x2,y2,code){
 const l=target(d,id,frame);if(!Object.hasOwn(d.palette,code))throw Error('无效像素颜色');
 let x=Math.round(x1),y=Math.round(y1),ex=Math.round(x2),ey=Math.round(y2);
 let dx=Math.abs(ex-x),dy=Math.abs(ey-y),sx=x<ex?1:-1,sy=y<ey?1:-1,err=dx-dy,n=0;
 // Coordinates are bounded in the browser; loop safety also protects direct calls.
 if(Math.max(dx,dy)>512)throw Error('绘制线段太长');
 for(;;){
  if(write(d,l,frame,x,y,code))n++;
  if(x===ex&&y===ey)break;
  const e=2*err;if(e>-dy){err-=dy;x+=sx;}if(e<dx){err+=dx;y+=sy;}
 }
 return n;
}
export function paintRectangle(d,id,frame,x0,y0,x1,y1,code,{filled=false}={}){
 const l=target(d,id,frame);if(!Object.hasOwn(d.palette,code))throw Error('无效像素颜色');
 const xa=Math.max(0,Math.min(x0,x1)),xb=Math.min(d.width-1,Math.max(x0,x1));
 const ya=Math.max(0,Math.min(y0,y1)),yb=Math.min(d.height-1,Math.max(y0,y1));
 let count=0;
 for(let y=ya;y<=yb;y++)for(let x=xa;x<=xb;x++){
  if((filled||x===xa||x===xb||y===ya||y===yb)&&write(d,l,frame,x,y,code))count++;
 }
 return count;
}
export function paintFill(d,id,frame,x,y,code){
 const l=target(d,id,frame);if(!Object.hasOwn(d.palette,code))throw Error('无效像素颜色');
 const sx=x-l.x,sy=y-l.y;if(!inBox(d,sx,sy))return 0;
 const old=l.frames[frame][sy][sx];if(old===code)return 0;
 const queue=[[sx,sy]],visited=new Uint8Array(d.width*d.height);let next=0,count=0;
 while(next<queue.length){
  const [cx,cy]=queue[next++],i=cy*d.width+cx;
  if(!inBox(d,cx,cy)||visited[i])continue;
  visited[i]=1;if(l.frames[frame][cy][cx]!==old)continue;
  if(write(d,l,frame,cx+l.x,cy+l.y,code))count++;
  for(const [xx,yy] of [[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]])if(inBox(d,xx,yy)&&!visited[yy*d.width+xx])queue.push([xx,yy]);
 }
 return count;
}
export function moveRegion(d,id,frame,x0,y0,x1,y1,offsetX,offsetY){
 const l=target(d,id,frame);const dx=Math.trunc(offsetX),dy=Math.trunc(offsetY);
 if(!dx&&!dy)return 0;
 const xMin=Math.max(0,Math.min(x0,x1)-l.x),xMax=Math.min(d.width-1,Math.max(x0,x1)-l.x);
 const yMin=Math.max(0,Math.min(y0,y1)-l.y),yMax=Math.min(d.height-1,Math.max(y0,y1)-l.y);
 // Snapshot the selected pixels so overlapping source/dest positions are safe.
 const original=l.frames[frame].map(r=>r.split('')),newFrame=original.map(r=>r.slice()),moves=[];
 for(let y=yMin;y<=yMax;y++)for(let x=xMin;x<=xMax;x++){
  if(original[y][x]!=='.')moves.push([x,y,original[y][x]]);
  newFrame[y][x]='.';
 }
 for(const [x,y,c] of moves)if(inBox(d,x+dx,y+dy))newFrame[y+dy][x+dx]=c;
 if(!moves.length)return 0;
 l.frames[frame]=newFrame.map(r=>r.join(''));return moves.length;
}
