import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {modelSettings,generateWithLLM} from './src/generator.mjs';
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
let generating=false;
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req,max=8000){
 const parts=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('请求超过 8KB 限制');parts.push(chunk);}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
http.createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path==='/api/status'&&req.method==='GET'){
   const cfg=modelSettings();json(res,200,{available:cfg.configured,model:cfg.configured?cfg.model:null,mode:'local-proxy'});return;
  }
  if(path==='/api/generate'&&req.method==='POST'){
   if(generating){json(res,429,{error:'有一个创作任务正在运行，请完成当前任务后再次提交'});return;}
   const cfg=modelSettings();if(!cfg.configured){json(res,503,{error:'本地文本模型尚未配置 PIXELWEAVE_MODEL'});return;}
   let input;
   try{input=await body(req);}catch(e){json(res,400,{error:'JSON 请求体不合法：'+e.message});return;}
   generating=true;
   try{json(res,200,await generateWithLLM(input.idea));}
   catch(e){json(res,502,{error:String(e.message).slice(0,1000)});}
   finally{generating=false;}
   return;
  }
  if(path.startsWith('/api/')){json(res,404,{error:'Unknown API'});return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method Not Allowed');return;}
  const filename=resolve(root,'.'+path.replace(/\/$/,'/index.html'));
  if(filename!==root&&!filename.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
  const s=await stat(filename);if(!s.isFile())throw Error('Not a file');
  res.writeHead(200,{'Content-Type':types[extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD'){res.end();return;}
  res.end(await readFile(filename));
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not Found');}
}).listen(4173,'127.0.0.1',()=>console.log('PixelWeave Studio → http://127.0.0.1:4173'));
