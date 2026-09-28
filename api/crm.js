import {client,profile,state,prepare,message} from '../server/database.mjs';
import {seal,unseal} from '../server/auth.mjs';
const actions=new Set(['bootstrap','saveClient','moveStage','addContact','saveTask','completeTask','addSale','addAppointment','addInvestment','saveSettings']);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const fail=(code,error)=>res.status(code).json({ok:false,error});
 if(req.method!=='POST')return fail(405,'Método não permitido.');
 const proto=process.env.VERCEL?'https':'http';if(req.headers.origin!==`${proto}://${req.headers.host}`)return fail(403,'Origem não permitida.');
 const secret=process.env.SESSION_SECRET;
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY||!secret||secret.length<32)return fail(503,'Configure as variáveis Supabase e SESSION_SECRET no servidor.');
 const suffix=`; HttpOnly; SameSite=Strict; Path=/${process.env.VERCEL?'; Secure':''}`;
 const clear=()=>res.setHeader('Set-Cookie','crm_session=; Max-Age=0'+suffix);
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body||JSON.stringify(body).length>20000)return fail(400,'Requisição inválida.');
  const {action,payload={}}=body;let db=client();
  if(action==='login'){
   const email=String(payload.email||'').trim(),password=String(payload.password||'');if(email.length>254||password.length>200)return fail(400,'Credenciais inválidas.');
   const {data,error}=await db.auth.signInWithPassword({email,password});
   if(error)return fail(error.status===429?429:401,error.status===429?'Muitas tentativas. Aguarde e tente novamente.':'E-mail ou senha incorretos.');
   const actor=await profile(client(data.session.access_token),data.user);
   res.setHeader('Set-Cookie',`crm_session=${seal(data.session,secret)}; Max-Age=43200${suffix}`);
   return res.json({ok:true,profile:actor});
  }
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('crm_session='))?.slice(12);
  const session=unseal(token,secret);
  if(action==='logout'){
   clear();if(session){await db.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});await db.auth.signOut({scope:'local'});}return res.json({ok:true});
  }
  if(!session){clear();return fail(401,'Sua sessão terminou. Entre novamente.');}
  if(!actions.has(action))return fail(400,'Ação inválida.');
  let access=session.access_token;
  if(Number(session.expires_at)*1000<Date.now()+60000){
   const {data,error}=await db.auth.refreshSession({refresh_token:session.refresh_token});if(error){clear();return fail(401,'Sua sessão terminou. Entre novamente.');}
   access=data.session.access_token;res.setHeader('Set-Cookie',`crm_session=${seal(data.session,secret,session.deadline)}; Max-Age=${Math.max(0,Math.floor((session.deadline-Date.now())/1000))}${suffix}`);
  }
  const {data:{user},error}=await db.auth.getUser(access);if(error||!user){clear();return fail(401,'Sua sessão terminou. Entre novamente.');}
  db=client(access);const actor=await profile(db,user);
  if(action!=='bootstrap'){const {error}=await db.rpc('crm_mutate',{action,p:prepare(action,payload)});if(error)throw error;}
  return res.json({ok:true,data:await state(db,actor)});
 }catch(error){return fail(error.status===403?403:400,message(error));}
}
