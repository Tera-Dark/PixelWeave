import {randomUUID} from 'node:crypto';
import {generateProgressive} from '../src/progressive.mjs';
import {refineOneLayer} from '../src/refine.mjs';

// Tasks hold data and validated pixel assets only; model output is never executed.
export function createAgentService({workspace,generate=generateProgressive,refine=refineOneLayer,env=process.env}={}){
 const running=new Map();
 async function start(project,input){
  const idea=String(input?.idea||'').trim();if(idea.length<4||idea.length>500)throw Error('创作描述应为 4–500 个字符');
  if(!['generate','refine'].includes(input.type))throw Error('不支持的任务类型');
  if(input.type==='refine'&&(!input.asset||!input.layerId))throw Error('修订需要指定工程和图层');
  const task={id:randomUUID(),projectId:project,type:input.type,input,status:'running',stage:input.type==='generate'?'构思与逐层生成':'局部修订',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),result:null,error:null};
  await workspace.writeTask(project,task);const controller=new AbortController();running.set(task.id,controller);
  const transport=(url,options={})=>{if(controller.signal.aborted)throw Error('任务已取消');return fetch(url,{...options,signal:options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal});};
  void (async()=>{try{const result=input.type==='generate'?await generate(idea,env,transport):await refine(input,env,transport);if(controller.signal.aborted)return;task.result=result;task.status='succeeded';task.stage='候选待审阅';}catch(e){if(controller.signal.aborted)return;task.status='failed';task.stage='失败';task.error=String(e.message).slice(0,1000);}finally{running.delete(task.id);if(!controller.signal.aborted){task.updatedAt=new Date().toISOString();await workspace.writeTask(project,task);}}})();
  return task;
 }
 async function get(project,id){const task=await workspace.getTask(project,id);if(task.status==='running'&&!running.has(task.id)){task.status='failed';task.stage='中断';task.error='服务已重启，任务中断；可重新尝试。';task.updatedAt=new Date().toISOString();await workspace.writeTask(project,task);}return task;}
 async function list(project){const tasks=await workspace.listTasks(project);return Promise.all(tasks.map(t=>get(project,t.id)));}
 async function cancel(project,id){const task=await get(project,id);if(task.status!=='running')throw Error('任务已结束');running.get(id)?.abort();running.delete(id);task.status='canceled';task.stage='已取消';task.updatedAt=new Date().toISOString();return workspace.writeTask(project,task);}
 async function retry(project,id){const task=await get(project,id);if(!['failed','canceled'].includes(task.status))throw Error('只能重试失败或取消的任务');return start(project,task.input);}
 return {start,get,list,cancel,retry,get busy(){return running.size>0;}};
}
