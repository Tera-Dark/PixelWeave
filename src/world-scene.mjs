/** Decorative pixel landscape. Pauses while hidden and honors reduced motion. */
export function mountWorldScene(canvas){
 if(!canvas)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,visible=true,raf=0;
 const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
 const cloud=(x,y)=>{for(const [dx,dy,w,h] of [[0,8,50,8],[8,3,36,13],[18,0,16,16]])rect(x+dx,y+dy,w,h,'#fff9e8');rect(x+8,y+15,36,3,'#d0e6d2');};
 const tree=(x,y)=>{rect(x+11,y+25,8,31,'#846443');rect(x+14,y+26,3,28,'#af8556');for(const [dx,dy,w,h,c] of [[4,4,22,24,'#82ad77'],[0,12,30,15,'#82ad77'],[10,0,12,24,'#9ac789'],[2,16,8,6,'#a7d193'],[20,9,7,7,'#719d70']])rect(x+dx,y+dy,w,h,c);};
 function draw(){
  ctx.clearRect(0,0,384,208);rect(0,0,384,208,'#badfe0');rect(0,69,384,28,'#d7eac9');rect(0,90,384,48,'#c9dfaa');rect(0,107,384,30,'#a9cc85');
  for(let i=0;i<6;i++){const x=i*74-20;rect(x,97,55,20,'#cde6b9');rect(x+12,88,28,16,'#cde6b9');}
  cloud(16+(frame*.035)%420-30,25);cloud(240+(frame*.018)%180-50,45);tree(24,84);tree(330,80);
  const x=276+Math.sin(frame/75)*12,y=72+Math.sin(frame/28)*5;rect(x,y,2,3,'#aa7958');rect(x-3,y-(Math.floor(frame/18)%2?2:0),3,3,'#e9ae7d');rect(x+2,y-(Math.floor(frame/18)%2?2:0),3,3,'#e9ae7d');
  rect(0,146,384,62,'#a97246');rect(0,142,384,8,'#5c965b');rect(0,140,384,4,'#92bf71');
  // A hand-drawn split-rail fence and flower beds frame the central artwork.
  for(const x of [54,68,82,286,300,314]){rect(x,118,4,25,'#774e36');rect(x+1,118,2,21,'#c18c59');}for(const x of [54,286]){rect(x,123,32,3,'#92603d');rect(x,132,32,3,'#92603d');rect(x,122,32,1,'#e1b173');}
  for(const [x,y] of [[16,137],[36,130],[102,135],[270,135],[344,131],[365,138]]){rect(x,y,2,7,'#4f8d53');rect(x-2,y-2,3,3,'#f1d67d');rect(x+2,y-1,3,3,'#f5ead1');rect(x,y-3,2,2,'#d88878');}
  rect(18,164,13,4,'#8c5a39');rect(21,159,7,6,'#e6c58a');rect(23,155,3,5,'#f4d495');rect(22,157,5,2,'#fff2b5');
  for(let n=0;n<384;n+=25){rect(n+4,157+(n%3)*3,6,3,'#8d6845');rect(n+12,177+(n%5),8,3,'#bc8b5c');rect(n+8,139,3,4,'#d1e8a0');}
  for(const p of [46,314]){rect(p,134,3,7,'#699b63');rect(p-4,131,3,4,'#fff5bd');rect(p+4,132,3,3,'#eecb86');}
 }
 function tick(){raf=0;if(!visible||document.hidden||reduced.matches)return;frame++;draw();raf=requestAnimationFrame(tick);}
 function update(){if(visible&&!document.hidden&&!reduced.matches){if(!raf)raf=requestAnimationFrame(tick);}else if(raf){cancelAnimationFrame(raf);raf=0;}}
 draw();if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();}).observe(canvas);
 document.addEventListener('visibilitychange',update);reduced.addEventListener?.('change',update);update();
}
