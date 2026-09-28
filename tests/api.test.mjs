import test from 'node:test';import assert from 'node:assert/strict';import handler from '../api/crm.js';
const request=async(overrides={})=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(v){this.body=v;return this;}};await handler({method:'POST',headers:{origin:'http://localhost',host:'localhost'},body:{action:'bootstrap'},...overrides},res);return res;};
test('API bloqueia CSRF e acesso sem sessão',async()=>{Object.assign(process.env,{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SESSION_SECRET:'x'.repeat(64)});assert.equal((await request({headers:{origin:'https://evil.test',host:'localhost'}})).code,403);assert.equal((await request()).code,401);});
test('normalização preserva telefone sem código do país e remove espaços',async()=>{const {prepare}=await import('../server/database.mjs');const p=prepare('saveClient',{phone:'+55 (44) 99999-0000',name:'  Maria  '});assert.equal(p.phone,'44999990000');assert.equal(p.name,'Maria');});
test('login e bootstrap usam sessão Supabase e token do usuário para RLS',async()=>{
 Object.assign(process.env,{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SESSION_SECRET:'x'.repeat(64)});
 const previous=global.fetch,uid='10000000-0000-4000-8000-000000000001',user={id:uid,email:'tapira@example.com'};
 const jwt=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'signature'].join('.');
 let checkedUser=false,checkedRLS=false;
 global.fetch=async(url,options)=>{const path=new URL(url).pathname;let body;
  if(path==='/auth/v1/token')body={access_token:jwt,refresh_token:'refresh',expires_in:3600,token_type:'bearer',user};
  else if(path==='/auth/v1/user'){checkedUser=true;body=user;}
  else if(path.endsWith('crm_profiles'))body={role:'store',store:'Tapira'};
  else if(path.endsWith('crm_settings'))body={id:'main',hour:18};
  else {checkedRLS=true;assert.equal(new Headers(options.headers).get('Authorization'),'Bearer '+jwt);body=[];}
  return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  const login=await request({body:{action:'login',payload:{email:user.email,password:'exemplo-longo'}}});assert.equal(login.body.ok,true);assert.equal(login.body.access_token,undefined);assert.match(login.headers['Set-Cookie'],/HttpOnly/);
  const cookie=login.headers['Set-Cookie'].split(';')[0];
  const bootstrap=await request({headers:{host:'localhost',origin:'http://localhost',cookie}});assert.equal(bootstrap.body.ok,true);assert.equal(bootstrap.body.data.profile.store,'Tapira');assert.ok(checkedUser&&checkedRLS);
 }finally{global.fetch=previous;}
});
