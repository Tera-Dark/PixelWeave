import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeImagePayload,createPixelFixer} from '../tools/pixel-fixer/service.mjs';
test('local restoration rejects malformed payloads before starting a process',()=>{
 for(const value of [null,'','data:text/plain;base64,YQ==','data:image/png;base64,!!!'])assert.throws(()=>decodeImagePayload(value),/不支持/);
 assert.deepEqual(decodeImagePayload('data:image/png;base64,YQ=='),Buffer.from('a'));
});
test('failed Python launch releases the local restoration lock',async()=>{
 const service=createPixelFixer({root:process.cwd(),python:'pixelweave-nonexistent-python'});
 await assert.rejects(service.restore(Buffer.from('a')),/无法启动 Python/);assert.equal(service.busy,false);
});
