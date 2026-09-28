import {mkdir,cp,rm,readFile,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
await rm('dist',{recursive:true,force:true});await mkdir('dist');await cp('public','dist',{recursive:true});
await writeFile('apps-script/Core.gs',(await readFile('public/domain.js','utf8')).replace(/^export /gm,''));
for(const f of ['public/app.js','public/domain.js','api/crm.js','server/auth.mjs','server/database.mjs'])execFileSync(process.execPath,['--check',f]);
console.log('Build concluído: dist/ e núcleo de alertas atualizados.');
