import http from 'node:http';import {readFile} from 'node:fs/promises';import path from 'node:path';import handler from '../api/crm.js';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{
  res.status=c=>{res.statusCode=c;return res;};res.json=o=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(o));};
  if(req.url==='/api/crm') {let body=''; for await(const chunk of req){body+=chunk;if(body.length>20000){res.statusCode=413;res.end();return;}}try{req.body=JSON.parse(body||'{}');}catch{res.status(400).json({ok:false,error:'JSON inválido'});return;}return handler(req,res);}
  const url=new URL(req.url,'http://localhost'); const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!['index.html','app.js','domain.js','style.css'].includes(file)){res.statusCode=404;res.end();return;}
  try{res.setHeader('Content-Type',mime[path.extname(file)]);res.end(await readFile('public/'+file));}catch{res.statusCode=404;res.end();}
}).listen(3000,'127.0.0.1',()=>console.log('CRM: http://localhost:3000 — configure .env.local para conectar ao Google.'));
