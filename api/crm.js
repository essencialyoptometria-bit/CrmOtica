import {scryptSync} from 'node:crypto';
import {makeSession,validSession,sign} from '../server/auth.mjs';
const allowed = new Set(['bootstrap','saveClient','addContact','saveTask','completeTask','addSale','addAppointment','addInvestment','saveSettings']);
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const fail=(code,error)=>res.status(code).json({ok:false,error});
  if(req.method!=='POST') return fail(405,'Método não permitido.');
  const proto=process.env.VERCEL?'https':'http';
  if(req.headers.origin!==`${proto}://${req.headers.host}`) return fail(403,'Origem não permitida.');
  const {APPS_SCRIPT_URL,APPS_SCRIPT_SECRET,SESSION_SECRET,LOGIN_SALT}=process.env;
  if(!APPS_SCRIPT_URL||!APPS_SCRIPT_SECRET||!SESSION_SECRET||!LOGIN_SALT||SESSION_SECRET.length<32) return fail(503,'Configure as variáveis do servidor conforme o guia de instalação.');
  try {
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(APPS_SCRIPT_URL)) return fail(503,'URL do Apps Script inválida. Use a URL /exec.');
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!body||JSON.stringify(body).length>20000) return fail(400,'Requisição inválida.');
    const {action,payload={}}=body;
    const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('crm_session='))?.slice(12);
    const cookieSuffix=`; HttpOnly; SameSite=Strict; Path=/${process.env.VERCEL?'; Secure':''}`;
    if(action==='logout') {res.setHeader('Set-Cookie','crm_session=; Max-Age=0'+cookieSuffix);return res.json({ok:true});}
    if(action!=='login'&&!validSession(cookie,SESSION_SECRET)) return fail(401,'Sua sessão terminou. Entre novamente.');
    if(action!=='login'&&!allowed.has(action)) return fail(400,'Ação inválida.');
    const ip=process.env.VERCEL ? String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0] : req.socket?.remoteAddress||'local';
    const response=await fetch(APPS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:APPS_SCRIPT_SECRET,action,payload:action==='login'?{proof:scryptSync(String(payload.password||'').slice(0,200),LOGIN_SALT,32).toString('hex'),key:sign(ip,SESSION_SECRET)}:payload}),signal:AbortSignal.timeout(50000)});
    if(!response.ok) return fail(502,'Não foi possível acessar a planilha. Tente novamente.');
    const result=await response.json();
    if(!result.ok) return fail(action==='login'?401:400,result.error||'Não foi possível concluir.');
    if(action==='login') res.setHeader('Set-Cookie',`crm_session=${makeSession(SESSION_SECRET)}; Max-Age=43200${cookieSuffix}`);
    return res.json(result);
  } catch {return fail(502,'Falha de conexão. Atualize os dados antes de repetir um cadastro e confira a implantação do Apps Script.');}
}
