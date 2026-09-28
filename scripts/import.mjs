import {readFile} from 'node:fs/promises';import {createInterface} from 'node:readline/promises';import {admin} from './admin-client.mjs';
const rl=createInterface({input:process.stdin,output:process.stdout});
try{
 const db=admin(),file=process.argv[2]||(await rl.question('Caminho do crm-export.json: '));
 const payload=JSON.parse(await readFile(file,'utf8'));
 for(const name of ['clients','contacts','tasks','sales','appointments','investments','goals']){if(!Array.isArray(payload[name]))throw Error('Arquivo inválido: '+name);console.log(name+': '+payload[name].length);}
 payload.clients.forEach(c=>{c.phone=String(c.phone);c.lastGlasses=c.lastGlasses||null;});
 payload.tasks.forEach(t=>{t.done=t.done===true||String(t.done).toLowerCase()==='true';});
 if((await rl.question('Banco de destino deve estar vazio. Digite IMPORTAR para continuar: '))!=='IMPORTAR')throw Error('Importação cancelada.');
 const {data,error}=await db.rpc('crm_import_legacy',{payload});if(error)throw error;
 console.log('Importação concluída em uma transação:');console.log(data);
}catch(e){console.error(e.message);process.exitCode=1;}finally{rl.close();}
