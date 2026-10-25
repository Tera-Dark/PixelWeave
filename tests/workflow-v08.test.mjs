import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildNativePotion} from '../src/native-potion.mjs';
import {validateLayered,createBlankLayered} from '../src/layered.js';
import {getCel,celStats,copyCel,pasteCel,clearCel,insertFrame,moveFrame,moveCel} from '../src/cel-ops.mjs';
import {paintLine,paintRectangle,paintFill,moveRegion} from '../src/pixel-tools.mjs';
import {inspectAnimation,stepPlayback} from '../src/animation-analysis.mjs';
const clone=d=>JSON.parse(JSON.stringify(d));
test('cel grid: source data unchanged when selecting and copying any Cel',()=>{
 const d=buildNativePotion(),before=JSON.stringify(d);
 const rows=getCel(d,'crimson_liquid',5);
 assert.equal(rows.length,64);assert.equal(rows[0].length,64);
 const c=copyCel(d,'crimson_liquid',5);assert.equal(c.rows.length,64);
 c.rows[0]='!'.repeat(64);
 assert.equal(JSON.stringify(d),before);
});
test('cel paste, clear and move stay inside the targeted layer and frame',()=>{
 const d=createBlankLayered('Cel Test',16,16,4);
 const p=d.layers[0];p.frames[1][4]=p.frames[1][4].slice(0,4)+'R'+p.frames[1][4].slice(5);
 const backup=copyCel(d,'outline',1),frame3=p.frames[3].slice();
 pasteCel(d,'outline',2,backup);
 assert.deepEqual(p.frames[2],p.frames[1]);
 clearCel(d,'outline',1);
 assert.equal(celStats(d,'outline',1).empty,true);
 assert.deepEqual(p.frames[3],frame3);
 moveCel(d,'outline',2,'outline',0);
 assert.equal(celStats(d,'outline',0).pixels,1);
 assert.equal(celStats(d,'outline',2).pixels,0);
 assert.doesNotThrow(()=>validateLayered(d));
});
test('cel clipboard rejects oversized content or unknown palette symbols',()=>{
 const d=createBlankLayered('Guard',16,16,4),c=copyCel(d,'outline',0);
 c.rows[0]='@'.repeat(16);assert.throws(()=>pasteCel(d,'outline',0,c),/色板/);
 c.rows[0]='R'.repeat(15);assert.throws(()=>pasteCel(d,'outline',0,c),/色板/);
});
test('inserting and moving whole frames keeps all layers perfectly aligned',()=>{
 const d=createBlankLayered('Frames',16,16,4);
 d.layers.push({...d.layers[0],id:'glass',name:'glass',frames:d.layers[0].frames.map(r=>r.slice())});
 d.layers[0].frames[0][1]='R'+'.'.repeat(15);
 d.layers[1].frames[0][1]='D'+'.'.repeat(15);
 moveFrame(d,0,2);
 assert.equal(d.layers[0].frames[2][1][0],'R');
 assert.equal(d.layers[1].frames[2][1][0],'D');
 insertFrame(d,1,'blank');assert.equal(d.layers[0].frames.length,5);
 assert.equal(celStats(d,'outline',1).pixels,0);
 insertFrame(d,3,'duplicate');assert.deepEqual(d.layers[1].frames[3],d.layers[1].frames[2]);
 assert.doesNotThrow(()=>validateLayered(d));
});
test('native line algorithm never leaves gaps when dragged over distant pointer positions',()=>{
 const d=createBlankLayered('Brush',16,16,4);
 assert.equal(paintLine(d,'outline',0,1,1,13,7,'R'),13);
 const r=d.layers[0].frames[0];assert.equal(r[1][1],'R');assert.equal(r[7][13],'R');
 assert.equal(paintLine(d,'outline',0,1,1,13,7,'R'),0,'no-op line should not consume undo');
});
test('rectangle outline and filled regions are pixel-aligned without anti-aliasing',()=>{
 const d=createBlankLayered('Rectangle',16,16,4);
 assert.equal(paintRectangle(d,'outline',1,1,1,4,4,'D'),12);
 assert.equal(d.layers[0].frames[1][2][2],'.');
 assert.equal(paintRectangle(d,'outline',1,1,1,4,4,'R',{filled:true}),16);
 assert.equal(d.layers[0].frames[1][2][2],'R');
 assert.equal(d.layers[0].frames[0][2][2],'.');
});
test('flood fill respects connected color bounds and returns no-op when already filled',()=>{
 const d=createBlankLayered('Fill',16,16,4);
 paintRectangle(d,'outline',0,2,2,6,6,'K');
 assert.equal(paintFill(d,'outline',0,4,4,'R'),9);
 assert.equal(paintFill(d,'outline',0,4,4,'R'),0);
 assert.equal(d.layers[0].frames[0][2][4],'K');
 assert.equal(d.layers[0].frames[0][4][4],'R');
});
test('moving selected pixels does not smear overlapping source/destination',()=>{
 const d=createBlankLayered('Move',16,16,4);
 paintLine(d,'outline',0,2,2,4,2,'R');
 assert.equal(moveRegion(d,'outline',0,2,2,4,2,1,0),3);
 assert.equal(d.layers[0].frames[0][2].slice(2,6),'.RRR');
 assert.equal(d.layers[0].frames[1][2][3],'.');
});
test('selection movement refuses destructive off-canvas clipping',()=>{
 const d=createBlankLayered('Bounds',16,16,4);
 paintLine(d,'outline',0,14,14,15,14,'R');
 const original=JSON.stringify(d);
 assert.throws(()=>moveRegion(d,'outline',0,14,14,15,14,1,0),/离开画布/);
 assert.equal(JSON.stringify(d),original);
});
test('playback handles forward, reverse and pingpong without repeated endpoints',()=>{
 assert.deepEqual(stepPlayback(3,4,1,'loop'),{frame:0,direction:1});
 assert.deepEqual(stepPlayback(0,4,1,'reverse'),{frame:3,direction:-1});
 assert.deepEqual(stepPlayback(3,4,1,'pingpong'),{frame:2,direction:-1});
 assert.deepEqual(stepPlayback(0,4,-1,'pingpong'),{frame:1,direction:1});
 assert.deepEqual(stepPlayback(0,1,1,'pingpong'),{frame:0,direction:1});
});
test('diagnostics report quantitative frame changes without pretending to evaluate art',()=>{
 const d=buildNativePotion();
 const report=inspectAnimation(d,{stableLayers:['back_glass','copper_repair','cork_wax']});
 assert.equal(report.frames,12);
 assert.equal(report.warnings.length,0);
 assert.ok(report.meanDelta>=0&&report.seamPixels>=0);
 assert.equal(report.artScore,null);
 const changed=clone(d);changed.layers.find(l=>l.id==='back_glass').frames[3][15]='.'.repeat(64);
 assert.ok(inspectAnimation(changed,{stableLayers:['back_glass']}).warnings.length>0);
});
test('Studio UI hooks expose all real tool, Cel and playback interactions',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 for(const id of ['cel-grid','cel-copy','cel-paste','cel-clear','cel-insert','cel-move-left','cel-move-right','cel-height','save-indicator','diagnosis-output','diagnose-animation','play-mode','tool-fill','tool-line','tool-rect','tool-rectfill','tool-select','selection-canvas','onion-next','onion-prev','onion-opacity']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(main,/renderCelTimeline\(grid,a\.data/);
 assert.match(main,/paintLine\(/);assert.match(main,/paintFill\(/);
 assert.match(main,/moveRegion\(/);
 assert.match(main,/inspectAnimation\(/);
 assert.match(main,/per-project|historyByAsset/);
});
