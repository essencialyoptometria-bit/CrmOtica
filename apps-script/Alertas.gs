// Agendador de e-mails. O banco inteiro está no Supabase; não usa planilha.
// Propriedades: SUPABASE_URL, SUPABASE_SECRET_KEY. Cole também Core.gs.
function supabaseRows_(table){
 const p=PropertiesService.getScriptProperties(),url=p.getProperty('SUPABASE_URL'),key=p.getProperty('SUPABASE_SECRET_KEY');
 if(!url||!key)throw Error('Configure as propriedades SUPABASE_URL e SUPABASE_SECRET_KEY.');
 let rows=[];
 for(let offset=0;;offset+=1000){
  const response=UrlFetchApp.fetch(url+'/rest/v1/'+table+'?select=*&order=id&offset='+offset+'&limit=1000',{headers:{apikey:key,...(key.indexOf('eyJ')===0?{Authorization:'Bearer '+key}:{})},muteHttpExceptions:true});
  if(response.getResponseCode()!==200&&response.getResponseCode()!==206)throw Error('Falha ao consultar Supabase: HTTP '+response.getResponseCode());
  const batch=JSON.parse(response.getContentText());rows=rows.concat(batch);if(batch.length<1000)return rows;
 }
}
function instalarAlertas(){
 ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='enviarAlertas').forEach(t=>ScriptApp.deleteTrigger(t));
 ScriptApp.newTrigger('enviarAlertas').timeBased().everyMinutes(15).create();
}
function enviarAlertas(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(10000))return;
 try{
  const today=Utilities.formatDate(new Date(),'America/Sao_Paulo','yyyy-MM-dd'),hour=Number(Utilities.formatDate(new Date(),'America/Sao_Paulo','H'));
  const props=PropertiesService.getScriptProperties();
  if(!workday(today)||props.getProperty('EMAIL_SENT_DATE')===today)return;
  const settings=supabaseRows_('crm_settings')[0];if(!settings.email||hour<Number(settings.hour))return;
  const data={settings,goals:supabaseRows_('crm_goals'),contacts:supabaseRows_('crm_contacts'),tasks:supabaseRows_('crm_tasks')};
  const alerts=alertsFor(data,today,hour);if(!alerts.length)return;
  const lines=['CRM Ótica Líder — atenção às metas',''];
  alerts.forEach(a=>{lines.push(a.store+': 3 dias de trabalho consecutivos abaixo da meta.');a.days.forEach(day=>lines.push(day+': '+activeCount(data.contacts,a.store,day,day)+' de '+dailyGoal(data,a.store,day)+' contatos.'));});
  lines.push('',data.tasks.filter(t=>!t.done&&t.date<=today).length+' follow-ups para hoje ou atrasados. Acesse o CRM para consultar os clientes.');
  MailApp.sendEmail({to:settings.email,subject:'CRM Ótica Líder: alerta de meta de prospecção',body:lines.join('\n')});
  props.setProperty('EMAIL_SENT_DATE',today);
 }finally{lock.releaseLock();}
}
