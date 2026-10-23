import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const filename=resolve(root,'.'+path.replace(/\/$/,'/index.html'));
  if(filename!==root&&!filename.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method Not Allowed');return;}
  const s=await stat(filename);if(!s.isFile())throw Error('Not a file');
  res.writeHead(200,{'Content-Type':types[extname(filename)]||'application/octet-stream','Cache-Control':'no-cache'});
  if(req.method==='HEAD'){res.end();return;}res.end(await readFile(filename));
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not Found');}
}).listen(4173,'127.0.0.1',()=>console.log('PixelWeave → http://127.0.0.1:4173'));
