import {mkdir,realpath,lstat,readFile,writeFile,rename,readdir} from 'node:fs/promises';
import {join,resolve,isAbsolute,sep} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';

const ID=/^[a-f0-9-]{36}$/;
const HASH=/^[a-f0-9]{64}$/;
const pngSig=Buffer.from('89504e470d0a1a0a','hex');
const safeName=(value,fallback)=>String(value||fallback).trim().slice(0,100)||fallback;
function id(value){if(!ID.test(String(value)))throw Error('无效的标识');return value;}
function safeTags(tags){return Array.isArray(tags)?[...new Set(tags.map(t=>String(t).trim().slice(0,32)).filter(Boolean))].slice(0,20):[];}
async function atomic(path,data){const tmp=path+'.'+randomUUID()+'.tmp';await writeFile(tmp,data,{flag:'wx'});await rename(tmp,path);}
async function json(path){const st=await lstat(path);if(!st.isFile()||st.isSymbolicLink())throw Error('工作区文件无效');return JSON.parse(await readFile(path,'utf8'));}
function validateDocument(d){
 if(!d||d.format!=='pixelweave/project-v2'||!Number.isInteger(d.width)||!Number.isInteger(d.height)||d.width<1||d.height<1||d.width>512||d.height>512)throw Error('画布宽高必须在 1–512 像素');
 if(!Number.isInteger(d.fps)||d.fps<1||d.fps>24||!Array.isArray(d.layers)||d.layers.length<1||d.layers.length>12)throw Error('图层或帧率无效');
 const ids=new Set();let frames=null;
 for(const layer of d.layers){if(!layer||!/^[-a-zA-Z0-9_]{1,48}$/.test(layer.id)||ids.has(layer.id))throw Error('图层标识无效');ids.add(layer.id);
  if(!Array.isArray(layer.frames)||layer.frames.length<1||layer.frames.length>16||frames!==null&&layer.frames.length!==frames)throw Error('各图层需有相同数量的 1–16 帧');frames=layer.frames.length;
  for(const hash of layer.frames)if(hash!==null&&!HASH.test(hash))throw Error('帧数据引用无效');
  if(typeof layer.visible!=='boolean'||!Number.isFinite(layer.opacity)||layer.opacity<0||layer.opacity>1)throw Error('图层属性无效');
 }
 return {format:d.format,width:d.width,height:d.height,fps:d.fps,layers:d.layers.map(l=>({id:l.id,name:safeName(l.name,'图层'),visible:l.visible,opacity:l.opacity,frames:[...l.frames]}))};
}
function pngBytes(value,w,h){
 if(typeof value!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value))throw Error('帧数据必须是 PNG');
 const data=Buffer.from(value.slice(value.indexOf(',')+1),'base64');
 if(data.length<24||data.length>3*1024*1024||!data.subarray(0,8).equals(pngSig)||data.readUInt32BE(16)!==w||data.readUInt32BE(20)!==h)throw Error('PNG 尺寸或数据无效');return data;
}
export function createWorkspaceStore(){
 let root=null,base=null;const locks=new Set();
 async function directory(...parts){
  const create=parts[0]===true;if(create)parts.shift();
  if(!base)throw Error('请先选择本地工作目录');
  let path=base;for(const part of parts){path=join(path,part);try{const st=await lstat(path);if(st.isSymbolicLink()||!st.isDirectory())throw Error('工作区包含不安全的目录');}catch(e){if(e.code==='ENOENT'&&create)await mkdir(path);else throw e;}}
  const actual=await realpath(path);if(actual!==base&&!actual.startsWith(base+sep))throw Error('路径超出工作区');return actual;
 }
 async function projectPath(project,create=false){return directory(...(create?[true]:[]),'projects',id(project));}
 async function assetPath(project,asset,create=false){return directory(...(create?[true]:[]),'projects',id(project),'assets',id(asset));}
 async function open(path){if(typeof path!=='string'||!isAbsolute(path))throw Error('请输入本机绝对路径');const chosen=await realpath(resolve(path));if(!(await lstat(chosen)).isDirectory())throw Error('路径不是文件夹');const folder=join(chosen,'.pixelweave');try{const st=await lstat(folder);if(st.isSymbolicLink()||!st.isDirectory())throw Error('工作区目录无效');}catch(e){if(e.code==='ENOENT')await mkdir(folder);else throw e;}const previousRoot=root,previousBase=base;try{root=chosen;base=await realpath(folder);await directory(true,'projects');}catch(e){root=previousRoot;base=previousBase;throw e;}return {root,format:'pixelweave/workspace-v1'};}
 async function listProjects(){let dir=await directory('projects'),out=[];for(const name of await readdir(dir)){if(!ID.test(name))continue;try{out.push(await json(join(await projectPath(name),'project.json')));}catch{}}return out.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
 async function createProject(name){const project=id(randomUUID()),dir=await projectPath(project,true),record={id:project,name:safeName(name,'未命名项目'),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await directory(true,'projects',project,'assets');await atomic(join(dir,'project.json'),JSON.stringify(record));return record;}
 async function listAssets(project){const dir=await directory('projects',id(project),'assets'),out=[];for(const name of await readdir(dir)){if(!ID.test(name))continue;try{out.push(await json(join(await assetPath(project,name),'asset.json')));}catch{}}return out.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
 async function createAsset(project,input){const projectDir=await projectPath(project);await json(join(projectDir,'project.json'));const asset=id(randomUUID()),dir=await assetPath(project,asset,true);await directory(true,'projects',project,'assets',asset,'blobs');await directory(true,'projects',project,'assets',asset,'versions');const now=new Date().toISOString(),record={id:asset,projectId:project,name:safeName(input?.name,'未命名素材'),category:safeName(input?.category,'未分类'),tags:safeTags(input?.tags),createdAt:now,updatedAt:now,currentVersion:null,origin:null};
  if(input?.source){const m=/^data:image\/(png|jpeg|webp|gif|bmp);base64,([A-Za-z0-9+/=]+)$/.exec(input.source);if(!m)throw Error('原图格式无效');const bytes=Buffer.from(m[2],'base64');if(!bytes.length||bytes.length>20*1024*1024)throw Error('原图超过 20 MB');const digest=createHash('sha256').update(bytes).digest('hex');await writeFile(join(dir,'source-'+digest),bytes,{flag:'wx'});record.origin={file:'source-'+digest,mime:'image/'+m[1],name:safeName(input.sourceName,'原图'),sha256:digest};}
  if(input?.legacy){if(typeof input.legacy!=='string'||Buffer.byteLength(input.legacy)>2000000)throw Error('旧工程文件无效');const legacy=JSON.parse(input.legacy);if(legacy?.format!=='pixelweave/layered-v1')throw Error('旧工程格式无效');const bytes=Buffer.from(input.legacy),digest=createHash('sha256').update(bytes).digest('hex');await writeFile(join(dir,'source-'+digest),bytes,{flag:'wx'});record.origin={file:'source-'+digest,mime:'application/json',name:safeName(input.sourceName,'原始工程.json'),sha256:digest};}
  await atomic(join(dir,'asset.json'),JSON.stringify(record));return record;}
 async function getAsset(project,asset){return json(join(await assetPath(project,asset),'asset.json'));}
 async function writeVersion(project,asset,input){const dir=await assetPath(project,asset),record=await json(join(dir,'asset.json'));if((input?.expectedVersion??null)!==record.currentVersion)throw Error('素材已被其他操作修改，请重新加载');const doc=validateDocument(input?.document),blobs=await directory('projects',project,'assets',asset,'blobs');
  for(const entry of input?.cels||[]){const l=doc.layers.find(x=>x.id===entry.layerId);if(!l||!Number.isInteger(entry.frame)||entry.frame<0||entry.frame>=l.frames.length)throw Error('帧位置无效');const bytes=pngBytes(entry.png,doc.width,doc.height),hash=createHash('sha256').update(bytes).digest('hex');try{await writeFile(join(blobs,hash+'.png'),bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}l.frames[entry.frame]=hash;}
  for(const layer of doc.layers)for(const hash of layer.frames)if(hash){const path=join(blobs,hash+'.png'),st=await lstat(path);if(!st.isFile()||st.isSymbolicLink())throw Error('缺少对应帧');const bytes=await readFile(path);if(bytes.length<24||!bytes.subarray(0,8).equals(pngSig)||bytes.readUInt32BE(16)!==doc.width||bytes.readUInt32BE(20)!==doc.height)throw Error('帧尺寸不匹配');}
  const version=id(randomUUID()),snapshot={id:version,assetId:asset,createdAt:new Date().toISOString(),description:safeName(input.description,'保存'),document:doc,provenance:input.provenance&&typeof input.provenance==='object'?JSON.parse(JSON.stringify(input.provenance).slice(0,10000)):null};
  await atomic(join(await directory('projects',project,'assets',asset,'versions'),version+'.json'),JSON.stringify(snapshot));record.currentVersion=version;record.updatedAt=snapshot.createdAt;record.preview=doc.layers.find(l=>l.visible&&l.frames[0])?.frames[0]||null;record.name=safeName(input.name,record.name);record.category=safeName(input.category,record.category);record.tags=safeTags(input.tags??record.tags);await atomic(join(dir,'asset.json'),JSON.stringify(record));return snapshot;}
 async function saveVersion(project,asset,input){const key=project+'/'+asset;if(locks.has(key))throw Error('素材正在保存，请稍后重试');locks.add(key);try{return await writeVersion(project,asset,input);}finally{locks.delete(key);}}
 async function source(project,asset){const dir=await assetPath(project,asset),record=await json(join(dir,'asset.json'));if(!record.origin||!/^source-[a-f0-9]{64}$/.test(record.origin.file))throw Error('没有原始图片');const path=join(dir,record.origin.file),st=await lstat(path);if(st.isSymbolicLink()||!st.isFile())throw Error('原始图片不可用');return {bytes:await readFile(path),mime:record.origin.mime};}
 async function versions(project,asset){const dir=await directory('projects',id(project),'assets',id(asset),'versions'),out=[];for(const name of await readdir(dir)){if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;out.push(await json(join(dir,name)));}return out.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
 async function version(project,asset,versionId){return json(join(await directory('projects',id(project),'assets',id(asset),'versions'),id(versionId)+'.json'));}
 async function blob(project,asset,hash){if(!HASH.test(hash))throw Error('帧标识无效');const path=join(await directory('projects',id(project),'assets',id(asset),'blobs'),hash+'.png'),st=await lstat(path);if(st.isSymbolicLink()||!st.isFile())throw Error('帧数据无效');return readFile(path);}
 async function putBlob(project,asset,input){await getAsset(project,asset);if(!Number.isInteger(input?.width)||!Number.isInteger(input?.height)||input.width<1||input.height<1||input.width>512||input.height>512)throw Error('帧尺寸无效');const bytes=pngBytes(input.png,input.width,input.height),hash=createHash('sha256').update(bytes).digest('hex'),path=join(await directory('projects',id(project),'assets',id(asset),'blobs'),hash+'.png');try{await writeFile(path,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;const existing=await lstat(path);if(!existing.isFile()||existing.isSymbolicLink())throw Error('帧数据无效');}return {hash};}
 async function taskDirectory(project){const dir=await projectPath(project);await json(join(dir,'project.json'));return directory(true,'projects',project,'tasks');}
 async function writeTask(project,task){await atomic(join(await taskDirectory(project),id(task.id)+'.json'),JSON.stringify(task));return task;}
 async function getTask(project,taskId){return json(join(await taskDirectory(project),id(taskId)+'.json'));}
 async function listTasks(project){const dir=await taskDirectory(project),out=[];for(const name of await readdir(dir)){if(/^[a-f0-9-]{36}\.json$/.test(name))out.push(await json(join(dir,name)));}return out.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
 return {open,listProjects,createProject,listAssets,createAsset,getAsset,saveVersion,versions,version,blob,putBlob,source,writeTask,getTask,listTasks,get root(){return root;}};
}
