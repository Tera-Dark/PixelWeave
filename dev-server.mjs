import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {modelSettings,generateWithLLM} from './src/generator.mjs';
import {generateProgressive} from './src/progressive.mjs';
import {refineOneLayer} from './src/refine.mjs';
import {createPixelFixer,decodeImagePayload} from './tools/pixel-fixer/service.mjs';
import {createWorkspaceStore} from './tools/workspace-store.mjs';
import {randomUUID} from 'node:crypto';
import {createAgentService} from './tools/agent-service.mjs';
import {localRequestAllowed,localApiRequestAllowed,isPublicProjectPath,LOCAL_HOSTS} from './src/local-request-guard.mjs';
const root=process.cwd();
const port=Number(process.env.PIXELWEAVE_PORT||4173);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PIXELWEAVE_PORT must be 1–65535');
LOCAL_HOSTS.add('127.0.0.1:'+port);LOCAL_HOSTS.add('localhost:'+port);
const pixelFixer=createPixelFixer({root});
const workspace=createWorkspaceStore();
const agent=createAgentService({workspace});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
let generating=false;
let workspaceId=null,workspaceWrites=0,workspaceOpening=false;
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req,max=8000){
 const parts=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('请求超过 8KB 限制');parts.push(chunk);}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
http.createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!localRequestAllowed(req.headers)){json(res,403,{error:'本地服务仅接受来自 localhost 的同源请求'});return;}
  if(path.startsWith('/api/')&&!localApiRequestAllowed(req.headers,req.method)){json(res,403,{error:'拒绝跨站或非 JSON 的 API 请求'});return;}
  if(path==='/api/workspace/status'&&req.method==='GET'){json(res,200,{open:!!workspace.root,root:workspace.root,workspaceId});return;}
  if(path==='/api/workspace/open'&&req.method==='POST'){let opening=false;try{const input=await body(req);if(workspaceOpening||(agent.busy||workspaceWrites)&&input.path!==workspace.root)throw Error('请先完成正在运行的保存或任务');workspaceOpening=true;opening=true;const previous=workspace.root,result=await workspace.open(input.path);if(!workspaceId||workspace.root!==previous)workspaceId=randomUUID();json(res,200,{...result,workspaceId});}catch(e){json(res,400,{error:e.message});}finally{if(opening)workspaceOpening=false;}return;}
  if(path.startsWith('/api/projects')&&workspaceOpening){json(res,409,{error:'本地目录正在切换，请稍后重试'});return;}
  if(path.startsWith('/api/projects')&&req.headers['x-pixelweave-workspace']&&req.headers['x-pixelweave-workspace']!==workspaceId){json(res,409,{error:'本地目录已在其他页面切换，当前画布仍在，请重新连接目录后保存'});return;}
  if(path==='/api/projects'&&req.method==='GET'){try{json(res,200,await workspace.listProjects());}catch(e){json(res,400,{error:e.message});}return;}
  if(path==='/api/projects'&&req.method==='POST'){workspaceWrites++;try{json(res,201,await workspace.createProject((await body(req)).name));}catch(e){json(res,400,{error:e.message});}finally{workspaceWrites--;}return;}
  const taskRoute=/^\/api\/projects\/([a-f0-9-]{36})\/tasks(?:\/([a-f0-9-]{36}))?(?:\/(cancel|retry))?$/.exec(path);
  if(taskRoute){const [,project,id,action]=taskRoute;if(req.method==='POST')workspaceWrites++;try{
   if(!id&&req.method==='GET'){json(res,200,await agent.list(project));return;}
   if(!id&&req.method==='POST'){json(res,201,await agent.start(project,await body(req,200000)));return;}
   if(id&&!action&&req.method==='GET'){json(res,200,await agent.get(project,id));return;}
   if(action==='cancel'&&req.method==='POST'){json(res,200,await agent.cancel(project,id));return;}
   if(action==='retry'&&req.method==='POST'){json(res,201,await agent.retry(project,id));return;}
   json(res,405,{error:'不支持的操作'});
  }catch(e){json(res,400,{error:e.message});}finally{if(req.method==='POST')workspaceWrites--;}return;}
  const assetRoute=/^\/api\/projects\/([a-f0-9-]{36})\/assets(?:\/([a-f0-9-]{36}))?(?:\/(versions|source|blob)(?:\/([a-f0-9-]+))?)?$/.exec(path);
  if(assetRoute){const [,project,asset,action,value]=assetRoute;if(req.method==='POST')workspaceWrites++;try{
   if(!asset&&req.method==='GET'){json(res,200,await workspace.listAssets(project));return;}
   if(!asset&&req.method==='POST'){json(res,201,await workspace.createAsset(project,await body(req,29000000)));return;}
   if(asset&&!action&&req.method==='GET'){json(res,200,await workspace.getAsset(project,asset));return;}
   if(action==='versions'&&!value&&req.method==='GET'){json(res,200,await workspace.versions(project,asset));return;}
   if(action==='versions'&&value&&req.method==='GET'){json(res,200,await workspace.version(project,asset,value));return;}
   if(action==='versions'&&!value&&req.method==='POST'){json(res,201,await workspace.saveVersion(project,asset,await body(req,29000000)));return;}
   if(action==='source'&&req.method==='GET'){const src=await workspace.source(project,asset);res.writeHead(200,{'Content-Type':src.mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(src.bytes);return;}
   if(action==='blob'&&value&&req.method==='GET'){const bytes=await workspace.blob(project,asset,value);res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});res.end(bytes);return;}
   if(action==='blob'&&!value&&req.method==='POST'){json(res,201,await workspace.putBlob(project,asset,await body(req,4300000)));return;}
   json(res,405,{error:'不支持的操作'});
  }catch(e){json(res,400,{error:e.message});}finally{if(req.method==='POST')workspaceWrites--;}return;}
  if(path==='/api/pixel-fixer/status'&&req.method==='GET'){json(res,200,{available:true});return;}
  if(path==='/api/pixel-fixer/restore'&&req.method==='POST'){
   if(pixelFixer.busy){json(res,429,{error:'已有网格恢复任务正在运行'});return;}
   let input;try{input=await body(req,29000000);}catch(e){json(res,400,{error:'图片数据无效或超过 20 MB'});return;}
   let bytes;try{bytes=decodeImagePayload(input.image);}catch(e){json(res,400,{error:e.message});return;}
   try{json(res,200,await pixelFixer.restore(bytes));}catch(e){json(res,422,{error:String(e.message).slice(0,650)});}return;
  }
  if(path==='/api/status'&&req.method==='GET'){
   const cfg=modelSettings();json(res,200,{available:cfg.configured,model:cfg.configured?cfg.model:null,mode:'local-proxy',pipeline:process.env.PIXELWEAVE_PIPELINE==='oneshot'?'oneshot':'progressive'});return;
  }
  if(path==='/api/generate'&&req.method==='POST'){
   if(generating){json(res,429,{error:'有一个创作任务正在运行，请完成当前任务后再次提交'});return;}
   const cfg=modelSettings();if(!cfg.configured){json(res,503,{error:'本地文本模型尚未配置 PIXELWEAVE_MODEL'});return;}
   let input;
   try{input=await body(req);}catch(e){json(res,400,{error:'JSON 请求体不合法：'+e.message});return;}
   generating=true;
   try{const generator=process.env.PIXELWEAVE_PIPELINE==='oneshot'?generateWithLLM:generateProgressive;json(res,200,await generator(input.idea,{...process.env,PIXELWEAVE_ART_STYLE:input.styleId||'none'}));}
   catch(e){json(res,502,{error:String(e.message).slice(0,1000)});}
   finally{generating=false;}
   return;
  }
  if(path==='/api/refine'&&req.method==='POST'){
   if(generating){json(res,429,{error:'当前已有生成任务在运行'});return;}
   const cfg=modelSettings();if(!cfg.configured){json(res,503,{error:'本地文本模型未配置'});return;}
   let input;try{input=await body(req,200000);}catch(e){json(res,400,{error:'请求无效：'+e.message});return;}
   generating=true;
   try{json(res,200,await refineOneLayer(input));}
   catch(e){json(res,422,{error:String(e.message).slice(0,1200)});}
   finally{generating=false;}
   return;
  }
  if(path.startsWith('/api/')){json(res,404,{error:'Unknown API'});return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method Not Allowed');return;}
  if(!isPublicProjectPath(path)){res.writeHead(403);res.end('Forbidden');return;}
  const filename=resolve(root,'.'+path.replace(/\/$/,'/index.html'));
  if(filename!==root&&!filename.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
  const s=await stat(filename);if(!s.isFile())throw Error('Not a file');
  res.writeHead(200,{'Content-Type':types[extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD'){res.end();return;}
  res.end(await readFile(filename));
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not Found');}
}).listen(port,'127.0.0.1',()=>console.log('PixelWeave Studio → http://127.0.0.1:'+port));
