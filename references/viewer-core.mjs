// Deterministic frame math. No images are generated or sampled here.
export function validGrid(width,height,cols,rows){
 return [width,height,cols,rows].every(Number.isInteger)&&width>0&&height>0&&cols>=1&&cols<=64&&rows>=1&&rows<=64&&width%cols===0&&height%rows===0;
}
export function frameDimensions(width,height,cols,rows){
 if(!validGrid(width,height,cols,rows))throw Error('精灵表无法按指定行列整除');
 return {width:width/cols,height:height/rows,count:cols*rows};
}
export function framePosition(index,cols,rows){
 if(!Number.isInteger(index)||!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1)return {x:0,y:0};
 const i=((index%(cols*rows))+(cols*rows))%(cols*rows);
 return {x:i%cols,y:Math.floor(i/cols)};
}
export function previewIndices(total,max=12){
 if(!Number.isInteger(total)||total<1)return [];
 if(total<=max)return Array.from({length:total},(_,i)=>i);
 const picks=new Set();
 for(let i=0;i<max;i++)picks.add(Math.round(i*(total-1)/(max-1)));
 return [...picks].sort((a,b)=>a-b);
}
