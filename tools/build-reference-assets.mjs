// Deterministic originals: PixelWeave reference sprites for educational use.
// NOT trained/LLM-generated sprites; curated code-authored examples with repeatable output.
export const SOURCE_VERSION='reference-sprites-v1';
const configs=[
 {id:'readable-key',name:'Reading the Key',w:16,h:16,n:1,tags:['L0','silhouette','metal'],levels:['contour','fill','glint']},
 {id:'scarlet-vial',name:'Scarlet Vial Study',w:24,h:24,n:8,tags:['L1','L2','glass','liquid'],levels:['shadow','glass','liquid','bubbles','reflections','stopper']},
 {id:'hearth-lantern',name:'Hearth Lantern Study',w:24,h:24,n:6,tags:['L1','L2','metal','fire'],levels:['shadow','frame','light','flame','highlights']},
 {id:'prism-crystal',name:'Prism Crystal Study',w:24,h:24,n:6,tags:['L1','L2','facet','glint'],levels:['shadow','shape','facets','shimmer']},
 {id:'wind-banner',name:'Wind Banner Study',w:24,h:24,n:8,tags:['L2','L3','cloth'],levels:['staff','fabric','folds']},
 {id:'ember-flame',name:'Ember Flame Study',w:16,h:16,n:8,tags:['L2','fire','effects'],levels:['base','outer','core','sparks']}
];
const palette={'.':'transparent',K:'#251a2f',D:'#514055',M:'#806475',B:'#98506a',R:'#c63e59',L:'#eb6571',H:'#ffaca1',W:'#ffe4bd',A:'#c49b68',Y:'#f5bf71',C:'#5a92b4',S:'#95c8cc',P:'#a78cce'};
function blank(w,h){return Array.from({length:h},()=>Array.from({length:w},()=>'.'));}
function dot(g,x,y,c){x=Math.round(x);y=Math.round(y);if(y>=0&&y<g.length&&x>=0&&x<g[0].length)g[y][x]=c;}
function fill(g,x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)dot(g,xx,yy,c);}
function poly(g,pts,c){
 const H=g.length,W=g[0].length;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
   const [ax,ay]=pts[i],[bx,by]=pts[j];
   if((ay>y+.5)!==(by>y+.5)&&x+.5<(bx-ax)*(y+.5-ay)/(by-ay)+ax)inside=!inside;
  }if(inside)dot(g,x,y,c);
 }
}
function asset(conf){
 const {w,h,n,levels,id}=conf;
 const layers=levels.map(name=>({id:name,name:name.replace(/_/g,' '),visible:true,opacity:1,x:0,y:0,frames:[]}));
 for(let f=0;f<n;f++){
  const a=Object.fromEntries(levels.map(name=>[name,blank(w,h)]));
  if(id==='readable-key'){
   fill(a.contour,7,2,5,5,'K');fill(a.contour,8,3,3,3,'.');fill(a.contour,9,7,1,7,'K');fill(a.contour,9,12,4,1,'K');fill(a.contour,10,13,1,2,'K');fill(a.contour,12,13,1,2,'K');
   fill(a.fill,7,3,1,2,'A');fill(a.fill,8,6,2,1,'A');fill(a.fill,9,8,1,4,'Y');fill(a.glint,7,2,2,1,'W');
  }
  if(id==='scarlet-vial'){
   fill(a.shadow,6,21,12,1,'D');fill(a.shadow,8,22,8,1,'D');
   poly(a.glass,[[9,7],[15,7],[15,9],[18,11],[20,14],[20,19],[18,21],[6,21],[4,19],[4,14],[6,11],[9,9]],'K');
   poly(a.glass,[[10,9],[14,9],[14,10],[17,12],[18,14],[18,18],[17,19],[7,19],[6,18],[6,14],[7,12],[10,10]],'M');
   fill(a.glass,6,14,1,4,'D');fill(a.glass,17,14,1,4,'B');
   const wave=[0,0,-1,-1,0,0,1,1][f],surface=13+wave;
   for(let y=surface;y<=19;y++)for(let x=6;x<=18;x++){
    if(y===19&&(x<=6||x>=18))continue;
    const left=(y<14?8:y<16?7:6),right=(y<14?15:y<16?17:18);
    if(x<left||x>right)continue;
    const rowWave=(x<10?0:x>14?1:0);
    if(y<surface+rowWave)continue;
    dot(a.liquid,x,y,y>=18?'B':x<9?'R':y<surface+2?'H':'L');
   }
   fill(a.liquid,8,17,2,2,'H');fill(a.liquid,14,18,2,1,'R');
   // Bubble lifecycle: rise inside the liquid, pop, rest, spawn again near the bottom.
   const yy=[18,17,16,15,14,null,null,19][f];
   if(yy!==null&&yy>=surface+1&&yy<=19){dot(a.bubbles,12,yy,'W');if(f===3)dot(a.bubbles,13,yy,'H');}
   fill(a.reflections,6,13,1,5,'W');fill(a.reflections,7,11,1,2,'H');fill(a.reflections,17,12,1,5,'H');fill(a.reflections,8,20,8,1,'W');
   fill(a.stopper,9,3,6,4,'K');fill(a.stopper,10,4,4,2,'A');fill(a.stopper,10,4,2,1,'W');fill(a.stopper,8,7,8,2,'K');fill(a.stopper,10,8,4,1,'B');
  }
  if(id==='hearth-lantern'){
   fill(a.shadow,6,21,12,1,'D');
   fill(a.frame,10,3,4,1,'A');fill(a.frame,9,4,1,3,'K');fill(a.frame,14,4,1,3,'K');fill(a.frame,10,6,4,1,'A');
   poly(a.frame,[[8,7],[16,7],[19,10],[5,10]],'K');fill(a.frame,7,9,10,1,'Y');
   fill(a.frame,6,11,12,9,'K');fill(a.frame,7,12,10,7,'M');fill(a.frame,8,12,8,7,'A');
   fill(a.light,9,12,6,7,'B');fill(a.light,10,13,4,5,'L');
   const bend=[0,1,0,-1,0,1][f],peak=[10,11,11,12,11,10][f];
   poly(a.flame,[[12+bend,peak],[15,14],[15,17],[13,19],[10,17],[10,14]],'Y');
   poly(a.flame,[[12,13],[14,16],[12,18],[11,16]],'W');
   fill(a.highlights,6,11,1,9,'D');fill(a.highlights,17,11,1,9,'A');
   fill(a.highlights,11,10,2,10,'K');fill(a.highlights,7,20,10,2,'K');fill(a.highlights,9,21,6,1,'A');
   fill(a.highlights,8,12,1,5,'W');fill(a.highlights,15,12,1,4,'H');
  }
  if(id==='prism-crystal'){
   fill(a.shadow,7,21,10,1,'D');
   poly(a.shape,[[12,2],[18,9],[19,15],[12,21],[5,15],[6,9]],'K');
   poly(a.shape,[[12,4],[16,10],[17,15],[12,19],[7,15],[8,10]],'P');
   poly(a.facets,[[12,4],[12,19],[7,15],[8,10]],'C');
   poly(a.facets,[[12,4],[16,10],[12,12]],'W');
   poly(a.facets,[[12,12],[17,15],[12,19]],'M');fill(a.facets,10,8,1,4,'S');
   const glints=[[12,8],[15,13],[9,13],[12,17],[11,8],[16,11]][f];
   dot(a.shimmer,glints[0],glints[1],'W');
   if(f%3===0){dot(a.shimmer,19,6,'S');dot(a.shimmer,20,5,'W');}
  }
  if(id==='wind-banner'){
   fill(a.staff,5,3,2,19,'K');fill(a.staff,6,4,1,16,'A');fill(a.staff,4,21,4,2,'D');
   const wave=[0,1,2,2,1,0,-1,-1][f];
   for(let y=5;y<=16;y++){
    let right=17+Math.round(wave*(y-5)/12);
    if(y>13)right-=Math.floor((y-13)/2);
    for(let x=7;x<=right;x++)dot(a.fabric,x,y,x<10?'R':'L');
    dot(a.fabric,right,y,'K');
    if(y%4===1)dot(a.folds,11+Math.round(wave*(y-5)/12),y,'H');
    if(y>8&&y<15)dot(a.folds,14+Math.round(wave*(y-5)/12),y,'B');
   }
   fill(a.fabric,7,5,8,1,'K');dot(a.folds,8,7,'H');
  }
  if(id==='ember-flame'){
   fill(a.base,3,13,10,2,'K');fill(a.base,5,12,6,1,'B');
   const flicker=[0,1,1,2,1,0,-1,-1][f];
   poly(a.outer,[[8+flicker,2],[11,7],[12,10],[10,13],[5,13],[3,10],[5,7]],'R');
   poly(a.core,[[8,5],[10,8],[10,11],[8,13],[6,11],[6,8]],'Y');
   fill(a.core,7,9,2,4,'W');
   if(f%4<2)dot(a.sparks,12,4-(f%2),'H');
  }
  for(const l of layers)l.frames.push(a[l.id].map(row=>row.join('')));
 }
 return {format:'pixelweave/layered-v1',name:conf.name,width:w,height:h,fps:id==='readable-key'?4:8,palette:{...palette},layers};
}
export function buildReferenceLibrary(){return configs.map(conf=>({id:conf.id,tags:conf.tags,asset:asset(conf)}));}
