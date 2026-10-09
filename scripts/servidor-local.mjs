import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
// Servidor de desenvolvimento, só em 127.0.0.1. Com `public/` (gerado pelo build) serve essa pasta;
// sem ela serve a raiz do projeto, mas APENAS index.html, css/ e js/ (nunca .git, .env, node_modules, docs...).
const projeto=resolve(fileURLToPath(new URL('..',import.meta.url)));
const publica=resolve(projeto,'public');
const usaPublic=existsSync(publica);
const root=usaPublic?publica:projeto;
const permitido=/^\/(index\.html|css\/.+|js\/.+)$/;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const port=4173;
createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  const decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const pedido=decoded==='/'?'/index.html':decoded;
  if(!usaPublic&&!permitido.test(pedido)){res.writeHead(404);res.end('Not Found');return;}
  const path=resolve(root,'.'+pedido);
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  if(!(await stat(path)).isFile())throw Error('not file');
  const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Not Found');}
}).listen(port,'127.0.0.1',()=>console.log(`GOVSAFE local: http://127.0.0.1:${port} (${usaPublic?'pasta public/':'raiz do projeto: index.html, css/ e js/'})`));
