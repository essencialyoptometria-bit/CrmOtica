import {mkdir,cp,rm,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
await rm('dist',{recursive:true,force:true}); await mkdir('dist'); await cp('public','dist',{recursive:true});
const domain=await readFile('public/domain.js','utf8');
await writeFile('apps-script/Core.gs',domain.replace(/^export /gm,''));
for(const file of ['public/app.js','public/domain.js','api/crm.js','server/auth.mjs']) execFileSync(process.execPath,['--check',file]);
console.log('Build concluído: dist/ e apps-script/Core.gs atualizados.');
