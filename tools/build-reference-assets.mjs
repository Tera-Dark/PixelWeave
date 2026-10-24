// PixelWeave authored 32×32 studies; no diffusion or third-party copyrighted assets.
export function buildReferenceLibrary(){
const pal={'.':'transparent',K:'#1e1c30',O:'#32273e',N:'#52405c',M:'#806478',P:'#b7949b',W:'#fff0d0',H:'#ffd0a2',J:'#f4ab87',F:'#b47270',D:'#672f4b',R:'#a92f53',S:'#dd4963',T:'#f77b7c',L:'#ffb078',A:'#5b402f',B:'#906044',C:'#bb8350',Y:'#f2bf6f',Z:'#ffe09a',U:'#2a526e',V:'#397f99',I:'#7bbec5',E:'#c7e6d1',Q:'#4a376a',X:'#71549a',G:'#9f82c4','1':'#d8b8e5','2':'#fff3ed'};
const W=32;
function make(id,name,names,frames=8){
 const data=names.map(k=>({id:k,name:k.replaceAll('_',' '),visible:true,opacity:1,x:0,y:0,frames:[]}));
 return {id,name,data,frames,saveFrame(draws){for(let i=0;i<data.length;i++)data[i].frames.push(draws[i].map(x=>x.join('')));},
 done(){const colors=new Set();for(const layer of data)for(const frame of layer.frames)for(const row of frame)for(const c of row)if(c!=='.')colors.add(c);return {format:'pixelweave/layered-v1',name,width:W,height:W,fps:8,palette:{'.':'transparent',...Object.fromEntries([...colors].map(c=>[c,pal[c]]))},layers:data};}};
}
const grid=()=>Array.from({length:W},()=>Array.from({length:W},()=>'.'));
const p=(g,x,y,v)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<W&&y<W)g[y][x]=v;};
const rect=(g,x,y,w,h,v)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)p(g,xx,yy,v);};
const poly=(g,points,v)=>{
 for(let y=0;y<W;y++)for(let x=0;x<W;x++){
  let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
   const a=points[i],b=points[j];if((a[1]>y+.5)!==(b[1]>y+.5)&&x+.5<(b[0]-a[0])*(y+.5-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  if(inside)p(g,x,y,v);
 }
};
const line=(g,points,v)=>{for(let k=1;k<points.length;k++){let [x0,y0]=points[k-1],[x1,y1]=points[k];let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,e=dx-dy;while(1){p(g,x0,y0,v);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>-dy){e-=dy;x0+=sx;}if(e2<dx){e+=dx;y0+=sy;}}}};
const oval=(g,x1,y1,x2,y2,v)=>{let rx=(x2-x1)/2,ry=(y2-y1)/2,mx=(x1+x2)/2,my=(y1+y2)/2;for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(((x-mx)/rx)**2+((y-my)/ry)**2<=1)p(g,x,y,v);};
const nudge=(a,i,x,y,v)=>p(a[i],x,y,v);
const all=[];
{
 const a=make('readable-key','Gilded Reliquary Key',['shadow','iron_silhouette','gold_face','engraving','gem_light']);
 for(let f=0;f<8;f++){
  let g=a.data.map(grid),[shadow,ink,gold,etch,glint]=g;
  oval(shadow,10,27,28,30,'N');
  poly(ink,[[9,6],[13,4],[17,5],[20,8],[21,12],[19,16],[16,18],[14,18],[19,22],[22,24],[24,21],[26,23],[27,26],[24,29],[22,28],[20,30],[17,27],[15,25],[12,21],[10,18],[6,18],[3,15],[2,11],[4,7]],'K');
  poly(gold,[[9,7],[13,6],[17,7],[19,10],[19,13],[17,16],[14,17],[11,16],[7,16],[4,13],[4,10],[6,8]],'B');
  poly(gold,[[9,7],[13,6],[16,7],[17,8],[12,8],[8,11],[7,15],[5,13],[5,10]],'Y');
  poly(gold,[[12,16],[14,16],[23,26],[21,28],[11,18]],'B');
  line(gold,[[14,16],[22,24],[23,24]],'Z');rect(gold,22,22,3,4,'Y');rect(gold,24,25,3,3,'C');
  oval(etch,7,8,16,15,'K');
  poly(etch,[[11,9],[15,11],[14,14],[11,15],[9,12]],'U');
  line(etch,[[11,9],[13,10],[11,13]],'I');line(etch,[[16,17],[20,22],[21,23]],'A');
  [[17,19,'H'],[19,21,'H'],[23,26,'Z']].forEach(t=>p(etch,...t));
  if([0,1,6,7].includes(f)){p(glint,10,10,'E');p(glint,9,10,'I');}
  else if(f===2){p(glint,11,9,'E');p(glint,10,10,'E');}else if(f===3)p(glint,12,10,'E');
  a.saveFrame(g);
 }
 all.push({id:a.id,tags:['L0','silhouette','key','metal'],asset:a.done()});
}
{
 const a=make('scarlet-vial','Vermilion Nocturne',['ground_shadow','glass_back','liquid','inner_embers','glass_front','gold_collar','specular']);
 for(let f=0;f<8;f++){
  let g=a.data.map(grid),[shadow,glass,liquid,bubbles,front,cork,shine]=g;
  oval(shadow,7,28,27,31,'N');rect(shadow,11,30,12,1,'O');
  poly(glass,[[13,3],[21,3],[23,5],[23,9],[26,12],[28,17],[27,24],[23,28],[9,28],[5,25],[4,20],[5,15],[8,11],[12,9],[12,5]],'K');
  poly(glass,[[14,5],[21,5],[21,10],[24,13],[26,17],[25,23],[22,26],[10,26],[7,23],[6,18],[8,14],[14,10]],'M');
  poly(glass,[[7,17],[9,13],[14,11],[21,11],[24,15],[25,19],[23,24],[20,26],[10,26],[7,23]],'U');
  poly(glass,[[9,15],[14,12],[21,12],[23,16],[24,20],[21,25],[11,25],[8,22]],'N');
  const height=[17,17,16,17,18,17,16,17][f];
  for(let y=height;y<=25;y++)for(let x=8;x<=24;x++){
   const ll={16:11,17:9,18:9,19:8,20:8,21:8,22:9,23:10,24:11,25:13}[y]??11;
   const rr={16:21,17:23,18:23,19:24,20:24,21:23,22:23,23:22,24:21,25:19}[y]??21;
   const wave=[0,1,0,-1,0,1,0,-1][(x+f)%8];
   if(x>=ll&&x<=rr&&y>=height+(y===height?wave:0)){
    let v=x<11||y>=24?'D':y>22?'R':'S';
    if(x>=12&&x<=19&&(y===height+1||y===height+2))v='T';
    p(liquid,x,y,v);
   }
  }
  rect(liquid,10,21,3,3,'R');line(liquid,[[13,height+1],[18,height+1],[20,height+2]],'L');
  line(liquid,[[12,24],[19,24]],'R');
  const bubble=[[13,23],[13,22],[14,21],[14,20],[15,19],null,null,[12,24]][f];
  if(bubble){p(bubbles,bubble[0],bubble[1],'W');p(bubbles,bubble[0]+1,bubble[1],'J');}
  if(f>=2&&f<=4)p(bubbles,19,23-(f-2),'H');
  line(front,[[6,17],[6,22],[9,26],[12,27]],'P');line(front,[[7,17],[7,22]],'I');
  line(front,[[24,16],[25,19],[25,23],[22,26]],'I');line(front,[[12,26],[21,26]],'H');
  line(front,[[8,15],[9,13],[11,12]],'E');line(front,[[9,17],[9,20]],'2');
  rect(front,23,18,1,4,'P');p(front,24,22,'2');p(front,7,22,'I');
  poly(cork,[[12,3],[13,2],[22,2],[24,4],[24,7],[22,9],[12,9],[11,7]],'K');
  rect(cork,13,3,10,5,'C');rect(cork,13,3,4,3,'Y');rect(cork,20,4,2,3,'A');
  rect(cork,11,8,13,3,'K');rect(cork,12,8,11,2,'Y');line(cork,[[13,9],[21,9]],'Z');
  rect(cork,16,7,4,5,'K');rect(cork,17,8,2,3,'R');p(cork,17,8,'H');
  if(f<3){p(shine,25,14,'W');p(shine,26,13,'E');}
  if(f>=4&&f<=6)p(shine,5,14,'I');
  a.saveFrame(g);
 }
 all.push({id:a.id,tags:['L1','L2','glass','potion','liquid'],asset:a.done()});
}
{
 const a=make('hearth-lantern',"The Lamplighter's Oath",['shadow','metal_body','glass_chamber','fire','lattice','metal_specular','glow']);
 for(let f=0;f<8;f++){
  let g=a.data.map(grid),[shadow,body,glass,fire,front,metal,glow]=g;
  oval(shadow,6,29,26,31,'N');
  poly(body,[[10,8],[11,5],[13,3],[20,3],[22,6],[22,8],[25,11],[24,13],[8,13],[7,11]],'K');
  line(body,[[12,6],[13,3],[16,2],[20,3],[21,6]],'B');rect(body,15,1,4,2,'K');
  poly(body,[[10,9],[22,9],[25,12],[7,12]],'B');line(body,[[10,10],[22,10]],'Y');
  poly(body,[[8,12],[24,12],[25,26],[23,29],[9,29],[7,26]],'K');
  rect(body,9,14,15,13,'B');rect(glass,10,15,13,11,'D');
  rect(glass,11,16,11,9,'R');rect(glass,12,17,9,7,'F');
  const phase=[0,1,1,0,-1,-1,0,1][f];
  poly(fire,[[16,24],[13,22],[12,19],[14,17],[14+phase,15],[16+phase,17],[18,16],[21,20],[19,24]],'T');
  poly(fire,[[16,23],[14,21],[15,18],[17,20],[18,19],[19,22],[18,24]],'Y');
  poly(fire,[[16,24],[16,20],[17,20],[18,23]],'W');if(f%3===0)p(fire,17,14,'Z');
  rect(front,8,13,3,14,'K');rect(front,22,13,3,14,'K');rect(front,15,13,3,14,'K');
  rect(front,9,24,15,3,'K');poly(front,[[7,26],[25,26],[23,30],[9,30]],'K');
  line(front,[[9,27],[23,27]],'B');line(front,[[10,28],[22,28]],'C');
  rect(metal,9,14,1,11,'Y');rect(metal,23,14,1,8,'C');
  line(metal,[[16,14],[16,17]],'Z');rect(metal,8,26,4,1,'Z');
  [[20,26,'H'],[11,12,'Z'],[11,11,'Z'],[22,11,'Z'],[10,28,'Z'],[22,28,'Z']].forEach(t=>p(metal,...t));
  if([2,3].includes(f)){p(glow,6,18,'L');p(glow,26,19,'J');}if([5,6].includes(f))p(glow,6,21,'H');
  a.saveFrame(g);
 }
 all.push({id:a.id,tags:['L1','L2','lantern','metal','fire'],asset:a.done()});
}
{
 const a=make('prism-crystal','Vesper Geode',['shadow','mineral_rind','cut_crystal','facet_planes','refraction','sparkle']);
 for(let f=0;f<8;f++){
  let g=a.data.map(grid),[shadow,rock,shape,facet,refract,spark]=g;
  oval(shadow,5,28,27,31,'N');
  poly(rock,[[4,25],[8,24],[9,21],[13,20],[19,23],[22,21],[27,25],[25,29],[7,29]],'K');
  poly(rock,[[6,26],[10,23],[15,24],[20,25],[24,24],[26,27],[22,28],[10,28]],'N');
  line(rock,[[8,26],[11,25],[14,26]],'M');line(rock,[[19,27],[24,26]],'D');
  poly(shape,[[15,2],[19,6],[22,15],[19,25],[14,28],[10,23],[10,13]],'K');
  poly(shape,[[15,4],[18,7],[20,15],[18,23],[14,26],[12,22],[12,13]],'X');
  poly(shape,[[15,4],[15,23],[12,21],[12,13]],'G');
  poly(shape,[[7,12],[11,15],[12,25],[8,27],[4,21],[4,16]],'K');
  poly(shape,[[7,14],[10,17],[11,24],[8,25],[6,21],[6,17]],'X');
  poly(shape,[[23,11],[27,16],[28,23],[24,27],[19,22],[20,16]],'K');
  poly(shape,[[23,13],[26,17],[26,23],[23,25],[21,22],[22,16]],'G');
  poly(facet,[[15,4],[18,8],[17,13],[15,11]],'1');
  poly(facet,[[15,12],[17,13],[19,20],[15,24]],'Q');
  poly(facet,[[12,14],[15,12],[15,24],[13,22]],'G');
  poly(facet,[[6,16],[8,17],[8,24],[6,21]],'P');
  poly(facet,[[23,13],[25,17],[23,20],[22,16]],'1');
  poly(facet,[[24,21],[26,23],[23,25],[22,23]],'X');
  line(refract,[[15,5],[15,10]],'2');line(refract,[[13,13],[13,17]],'1');line(refract,[[18,15],[18,19]],'P');
  p(refract,7,18,'1');p(refract,23,17,'2');
  const coords=[[17,10],[17,10],[17,11],[24,18],[24,18],[23,18],[9,20],[15,8]][f];
  p(spark,coords[0],coords[1],'2');if([0,3,7].includes(f))p(spark,coords[0]+1,coords[1]-1,'W');
  a.saveFrame(g);
 }
 all.push({id:a.id,tags:['L1','L2','crystal','facet','glint'],asset:a.done()});
}
{
 const a=make('wind-banner','Ashen Standard',['ground','pole','cloth_shadow','fabric','folds','heraldry','embroidered_edge']);
 const dis=[0,1,2,2,1,0,-1,-1],offs=[0,0,0,1,1,1,2,2,2,2,1,1,0,0,0,0,0,0];
 for(let f=0;f<8;f++){
  let g=a.data.map(grid),[ground,pole,shadow,cloth,fold,sigil,edge]=g;
  oval(ground,3,29,14,31,'N');
  rect(pole,7,4,3,25,'K');rect(pole,8,5,1,22,'B');
  poly(pole,[[6,5],[7,3],[8,1],[9,3],[11,5],[9,6]],'K');
  poly(pole,[[8,2],[9,4],[8,5],[7,4]],'Y');rect(pole,5,28,7,2,'K');rect(pole,7,27,3,2,'B');
  rect(pole,9,7,3,4,'Y');
  for(let y=7;y<=24;y++){
   const delta=Math.round(offs[y-7]*dis[f]/2),tip=26+delta-Math.floor(Math.max(0,y-18)/2);
   for(let x=11;x<=tip;x++){let color=x<13||x>=tip-1?'D':x>16&&x<tip-3?'S':'R';p(cloth,x,y,color);}
   p(shadow,tip+1,y,'K');
   if(y>=18&&y<=24)p(edge,12,y,'B');
   if(y%3===0){p(fold,18+Math.round(dis[f]/2),y,'D');p(fold,19+Math.round(dis[f]/2),y+1,'T');}
   p(edge,tip,y,'Y');
  }
  for(let x=11;x<23;x++){p(cloth,x,7,'O');p(edge,x,8,'Y');}
  const sx=Math.round(dis[f]/2);poly(sigil,[[18+sx,12],[20+sx,14],[18+sx,17],[16+sx,14]],'Y');
  p(sigil,18+sx,14,'K');p(sigil,18+sx,15,'H');p(edge,13,11,'Z');
  a.saveFrame(g);
 }
 all.push({id:a.id,tags:['L2','L3','banner','cloth'],asset:a.done()});
}
{
 const a=make('ember-flame','Cinderwake',['ground_shadow','charred_logs','outer_fire','orange_body','gold_core','white_heart','sparks','light_on_wood']);
 const sw=[-1,0,2,1,-1,-2,0,1],tip=[4,5,7,5,4,6,7,5],flank=[0,1,2,1,0,-1,-1,0];
 for(let f=0;f<8;f++){
  let g=a.data.map(grid),[shadow,logs,outer,orange,yellow,heart,sparks,light]=g;
  oval(shadow,6,27,27,31,'N');line(shadow,[[10,29],[23,29]],'O');
  poly(logs,[[4,25],[8,22],[16,25],[26,24],[28,27],[24,29],[16,28],[11,29]],'K');
  poly(logs,[[6,24],[9,23],[19,27],[15,28],[9,26]],'A');
  poly(logs,[[12,27],[23,22],[28,24],[25,26],[18,29]],'O');
  line(logs,[[8,24],[13,26],[15,26]],'C');
  line(logs,[[17,27],[23,24],[25,24]],'B');
  p(logs,7,25,'Y');p(logs,25,25,'J');
  // Controlled instability at the tips; the rooted base retains its silhouette.
  poly(outer,[[11,25],[8,23],[7,19],[9,16+flank[f]],[8+flank[f],12],[11,14],[13,12],[13+sw[f],9],[15+sw[f],tip[f]],[18+sw[f],10],[18,15],[20+flank[f],12],[23+flank[f],16],[22,20],[25,19],[24,23],[20,25]],'D');
  poly(outer,[[10,24],[9,21],[10,18],[11,17],[10+flank[f],14],[13,16],[15+sw[f],11],[16+sw[f],7+flank[f]],[19,14],[20,15],[21,17],[20,23],[18,25]],'R');
  poly(orange,[[11,25],[10,22],[12,19],[13,17],[14,19],[16+Math.round(sw[f]/2),12],[18,17],[20,17],[22,21],[21,24]],'S');
  poly(orange,[[12,25],[11,22],[14,18],[16,20],[17+Math.round(sw[f]/2),16],[20,21],[20,25]],'T');
  poly(yellow,[[13,25],[12,22],[14,20],[15,21],[16,18+Math.round(flank[f]/2)],[18,20],[20,23],[19,25]],'Y');
  poly(yellow,[[15,25],[14,22],[16,21],[18,23],[18,25]],'Z');
  poly(heart,[[15,25],[15,23],[16,22],[17,23],[17,25]],'W');
  if(f<3){p(sparks,23-f,11-f,'L');p(sparks,23-f,10-f,'S');}
  else if(f<6)p(sparks,9+f-3,10-(f-3),'T');
  else p(sparks,21,8,'Y');
  line(light,[[10,25],[12,26],[14,26]],'J');line(light,[[21,25],[23,24]],'Y');p(light,19,28,'R');
  a.saveFrame(g);
 }
 all.push({id:a.id,tags:['L2','fire','effects'],asset:a.done()});
}
return all;
}
