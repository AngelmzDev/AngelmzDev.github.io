// Local static preview with byte ranges, needed for interactive video seeking.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4174);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4'};
http.createServer((request,response)=>{
  if(!['GET','HEAD'].includes(request.method)){response.writeHead(405);response.end();return;}
  let filename;
  try {
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    filename=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    if(!filename.startsWith(root+path.sep))throw Error('Path outside root');
  } catch {response.writeHead(400);response.end();return;}
  fs.stat(filename,(error,stat)=>{
    if(error||!stat.isFile()){response.writeHead(404);response.end('Not found');return;}
    const headers={'Content-Type':types[path.extname(filename)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
    let start=0,end=stat.size-1,status=200;
    if(request.headers.range){
      const range=/^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if(!range){response.writeHead(416,{'Content-Range':`bytes */${stat.size}`});response.end();return;}
      start=range[1]?Number(range[1]):Math.max(0,stat.size-Number(range[2]));
      end=range[1]&&range[2]?Math.min(Number(range[2]),stat.size-1):stat.size-1;
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){response.writeHead(416,{'Content-Range':`bytes */${stat.size}`});response.end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length']=end-start+1;
    response.writeHead(status,headers);
    if(request.method==='HEAD'){response.end();return;}
    const stream=fs.createReadStream(filename,{start,end});
    stream.on('error',()=>response.destroy());
    response.on('close',()=>stream.destroy());
    stream.pipe(response);
  });
}).listen(port,'127.0.0.1',()=>console.log(`Portfolio: http://127.0.0.1:${port}/`));
