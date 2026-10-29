import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWorkspaceStore} from '../tools/workspace-store.mjs';
import {createAgentService} from '../tools/agent-service.mjs';
const delay=()=>new Promise(r=>setTimeout(r,30));
test('agent jobs persist candidates, failure, retry and cancellation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'pixelweave-agents-'));
 try{const workspace=createWorkspaceStore();await workspace.open(root);const p=await workspace.createProject('测试');let attempt=0;
 const agent=createAgentService({workspace,generate:async idea=>{attempt++;if(idea==='失败再重试'&&attempt===2)throw Error('模拟失败');if(idea==='等待后取消')await new Promise(r=>setTimeout(r,200));return {asset:{format:'test'}};}});
 const first=await agent.start(p.id,{type:'generate',idea:'角色测试'});await delay();assert.equal((await agent.get(p.id,first.id)).status,'succeeded');
 const failed=await agent.start(p.id,{type:'generate',idea:'失败再重试'});await delay();assert.equal((await agent.get(p.id,failed.id)).status,'failed');const retry=await agent.retry(p.id,failed.id);await delay();assert.equal((await agent.get(p.id,retry.id)).status,'succeeded');
 const cancel=await agent.start(p.id,{type:'generate',idea:'等待后取消'});await agent.cancel(p.id,cancel.id);await new Promise(r=>setTimeout(r,250));assert.equal((await agent.get(p.id,cancel.id)).status,'canceled');assert.equal((await agent.list(p.id)).length,4);
 }finally{await rm(root,{recursive:true,force:true});}
});
