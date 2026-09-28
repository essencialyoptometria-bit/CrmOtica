/* CRM Ótica Líder. Cole também Core.gs no mesmo projeto. */
const TABLES = {
  clients:['id','store','name','phone','lens','lensDetails','lastGlasses','origin','acquired','campaign','stage','createdAt','version'],
  contacts:['id','clientId','store','date','channel','source','result','note','createdAt'],
  tasks:['id','clientId','store','date','note','done','createdAt','version'],
  sales:['id','clientId','store','date','source','value','campaign','note','createdAt'],
  appointments:['id','clientId','store','date','time','kind','note','createdAt'],
  investments:['id','store','start','end','value','campaign','createdAt'],
  goals:['id','store','effective','daily','createdAt'],
  settings:['id','email','hour','novaDaily','novaWeekly','tapiraDaily','tapiraWeekly','version']
};
const NAMES={clients:'Clientes',contacts:'Contatos',tasks:'FollowUps',sales:'Vendas',appointments:'Agendamentos',investments:'Anuncios',goals:'HistoricoMetas',settings:'Configuracoes'};
function props_(){return PropertiesService.getScriptProperties();}
function db_(){const id=props_().getProperty('SPREADSHEET_ID');if(!id)throw Error('Execute setupSheet primeiro.');return SpreadsheetApp.openById(id);}
function setupSheet(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw Error('Abra o Apps Script pela planilha.');
  props_().setProperty('SPREADSHEET_ID',ss.getId());ss.setSpreadsheetTimeZone('America/Sao_Paulo');
  Object.keys(TABLES).forEach(k=>{let sh=ss.getSheetByName(NAMES[k]);if(!sh)sh=ss.insertSheet(NAMES[k]);if(sh.getLastRow()===0){sh.appendRow(TABLES[k]);sh.setFrozenRows(1);sh.getRange(1,1,1,TABLES[k].length).setBackground('#45216b').setFontColor('#ffffff').setFontWeight('bold');}else if(sh.getRange(1,1,1,TABLES[k].length).getValues()[0].join('|')!==TABLES[k].join('|'))throw Error('Cabeçalhos incompatíveis em '+NAMES[k]);});
  if(!rows_('settings').length)put_('settings',{id:'main',email:'',hour:18,novaDaily:10,novaWeekly:50,tapiraDaily:10,tapiraWeekly:50,version:1});
  if(!rows_('goals').length)STORES.forEach(store=>put_('goals',{id:Utilities.getUuid(),store,effective:today_(),daily:10,createdAt:new Date().toISOString()}));
}
function instalarAlertas(){
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='enviarAlertas').forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('enviarAlertas').timeBased().everyMinutes(15).create();
}
function rows_(table){const sh=db_().getSheetByName(NAMES[table]);if(!sh)throw Error('Execute setupSheet para criar as abas.');if(sh.getLastRow()<2)return [];return sh.getRange(2,1,sh.getLastRow()-1,TABLES[table].length).getValues().filter(r=>r[0]).map(r=>Object.fromEntries(TABLES[table].map((k,i)=>[k,r[i] instanceof Date?Utilities.formatDate(r[i],'America/Sao_Paulo','yyyy-MM-dd'):r[i]])));}
function put_(table,obj){const sh=db_().getSheetByName(NAMES[table]);const all=rows_(table);const ix=all.findIndex(r=>r.id===obj.id);const cells=TABLES[table].map(k=>{const v=obj[k]===undefined?'':obj[k];return typeof v==='string'&&/^[=+\-@]/.test(v)?"'"+v:v;});const range=sh.getRange(ix<0?sh.getLastRow()+1:ix+2,1,1,cells.length);range.setNumberFormat('@');range.setValues([cells]);}
function today_(){return Utilities.formatDate(new Date(),'America/Sao_Paulo','yyyy-MM-dd');}
function text_(v,max,required){v=String(v==null?'':v).trim();if(v.length>max||required&&!v)throw Error('Preencha os campos obrigatórios respeitando o tamanho máximo.');return v;}
function pick_(v,list){if(list.indexOf(v)<0)throw Error('Opção inválida.');return v;}
function date_(v,optional){if(optional&&!v)return '';v=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||isNaN(new Date(v+'T12:00:00Z'))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v||v<'1900-01-01'||v>'2100-12-31')throw Error('Informe uma data válida.');return v;}
function past_(v){v=date_(v);if(v>today_())throw Error('A data não pode estar no futuro.');return v;}
function num_(v,min,max){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error('Valor numérico inválido.');return n;}
function integer_(v,min,max){const n=num_(v,min,max);if(!Number.isInteger(n))throw Error('Use um número inteiro.');return n;}
function money_(v){return Math.round(num_(v,0.01,10000000)*100)/100;}
function id_(v){v=text_(v,80,true);if(!/^[a-zA-Z0-9_-]+$/.test(v))throw Error('Identificador inválido.');return v;}
function getClient_(id){const c=rows_('clients').find(c=>c.id===id);if(!c)throw Error('Cliente não encontrado.');return c;}
function state_(){const s={};Object.keys(TABLES).forEach(k=>s[k]=rows_(k));s.settings=s.settings[0];s.tasks.forEach(t=>t.done=t.done===true||t.done==='true');return s;}
function doPost(e){
  const lock=LockService.getScriptLock();
  try{
    const req=JSON.parse(e.postData.contents);
    const expected=props_().getProperty('API_SECRET');
    if(!expected||expected.length<32||req.secret!==expected)throw Error('Acesso não autorizado.');
    if(!lock.tryLock(25000))throw Error('Sistema ocupado. Tente novamente.');
    if(req.action==='login'){
      const cache=CacheService.getScriptCache(), key='login:'+text_(req.payload.key,100,true);
      const attempts=Number(cache.get(key)||0),global=Number(cache.get('login:global')||0);
      if(attempts>=8||global>=100)throw Error('Muitas tentativas. Aguarde 15 minutos.');
      const proof=props_().getProperty('LOGIN_PROOF');
      if(!proof||req.payload.proof!==proof){cache.put(key,String(attempts+1),900);cache.put('login:global',String(global+1),900);throw Error('Senha incorreta.');}
      cache.remove(key);return json_({ok:true});
    }
    if(req.action==='bootstrap')return json_({ok:true,data:state_()});
    mutate_(req.action,req.payload||{});
    SpreadsheetApp.flush();return json_({ok:true,data:state_()});
  }catch(err){return json_({ok:false,error:err.message||'Erro ao processar.'});}finally{if(lock.hasLock())lock.releaseLock();}
}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function mutate_(action,p){
  const now=new Date().toISOString();
  if(action==='saveClient'){
    const id=id_(p.id),all=rows_('clients'),old=all.find(c=>c.id===id);
    if(old&&Number(old.version)!==Number(p.version))throw Error('Este cliente foi alterado em outro dispositivo. Atualize antes de editar.');
    const phone=String(p.phone||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');
    if(!/^\d{10,11}$/.test(phone))throw Error('Telefone deve ter DDD e 10 ou 11 dígitos.');
    const store=pick_(p.store,STORES);
    if(old&&old.store!==store)throw Error('A loja do cliente não pode ser alterada após o cadastro.');
    if(all.some(c=>c.id!==id&&c.store===store&&String(c.phone)===phone))throw Error('Já existe um cliente com este telefone nesta loja.');
    const lastGlasses=date_(p.lastGlasses,true);if(lastGlasses&&lastGlasses>today_())throw Error('Último óculos não pode estar no futuro.');
    put_('clients',{id,store,name:text_(p.name,120,true),phone,lens:p.lens?pick_(p.lens,LENSES):'',lensDetails:text_(p.lensDetails,1000),lastGlasses,origin:pick_(p.origin,ORIGINS),acquired:past_(p.acquired),campaign:text_(p.campaign,150),stage:pick_(p.stage,STAGES),createdAt:old?old.createdAt:now,version:old?Number(old.version)+1:1});return;
  }
  if(action==='saveSettings'){
    const old=rows_('settings')[0];if(Number(p.version)!==Number(old.version))throw Error('Configuração alterada. Atualize a página.');
    const email=text_(p.email,200);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('E-mail inválido.');
    const next={id:'main',email,hour:integer_(p.hour,0,23),novaDaily:integer_(p.novaDaily,1,10000),novaWeekly:integer_(p.novaWeekly,1,50000),tapiraDaily:integer_(p.tapiraDaily,1,10000),tapiraWeekly:integer_(p.tapiraWeekly,1,50000),version:Number(old.version)+1};
    ['novaDaily','tapiraDaily'].forEach((key,i)=>{if(Number(old[key])!==next[key])put_('goals',{id:Utilities.getUuid(),store:STORES[i],effective:shiftDay(today_(),1),daily:next[key],createdAt:now});});
    put_('settings',next);return;
  }
  if(action==='addInvestment'){
    const id=id_(p.id);if(rows_('investments').some(r=>r.id===id))return;
    const start=date_(p.start),end=date_(p.end);if(end<start)throw Error('O fim precisa ser igual ou posterior ao início.');
    put_('investments',{id,store:pick_(p.store,STORES),start,end,value:money_(p.value),campaign:text_(p.campaign,150,true),createdAt:now});return;
  }
  const c=getClient_(id_(p.clientId)); const base={id:id_(p.id),clientId:c.id,store:c.store,createdAt:now};
  if(action==='addContact'){
    if(rows_('contacts').some(r=>r.id===base.id))return;
    const taskDate=date_(p.followup,true),taskNote=text_(p.followupNote,1000);
    const contact=Object.assign({},base,{date:past_(p.date),channel:pick_(p.channel,['WhatsApp','Ligação','Presencial']),source:pick_(p.source,SOURCES),result:pick_(p.result,['Sem resposta','Respondeu','Interessado','Sem interesse','Retornar depois']),note:text_(p.note,2000)});
    // Write the optional task first with a deterministic ID: retries remain idempotent.
    if(taskDate)put_('tasks',{id:base.id+'-task',clientId:c.id,store:c.store,date:taskDate,note:taskNote||'Retornar contato',done:false,createdAt:now,version:1});
    put_('contacts',contact);return;
  }
  if(action==='saveTask'||action==='completeTask'){
    const old=rows_('tasks').find(t=>t.id===base.id);
    if(old&&old.clientId!==c.id)throw Error('Tarefa inválida.');
    if(old&&Number(old.version)!==Number(p.version))throw Error('Follow-up alterado. Atualize a página.');
    if(action==='completeTask'){if(!old)throw Error('Follow-up não encontrado.');put_('tasks',Object.assign({},old,{done:true,version:Number(old.version)+1}));return;}
    put_('tasks',Object.assign({},base,{createdAt:old?old.createdAt:now,date:date_(p.date),note:text_(p.note,1000,true),done:old?old.done:false,version:old?Number(old.version)+1:1}));return;
  }
  if(action==='addSale'){
    if(rows_('sales').some(r=>r.id===base.id))return;
    const sale=Object.assign({},base,{date:past_(p.date),source:pick_(p.source,SOURCES),value:money_(p.value),campaign:text_(p.campaign,150),note:text_(p.note,2000)});
    put_('clients',Object.assign({},c,{stage:'Comprou',version:Number(c.version)+1}));put_('sales',sale);return;
  }
  if(action==='addAppointment'){
    if(rows_('appointments').some(r=>r.id===base.id))return;
    const time=text_(p.time,5,true);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Horário inválido.');
    const appointment=Object.assign({},base,{date:date_(p.date),time,kind:pick_(p.kind,['Exame','Visita à loja']),note:text_(p.note,1000)});
    put_('clients',Object.assign({},c,{stage:'Agendado',version:Number(c.version)+1}));put_('appointments',appointment);return;
  }
  throw Error('Ação desconhecida.');
}
function enviarAlertas(){
  const lock=LockService.getScriptLock();if(!lock.tryLock(10000))return;
  try{
    const today=today_(),hour=Number(Utilities.formatDate(new Date(),'America/Sao_Paulo','H'));
    const data=state_();if(!workday(today)||hour<Number(data.settings.hour)||!data.settings.email||props_().getProperty('EMAIL_SENT_DATE')===today)return;
    const alerts=alertsFor(data,today,hour);if(!alerts.length)return;
    const lines=['CRM Ótica Líder — atenção às metas',''];
    alerts.forEach(a=>{lines.push(a.store+': 3 dias de trabalho consecutivos abaixo da meta.');a.days.forEach(day=>lines.push(day+': '+activeCount(data.contacts,a.store,day,day)+' de '+dailyGoal(data,a.store,day)+' contatos.'));});
    const pending=data.tasks.filter(t=>!t.done&&t.date<=today);
    lines.push('',pending.length+' follow-ups para hoje ou atrasados. Acesse o CRM para consultar os clientes.');
    MailApp.sendEmail({to:data.settings.email,subject:'CRM Ótica Líder: alerta de meta de prospecção',body:lines.join('\n')});
    props_().setProperty('EMAIL_SENT_DATE',today);
  }finally{lock.releaseLock();}
}
