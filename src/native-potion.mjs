/**
 * Vermilion Nocturne — native text-authored pixel construction.
 * No image input, segmentation, tracing, scaling from illustrations,
 * diffusion output, canvas screenshots or image sampling.
 *
 * Coordinates are 64x64 integer pixel art: polygon clusters and explicitly
 * designed highlight strokes. Only liquid, bubbles, refraction and glow vary.
 */
import {validateLayered} from './layered.js';
export const POTION_ID='vermilion-native-v1';
export const POTION_FRAMES=12;
const S=64;
export const POTION_PALETTE={
 '.':'transparent',
 '0':'#181b2b','1':'#293247','2':'#37475b','3':'#516878','4':'#79949a','5':'#adc3bb','6':'#e0dfc9',
 'a':'#392732','b':'#623740','c':'#935044','d':'#b67455','e':'#e2a976',
 'f':'#47303b','g':'#69223a','h':'#b13b50','i':'#e07065',
 'j':'#450f2e','k':'#731435','l':'#a52449','m':'#ce3656','n':'#e86667','o':'#f69c74',
 'p':'#6b586a','q':'#9e808d','r':'#f6cda7','s':'#ffd7b8'
};
const LAYERS=[
 ['ground_shadow','01 · Grounded shadow'],
 ['back_glass','02 · Handblown vessel'],
 ['interior_tint','03 · Glass depth'],
 ['crimson_liquid','04 · Crimson infusion'],
 ['deep_refraction','05 · Liquid reflections'],
 ['inner_bubbles','06 · Rising bubbles'],
 ['front_rim','07 · Front glass rims'],
 ['copper_repair','08 · Hand-repaired copper'],
 ['neck_collar','09 · Brass collar'],
 ['cork_wax','10 · Cork and wax'],
 ['specular_glow','11 · Light accents']
];
const empty=()=>Array.from({length:S},()=>Array(S).fill('.'));
function px(g,x,y,c){x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<S&&y<S)g[y][x]=c;}
function bar(g,x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)px(g,xx,yy,c);}
function path(g,pts,c){
 for(let i=1;i<pts.length;i++){
  let [x,y]=pts[i-1],[tx,ty]=pts[i],dx=Math.abs(tx-x),dy=Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1,err=dx-dy;
  for(;;){px(g,x,y,c);if(x===tx&&y===ty)break;const e=2*err;if(e>-dy){err-=dy;x+=sx;}if(e<dx){err+=dx;y+=sy;}}
 }
}
function shape(g,pts,c){
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){
  let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
   let a=pts[i],b=pts[j];if((a[1]>y+.5)!==(b[1]>y+.5)&&x+.5<(b[0]-a[0])*(y+.5-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  if(inside)px(g,x,y,c);
 }
}
const vessel=[[26,13],[37,13],[39,16],[39,24],[41,28],[46,31],[49,35],[52,40],[53,46],[51,52],[47,57],[42,59],[20,59],[15,56],[11,52],[10,46],[12,39],[16,33],[22,29],[24,25],[24,17]];
const inside=[[27,17],[35,17],[35,27],[40,31],[45,35],[48,41],[49,46],[47,51],[43,55],[21,55],[17,53],[14,48],[15,42],[18,36],[23,32],[27,28]];
function interior(x,y){
 // The liquid can exist only inside the real bottle's glass cavity.
 return y>=34&&y<=55&&
 (y<37 ? x>=21&&x<=43 :
 y<41 ? x>=18&&x<=46 :
 y<48 ? x>=15&&x<=48 :
 y<52 ? x>=17&&x<=47 :
 x>=21&&x<=43);
}
function addStable(g){
 const [shadow,back,tint,,,,rim,copper,neck,seal]=g;
 // The shadow is restrained; no fake rectangular plinth.
 bar(shadow,23,60,21,1,'0');bar(shadow,19,61,25,1,'1');bar(shadow,26,62,14,1,'1');
 // Deliberately irregular hand-blown body and thick double-edge glass.
 shape(back,vessel,'0');
 shape(back,[[27,15],[36,15],[37,24],[40,29],[45,33],[49,39],[51,44],[49,51],[45,55],[41,57],[21,57],[16,54],[13,49],[12,44],[14,38],[19,33],[24,29],[26,24]],'2');
 shape(back,inside,'3');
 // Selected planes, not random speckle highlights.
 shape(tint,[[17,42],[22,34],[27,29],[35,29],[30,36],[25,42],[22,52],[18,50]],'1');
 shape(tint,[[37,29],[43,33],[49,41],[47,48],[42,53],[43,45],[42,38]],'2');
 path(tint,[[23,32],[20,35],[18,40],[17,44],[18,51]],'4');
 path(tint,[[41,31],[46,36],[48,41],[48,47]],'4');
 path(tint,[[20,55],[28,57],[42,57]],'4');
 // Front glass: broken variable-width rim with translucent interior.
 path(rim,[[15,41],[14,46],[15,51],[18,55],[23,57]],'4');
 path(rim,[[17,39],[19,35],[23,31]],'5');
 path(rim,[[18,41],[17,46],[18,50]],'6');
 path(rim,[[20,36],[22,33]],'6');
 path(rim,[[22,56],[32,57],[40,57]],'5');
 path(rim,[[44,54],[48,50],[49,45]],'3');
 path(rim,[[45,37],[47,41]],'5');
 bar(rim,40,55,3,1,'5');
 // Copper band only on the damaged right side, with realistic structural overlap.
 shape(copper,[[47,37],[50,37],[52,40],[53,46],[51,51],[48,54],[44,54],[46,50],[49,47],[49,41]],'a');
 shape(copper,[[48,39],[50,40],[51,45],[50,49],[47,52],[46,51],[48,47],[49,43]],'c');
 path(copper,[[49,39],[51,42],[52,45],[51,49],[48,52]],'d');
 path(copper,[[47,52],[44,53],[41,52]],'b');
 path(copper,[[41,53],[43,54],[47,54]],'e');
 bar(copper,49,42,2,2,'b');px(copper,50,42,'e');
 bar(copper,47,49,2,2,'b');px(copper,48,49,'e');
 // A narrow brace follows the old glass fracture into the shoulder.
 path(copper,[[48,40],[46,38],[44,36],[43,33]],'a');
 path(copper,[[47,39],[45,37],[44,35]],'d');
 px(copper,44,36,'e');
 // Collar and long, practical neck. No superfluous charm chains.
 shape(neck,[[24,21],[39,21],[40,25],[38,29],[25,29],[23,26]],'a');
 bar(neck,25,23,14,3,'c');bar(neck,25,23,10,1,'e');
 path(neck,[[26,27],[35,27],[38,26]],'b');
 bar(neck,36,23,2,2,'d');px(neck,38,25,'e');
 // Offset cork top; asymmetry comes from a genuine hand-sealed object.
 shape(seal,[[27,8],[36,8],[38,10],[38,19],[40,21],[39,23],[25,23],[23,21],[25,19],[25,11]],'0');
 shape(seal,[[28,10],[35,10],[36,12],[36,19],[27,19],[27,12]],'f');
 bar(seal,29,11,3,7,'c');path(seal,[[30,10],[34,10]],'e');
 bar(seal,35,12,1,6,'b');
 shape(seal,[[25,19],[37,19],[40,21],[37,23],[26,23],[23,21]],'g');
 bar(seal,27,20,11,2,'h');bar(seal,29,20,6,1,'i');
 // A tiny applied wax signet: a geometric seal, not visual clutter.
 shape(seal,[[31,20],[35,20],[37,23],[36,26],[31,27],[28,24],[29,21]],'g');
 bar(seal,31,22,4,3,'h');px(seal,32,22,'i');px(seal,34,24,'i');
}
function addMotion(g,f){
 const [, , ,liquid,refraction,bubbles,,,,,glow]=g;
 const surface=[40,40,39,38,38,39,40,41,41,40,39,40][f];
 // Hand-designed, closed periodic meniscus. Not image segmentation and not random frame noise.
 for(let y=34;y<=55;y++)for(let x=14;x<=48;x++){
  if(!interior(x,y))continue;
  const edge=(x<21?1:x>43?1:0);
  const wave=x>=33&&x<=42 ? [0,0,-1,-1,0,1,1,0,0,-1,-1,0][f]:0;
  if(y<surface+edge+wave)continue;
  let c=y>=53?'j':x<20?'k':x>44?'k':y>=49?'l':'m';
  if(y<=surface+2&&x>=23&&x<=42)c='n';
  px(liquid,x,y,c);
 }
 // Cohesive garnet planes, with material-consistent refraction.
 shape(refraction,[[22,48],[29,45],[35,47],[32,52],[22,53]],'l');
 shape(refraction,[[32,43],[38,42],[42,46],[37,49],[32,48]],'l');
 path(refraction,[[24,surface+2],[29,surface+1],[35,surface+1]],'o');
 path(refraction,[[36,surface+2],[41,surface+2]],'n');
 bar(refraction,24,50,4,2,'k');
 path(refraction,[[35,52],[40,52],[42,50]],'n');
 // Small enclosed luminous pulse; visible only under the crimson, not around the bottle.
 const blink=[0,0,1,1,1,0,0,-1,-1,0,0,0][f];
 bar(refraction,29+blink,46,4,3,'n');
 bar(refraction,30+blink,47,2,2,'o');
 // Explicit bubble lifecycle along two plausible tracks, no teleport across closure.
 const a=[52,51,50,49,48,47,46,45,44,43,null,null][f];
 const b=[null,null,null,null,53,52,51,50,49,48,47,46][f];
 if(a!==null&&a>=surface+3){px(bubbles,35,a,'s');px(bubbles,36,a,'o');}
 if(b!==null&&b>=surface+3){px(bubbles,27,b,'r');}
 // A timed minor reflection responds to brightening, not to random sparkle.
 const lit=[0,0,1,1,2,2,1,0,-1,-1,0,0][f];
 path(glow,[[20,45+lit],[20,48+lit]],'5');
 px(glow,21,42+lit,'6');
 if(f>=2&&f<=6){path(glow,[[43,44],[44,46]],'o');px(glow,45,47,'n');}
 if(f===4||f===5)px(glow,32,36,'5');
}
export function buildNativePotion(){
 const layers=LAYERS.map(([id,name])=>({id,name,visible:true,opacity:1,x:0,y:0,frames:[]}));
 for(let f=0;f<POTION_FRAMES;f++){
  const grids=layers.map(empty);addStable(grids);addMotion(grids,f);
  for(let k=0;k<layers.length;k++)layers[k].frames.push(grids[k].map(row=>row.join('')));
 }
 return validateLayered({format:'pixelweave/layered-v1',name:'Vermilion Nocturne · Repaired Vessel',width:S,height:S,fps:8,palette:POTION_PALETTE,layers});
}
