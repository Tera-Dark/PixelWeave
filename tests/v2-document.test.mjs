import test from 'node:test';
import assert from 'node:assert/strict';
import {blankDocument,legacyToRgba,linePoints} from '../src/v2-document.mjs';
import {createBlankLayered} from '../src/layered.js';
test('v2 supports 512 and preserves validated legacy pixels without mutating source',()=>{
 assert.equal(blankDocument(512,512,{frames:16}).layers[0].frames.length,16);assert.throws(()=>blankDocument(513,1));
 const old=createBlankLayered('legacy',8,8,1);old.palette.R='#12ab34';old.layers[0].frames[0][0]='R.......';old.layers[0].x=1;const before=JSON.stringify(old),result=legacyToRgba(old),pixels=result.cels.get(result.document.layers[0].id+':0');assert.deepEqual([...pixels.slice(4,8)],[18,171,52,255]);assert.deepEqual([...pixels.slice(0,4)],[0,0,0,0]);assert.equal(JSON.stringify(old),before);
 assert.deepEqual(linePoints(0,0,2,1),[[0,0],[1,1],[2,1]]);
});
