'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Updater,safeFile}=require('./updater.cjs');
function createServer(root=__dirname,options={}){
  const updater=options.updater||new Updater(root),csrfToken=crypto.randomBytes(32).toString('hex');
  const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.woff2':'font/woff2'};
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value))};
  const server=http.createServer(async(req,res)=>{
    const host=req.headers.host||'';if(!/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host)){json(res,403,{error:'Use the localhost app address.'});return}
    let url;try{url=new URL(req.url,`http://${host}`)}catch{json(res,400,{error:'Invalid request.'});return}
    if(options.healthToken&&url.pathname==='/_desktop/health'){json(res,200,{app:'sparkboard',token:options.healthToken,version:updater.currentVersion()});return}
    if(url.pathname.startsWith('/api/updates')){
      if(req.headers.origin&&req.headers.origin!==`http://${host}`){json(res,403,{error:'Updates are available only from the local app.'});return}
      if(req.method==='GET'&&url.pathname==='/api/updates/status'){try{json(res,200,{...updater.info(),csrfToken})}catch{json(res,500,{error:'The updater state could not be read.'})}return}
      if(req.method!=='POST'||req.headers['x-sparkboard-token']!==csrfToken||req.headers['content-type']!=='application/json'){json(res,403,{error:'The update request is not authorized. Reload the app and retry.'});return}
      let size=0,chunks=[];try{for await(const chunk of req){size+=chunk.length;if(size>4096){json(res,413,{error:'The request is too large.'});return}chunks.push(chunk)}const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');let info;
        switch(url.pathname){case '/api/updates/configure':info=updater.configure(body);break;case '/api/updates/check':info=await updater.check();break;case '/api/updates/download':info=await updater.download();break;case '/api/updates/install':info=updater.install();break;case '/api/updates/rollback':info=updater.rollback();break;case '/api/updates/reset':info=updater.resetSandbox();break;case '/api/updates/cancel':info=updater.cancel();break;default:json(res,404,{error:'Unknown updater action.'});return}
        json(res,200,{...info,csrfToken});
      }catch(error){json(res,400,{error:error.message,csrfToken})}return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return}
    let name;try{name=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html'}catch{res.writeHead(400).end();return}
    let file;if(name==='_system/update-client.js')file=path.join(root,'update-client.js');else if(name==='_system/update-client.css')file=path.join(root,'update-client.css');else{if(!safeFile(name)){res.writeHead(404).end('Not found');return}file=path.join(updater.publicRoot(),name)}
    fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end('Not found');return}if(name==='index.html'){bytes=Buffer.from(bytes.toString().replace('</head>','<link rel="stylesheet" href="/_system/update-client.css"><script src="/_system/update-client.js" defer></script></head>'))}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:bytes)});
  });return{server,updater};
}
if(require.main===module){const {server}=createServer();server.listen(3000,'127.0.0.1',()=>console.log('Sparkboard running at http://localhost:3000'));}
module.exports={createServer};
