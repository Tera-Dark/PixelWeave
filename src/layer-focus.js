/**
 * Native pixel layer inspection (no image generation and no raster extraction).
 * This is an independent view over the same editable layered-v1 frame rows.
 */
export function layerBounds(asset,layerId,frame=0){
 const layer=asset?.layers?.find(l=>l.id===layerId);
 if(!layer)return null;
 const rows=layer.frames[((frame%layer.frames.length)+layer.frames.length)%layer.frames.length];
 let left=asset.width,top=asset.height,right=-1,bottom=-1,occupied=0;
 for(let y=0;y<asset.height;y++)for(let x=0;x<asset.width;x++){
  if(rows[y][x]==='.'||asset.palette[rows[y][x]]==='transparent')continue;
  const px=x+layer.x,py=y+layer.y;
  if(px<0||py<0||px>=asset.width||py>=asset.height)continue;
  left=Math.min(px,left);top=Math.min(py,top);right=Math.max(px,right);bottom=Math.max(py,bottom);occupied++;
 }
 if(!occupied)return null;
 return {x:left,y:top,width:right-left+1,height:bottom-top+1,pixels:occupied};
}
export function layerView(asset,layerId,frame=0,{fit=true,canvasWidth=320,canvasHeight=320}={}){
 const bounds=layerBounds(asset,layerId,frame);
 if(!bounds)return {bounds:null,scale:1,originX:0,originY:0};
 const x0=Math.max(0,bounds.x-3),y0=Math.max(0,bounds.y-3);
 const x1=Math.min(asset.width,bounds.x+bounds.width+3);
 const y1=Math.min(asset.height,bounds.y+bounds.height+3);
 const selected=fit?{
  x:x0,y:y0,width:x1-x0,height:y1-y0
 }:{x:0,y:0,width:asset.width,height:asset.height};
 const scale=Math.max(1,Math.min(fit?24:999,Math.floor(Math.min(canvasWidth/selected.width,canvasHeight/selected.height))));
 const centerX=selected.x+selected.width/2,centerY=selected.y+selected.height/2;
 return {bounds,scale,originX:Math.round(canvasWidth/2-centerX*scale),originY:Math.round(canvasHeight/2-centerY*scale)};
}
export function renderSingleLayer(canvas,asset,layerId,frame=0,{fit=true,background='checker',native=false}={}){
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);
 if(!native){
  ctx.fillStyle='#172435';ctx.fillRect(0,0,w,h);
  if(background==='checker'){
   for(let y=0;y<h;y+=16)for(let x=0;x<w;x+=16){
    if(((x+y)/16)%2===0){ctx.fillStyle='#223448';ctx.fillRect(x,y,16,16);}
   }
  }else{
   ctx.fillStyle='#1e2d40';ctx.fillRect(0,0,w,h);
  }
 }
 const layer=asset?.layers?.find(l=>l.id===layerId);
 if(!layer)return layerView(asset,layerId,frame,{fit,canvasWidth:w,canvasHeight:h});
 const view=native?{bounds:layerBounds(asset,layerId,frame),scale:1,originX:0,originY:0}:
  layerView(asset,layerId,frame,{fit,canvasWidth:w,canvasHeight:h});
 const rows=layer.frames[((frame%layer.frames.length)+layer.frames.length)%layer.frames.length];
 ctx.globalAlpha=layer.opacity;
 for(let y=0;y<asset.height;y++)for(let x=0;x<asset.width;x++){
  const color=asset.palette[rows[y][x]];
  if(!color||color==='transparent')continue;
  const px=x+layer.x,py=y+layer.y;
  if(px<0||py<0||px>=asset.width||py>=asset.height)continue;
  ctx.fillStyle=color;
  ctx.fillRect(view.originX+px*view.scale,view.originY+py*view.scale,view.scale,view.scale);
 }
 ctx.globalAlpha=1;
 return view;
}
