import {randomBytes,scryptSync} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
const rl=createInterface({input:process.stdin,output:process.stdout});
const password=await rl.question('Defina a senha compartilhada (mín. 12 caracteres; visível neste terminal): ');rl.close();
if(password.length<12) {console.error('Use pelo menos 12 caracteres.');process.exit(1);}
const salt=randomBytes(24).toString('hex');
console.log('\nPropriedades do Apps Script:');
const secret=randomBytes(32).toString('hex');
// Apps Script cannot run scrypt: the server-derived proof is checked there.
console.log('API_SECRET='+secret);
console.log('LOGIN_PROOF='+scryptSync(password,salt,32).toString('hex'));
console.log('\nVariáveis da Vercel e do .env.local:');
console.log('APPS_SCRIPT_SECRET='+secret);
console.log('LOGIN_SALT='+salt);
console.log('SESSION_SECRET='+randomBytes(32).toString('hex'));
