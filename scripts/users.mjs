import {createInterface} from 'node:readline/promises';import {admin} from './admin-client.mjs';
const db=admin(),rl=createInterface({input:process.stdin,output:process.stdout});
try{
 console.log('Criar ou vincular um acesso. Nenhum e-mail será enviado.');
 const email=(await rl.question('E-mail de acesso: ')).trim();
 const choice=(await rl.question('Perfil: 1 = administrador, 2 = Nova Olímpia, 3 = Tapira: ')).trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['1','2','3'].includes(choice))throw Error('E-mail ou perfil inválido.');
 let existing;for(let page=1;;page++){const {data,error}=await db.auth.admin.listUsers({page,perPage:100});if(error)throw error;existing=data.users.find(u=>u.email?.toLowerCase()===email.toLowerCase());if(existing||data.users.length<100)break;}
 let user=existing,created=false;
 if(!user){const password=await rl.question('Senha inicial, mínimo 12 caracteres (visível no terminal): ');if(password.length<12)throw Error('Senha curta.');const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true});if(error)throw error;user=data.user;created=true;}
 else if((await rl.question('Usuário já existe. Digite VINCULAR para alterar seu perfil: '))!=='VINCULAR')throw Error('Operação cancelada.');
 const {error}=await db.from('crm_profiles').upsert({user_id:user.id,role:choice==='1'?'admin':'store',store:choice==='1'?null:choice==='2'?'Nova Olímpia':'Tapira'});
 if(error){if(created)await db.auth.admin.deleteUser(user.id);throw error;}
 console.log('Acesso configurado. A senha não foi alterada se o usuário já existia.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{rl.close();}
