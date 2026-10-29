import {validateLayered} from './layered.js';
export const FORMAT='pixelweave/project-v2';
export function blankDocument(width,height,{name='图层 1',frames=1}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>512||height>512||!Number.isInteger(frames)||frames<1||frames>16)throw Error('画布必须为 1–512 像素，帧数为 1–16');
 return {format:FORMAT,width,height,fps:8,layers:[{id:'layer-1',name,visible:true,opacity:1,frames:Array(frames).fill(null)}]};
}
/** Convert legacy palette-indexed data into exact RGBA frame buffers. */
export function legacyToRgba(input){
 const old=validateLayered(input),out=blankDocument(old.width,old.height,{frames:old.layers[0].frames.length});out.fps=old.fps;const cels=new Map();out.layers=old.layers.map(layer=>({id:layer.id,name:layer.name,visible:layer.visible,opacity:layer.opacity,frames:layer.frames.map(()=>null)}));
 for(const layer of old.layers)for(let f=0;f<layer.frames.length;f++){let pixels=new Uint8ClampedArray(old.width*old.height*4);for(let y=0;y<old.height;y++)for(let x=0;x<old.width;x++){let value=old.palette[layer.frames[f][y][x]];if(value==='transparent')continue;const dx=x+layer.x,dy=y+layer.y;if(dx<0||dy<0||dx>=old.width||dy>=old.height)continue;let i=(dy*old.width+dx)*4;pixels[i]=parseInt(value.slice(1,3),16);pixels[i+1]=parseInt(value.slice(3,5),16);pixels[i+2]=parseInt(value.slice(5,7),16);pixels[i+3]=255;}cels.set(layer.id+':'+f,pixels);}
 return {name:old.name,document:out,cels};
}
export function linePoints(x0,y0,x1,y1){let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy,out=[];for(;;){out.push([x0,y0]);if(x0===x1&&y0===y1)break;let e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}return out;}
