import {spawn} from 'node:child_process';
import {resolve} from 'node:path';

/** Local-only bridge: validates the image payload and owns the Python process lifecycle. */
export function decodeImagePayload(value){
 if(typeof value!=='string'||!/^data:image\/(png|jpeg|webp|gif|bmp);base64,[A-Za-z0-9+/=]+$/.test(value))throw Error('不支持的图片数据');
 const bytes=Buffer.from(value.slice(value.indexOf(',')+1),'base64');
 if(!bytes.length||bytes.length>20*1024*1024)throw Error('图片为空或超过 20 MB');
 return bytes;
}
export function createPixelFixer({root,python=process.env.PIXELWEAVE_PYTHON||'python',timeoutMs=120000}={}){
 let busy=false;
 async function restore(bytes){
  if(busy)throw Error('已有网格恢复任务正在运行');
  busy=true;
  try{return await new Promise((resolvePromise,reject)=>{
   const child=spawn(python,['-B',resolve(root,'tools/pixel-fixer/restore.py')],{cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe']});
   let output='',error='',done=false;
   const finish=(err,value)=>{if(done)return;done=true;clearTimeout(timer);err?reject(err):resolvePromise(value);};
   const timer=setTimeout(()=>{child.kill();finish(Error('恢复超时，请使用较小的图片'));},timeoutMs);
   child.on('error',e=>finish(Error('无法启动 Python：'+e.message)));
   child.stdin.on('error',()=>{});
   child.stdout.on('data',chunk=>{output+=chunk;if(output.length>5000000){child.kill();finish(Error('恢复结果过大'));}});
   child.stderr.on('data',chunk=>{if(error.length<4000)error+=chunk;});
   child.on('close',code=>{if(code!==0)return finish(Error(error.trim().slice(-600)||'恢复进程失败'));try{finish(null,JSON.parse(output));}catch{finish(Error('恢复结果无效'));}});
   child.stdin.end(bytes);
  });}finally{busy=false;}
 }
 return {get busy(){return busy;},restore};
}
