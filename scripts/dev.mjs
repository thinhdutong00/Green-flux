import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const root=resolve('public'); const port=Number(process.env.PORT||3000);const clients=new Set();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2','.ico':'image/x-icon','.xml':'application/xml','.txt':'text/plain'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/__live'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(': connected\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;}
 try{
  let path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);return res.end();}
  let entry=await stat(path);if(entry.isDirectory())path=resolve(path,'index.html');
  let data=await readFile(path);const type=types[extname(path)]||'application/octet-stream';
  if(extname(path)==='.html')data=data.toString().replace('</body>','<script>new EventSource("/__live").onmessage=()=>location.reload()</script></body>');
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':data);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Pagina non trovata');}
});
let timer;const watcher=watch(root,{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(()=>clients.forEach(res=>res.write('data: reload\n\n')),200)});
server.listen(port,'127.0.0.1',()=>console.log(`Green Flux live preview: http://localhost:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{watcher.close();clients.forEach(res=>res.end());server.close(()=>process.exit(0));});
