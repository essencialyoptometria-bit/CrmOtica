const STORES = ['Nova Olímpia', 'Tapira'];
const STAGES = ['A contatar', 'Aguardando resposta', 'Em conversa', 'Agendado', 'Comprou', 'Encerrado sem venda'];
const SOURCES = ['Prospecção ativa', 'Anúncio patrocinado', 'Indicação', 'Espontâneo'];
const ORIGINS = ['Base do caderno', 'Anúncio patrocinado', 'Indicação', 'Espontâneo'];
const LENSES = ['Visão simples', 'Multifocal de entrada', 'Multifocal caro'];
function dayBR(date = new Date()) { return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
function shiftDay(day, n) { const d = new Date(day+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
function weekday(day) { return new Date(day+'T12:00:00Z').getUTCDay(); }
function workday(day) { return weekday(day)>0 && weekday(day)<6; }
function weekStart(day) { return shiftDay(day, -((weekday(day)+6)%7)); }
function daysBetween(a,b) { return Math.round((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/86400000)+1; }
function dailyGoal(data, store, day) {
  const history = data.goals.filter(g=>g.store===store && g.effective<=day).sort((a,b)=>a.effective.localeCompare(b.effective)||a.createdAt.localeCompare(b.createdAt));
  return history.length ? Number(history[history.length-1].daily) : 0;
}
function activeCount(contacts, store, from, to) {
  return new Set(contacts.filter(c=>(!store||c.store===store)&&c.source==='Prospecção ativa'&&c.date>=from&&c.date<=to&&workday(c.date)).map(c=>c.store+'|'+c.clientId+'|'+c.date)).size;
}
function alertsFor(data, today, hour) {
  let last=hour>=Number(data.settings.hour)?today:shiftDay(today,-1);
  while(!workday(last)) last=shiftDay(last,-1);
  const days=[]; for(let d=last;days.length<3;d=shiftDay(d,-1)) if(workday(d)) days.push(d);
  return STORES.filter(store=>days.every(d=>dailyGoal(data,store,d)>0 && activeCount(data.contacts,store,d,d)<dailyGoal(data,store,d))).map(store=>({store, days:[...days].reverse()}));
}
function metrics(data,store,from,to,today) {
  const match = r=>!store||r.store===store;
  const contacts=data.contacts.filter(r=>match(r)&&r.date>=from&&r.date<=to);
  const sales=data.sales.filter(r=>match(r)&&r.date>=from&&r.date<=to);
  const tasks=data.tasks.filter(r=>match(r)&&!r.done);
  const revenue=source=>sales.filter(r=>!source||r.source===source).reduce((n,r)=>n+Number(r.value),0);
  const spend=data.investments.filter(match).reduce((n,r)=>{
    const start=r.start>from?r.start:from, end=r.end<to?r.end:to;
    return n+(end>=start?Number(r.value)*daysBetween(start,end)/daysBetween(r.start,r.end):0);
  },0);
  return {contacts:contacts.length,active:activeCount(data.contacts,store,from,to),unique:new Set(contacts.map(c=>c.clientId)).size,
    adsContacts:contacts.filter(c=>c.source==='Anúncio patrocinado').length,
    adsLeads:data.clients.filter(c=>match(c)&&c.origin==='Anúncio patrocinado'&&c.acquired>=from&&c.acquired<=to).length,
    appointments:data.appointments.filter(r=>match(r)&&r.date>=from&&r.date<=to).length,
    today:tasks.filter(t=>t.date===today),overdue:tasks.filter(t=>t.date<today),pending:tasks,sales:sales.length,
    revenue:revenue(),activeRevenue:revenue('Prospecção ativa'),adsRevenue:revenue('Anúncio patrocinado'),spend,roas:spend>0?revenue('Anúncio patrocinado')/spend:null};
}
function filterClients(clients,{store='',stage='',origin='',query='',dateField='acquired',from='',to=''}={}){
 return clients.filter(c=>(!store||c.store===store)&&(!stage||c.stage===stage)&&(!origin||c.origin===origin)&&(!query||`${c.name} ${c.phone}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))&&(!(from||to)||(c[dateField]&&(!from||c[dateField]>=from)&&(!to||c[dateField]<=to)))).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
// Dates are edited in Brazilian format; the database continues to receive ISO dates.
function formatInputDate(iso){return iso?String(iso).split('-').reverse().join('/'):'';}
function parseInputDate(value){
 const raw=String(value??'').trim();if(!raw)return '';
 const s=/^\d{8}$/.test(raw)?raw.slice(0,2)+'/'+raw.slice(2,4)+'/'+raw.slice(4):raw;
 if(!/^\d{2}\/\d{2}\/\d{4}$/.test(s))return null;
 const [day,month,year]=s.split('/'),iso=year+'-'+month+'-'+day;
 const d=new Date(iso+'T12:00:00Z');
 return year>='1900'&&year<='2100'&&!isNaN(d)&&d.toISOString().slice(0,10)===iso?iso:null;
}
