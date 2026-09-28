-- CRM Ótica Líder v2. Banco e permissões por loja.
-- Aplicar uma vez em um projeto vazio. Não remove dados existentes.
begin;
create schema if not exists crm_private;
revoke all on schema crm_private from public, anon;
grant usage on schema crm_private to authenticated, service_role;
create table public.crm_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','store')),
 store text check(store in ('Nova Olímpia','Tapira')),
 check((role='admin' and store is null) or (role='store' and store is not null))
);
alter table public.crm_profiles enable row level security;
create policy own_profile on public.crm_profiles for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.crm_profiles from anon,authenticated;
grant select on public.crm_profiles to authenticated;
grant all on public.crm_profiles to service_role;
create table public.crm_clients (
 id text primary key check(length(id) between 1 and 80), store text not null check(store in ('Nova Olímpia','Tapira')),
 name text not null check(length(trim(name)) between 1 and 120), phone text not null check(phone ~ '^\d{10,11}$'),
 lens text not null default '' check(lens in ('','Visão simples','Multifocal de entrada','Multifocal caro')),
 "lensDetails" text not null default '' check(length("lensDetails")<=1000),
 "lastGlasses" date check("lastGlasses" between '1900-01-01'::date and (now() at time zone 'America/Sao_Paulo')::date),
 origin text not null check(origin in ('Base do caderno','Anúncio patrocinado','Indicação','Espontâneo')),
 acquired date not null check(acquired between '1900-01-01'::date and (now() at time zone 'America/Sao_Paulo')::date),
 campaign text not null default '' check(length(campaign)<=150),
 stage text not null default 'A contatar' check(stage in ('A contatar','Aguardando resposta','Em conversa','Agendado','Comprou','Encerrado sem venda')),
 "createdAt" timestamptz not null default now(), version integer not null default 1,
 unique(store,phone), unique(id,store)
);
create table public.crm_contacts (
 id text primary key, "clientId" text not null,store text not null,
 date date not null check(date between '1900-01-01'::date and (now() at time zone 'America/Sao_Paulo')::date),
 channel text not null check(channel in ('WhatsApp','Ligação','Presencial')),
 source text not null check(source in ('Prospecção ativa','Anúncio patrocinado','Indicação','Espontâneo')),
 result text not null check(result in ('Sem resposta','Respondeu','Interessado','Sem interesse','Retornar depois')),
 note text not null default '' check(length(note)<=2000),"createdAt" timestamptz not null default now(),
 foreign key("clientId",store) references public.crm_clients(id,store)
);
create table public.crm_tasks (
 id text primary key,"clientId" text not null,store text not null,
 date date not null check(date between '1900-01-01'::date and '2100-12-31'::date),
 note text not null check(length(trim(note)) between 1 and 1000),done boolean not null default false,
 "createdAt" timestamptz not null default now(),version integer not null default 1,
 foreign key("clientId",store) references public.crm_clients(id,store)
);
create table public.crm_sales (
 id text primary key,"clientId" text not null,store text not null,
 date date not null check(date between '1900-01-01'::date and (now() at time zone 'America/Sao_Paulo')::date),
 source text not null check(source in ('Prospecção ativa','Anúncio patrocinado','Indicação','Espontâneo')),
 value numeric(12,2) not null check(value>0 and value<=10000000),
 campaign text not null default '' check(length(campaign)<=150),note text not null default '' check(length(note)<=2000),
 "createdAt" timestamptz not null default now(), foreign key("clientId",store) references public.crm_clients(id,store)
);
create table public.crm_appointments (
 id text primary key,"clientId" text not null,store text not null,
 date date not null check(date between '1900-01-01'::date and '2100-12-31'::date),
 time text not null check(time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),kind text not null check(kind in ('Exame','Visita à loja')),
 note text not null default '' check(length(note)<=1000),"createdAt" timestamptz not null default now(),
 foreign key("clientId",store) references public.crm_clients(id,store)
);
create table public.crm_investments (
 id text primary key,store text not null check(store in ('Nova Olímpia','Tapira')),
 start date not null,"end" date not null check("end">=start), value numeric(12,2) not null check(value>0 and value<=10000000),
 campaign text not null check(length(trim(campaign)) between 1 and 150),"createdAt" timestamptz not null default now()
);
create table public.crm_goals (
 id text primary key,store text not null check(store in ('Nova Olímpia','Tapira')),effective date not null,
 daily integer not null check(daily between 1 and 10000),"createdAt" timestamptz not null default now()
);
create table public.crm_settings (
 id text primary key check(id='main'),email text not null default '' check(length(email)<=200),
 hour integer not null default 18 check(hour between 0 and 23),
 "novaDaily" integer not null default 10 check("novaDaily" between 1 and 10000),
 "novaWeekly" integer not null default 50 check("novaWeekly" between 1 and 50000),
 "tapiraDaily" integer not null default 10 check("tapiraDaily" between 1 and 10000),
 "tapiraWeekly" integer not null default 50 check("tapiraWeekly" between 1 and 50000),version integer not null default 1
);
insert into public.crm_settings(id) values('main');
insert into public.crm_goals(id,store,effective,daily) select gen_random_uuid()::text,s,(now() at time zone 'America/Sao_Paulo')::date,10 from unnest(array['Nova Olímpia','Tapira']) s;
-- Authenticated users read only their store. Writes go through the guarded transaction below.
do $$declare t text;begin
 foreach t in array array['clients','contacts','tasks','sales','appointments','investments','goals'] loop
 execute format('alter table public.crm_%I enable row level security',t);
 execute format('revoke all on public.crm_%I from anon,authenticated',t);
 execute format('grant select on public.crm_%I to authenticated',t);
 execute format('grant all on public.crm_%I to service_role',t);
 execute format('create policy store_read on public.crm_%I for select to authenticated using (exists(select 1 from public.crm_profiles p where p.user_id=(select auth.uid()) and (p.role=''admin'' or p.store=crm_%I.store)))',t,t);
 end loop;
end$$;
alter table public.crm_settings enable row level security;
create policy settings_read on public.crm_settings for select to authenticated using(exists(select 1 from public.crm_profiles where user_id=(select auth.uid())));
revoke all on public.crm_settings from anon,authenticated;
grant select on public.crm_settings to authenticated;
grant all on public.crm_settings to service_role;
create index crm_clients_store_stage on public.crm_clients(store,stage);
create index crm_clients_store_acquired on public.crm_clients(store,acquired);
create index crm_clients_store_glasses on public.crm_clients(store,"lastGlasses");
create index crm_goals_store_effective on public.crm_goals(store,effective,"createdAt");
create index crm_investments_store_start on public.crm_investments(store,start);
do $$declare t text;begin
 foreach t in array array['contacts','tasks','sales','appointments'] loop
 execute format('create index crm_%I_client on public.crm_%I("clientId",store)',t,t);
 execute format('create index crm_%I_store_date on public.crm_%I(store,date)',t,t);
 end loop;
end$$;
create index crm_tasks_pending on public.crm_tasks(store,date) where not done;
-- Narrow privileged function in a non-exposed schema. No writes are granted to API roles.
create function crm_private.mutate(action text,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 prof public.crm_profiles%rowtype;c public.crm_clients%rowtype; oldtask public.crm_tasks%rowtype; s public.crm_settings%rowtype;
 rid text:=p->>'id'; target text; d date:=(now() at time zone 'America/Sao_Paulo')::date; affected integer;
begin
 if auth.uid() is null then raise exception 'Entre novamente.' using errcode='42501';end if;
 select * into prof from public.crm_profiles where user_id=auth.uid();
 if not found then raise exception 'Usuário sem acesso ao CRM.' using errcode='42501';end if;
 if p is null or jsonb_typeof(p)<>'object' or length(p::text)>20000 then raise exception 'Dados inválidos.';end if;
 if action='saveSettings' then
  select * into s from public.crm_settings where id='main' for update;
  if (p->>'version')::integer is distinct from s.version then raise exception 'Configuração alterada. Atualize a página.';end if;
  if prof.role='admin' then
   s.email:=coalesce(p->>'email','');s.hour:=(p->>'hour')::integer;
   if s.email<>'' and s.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail inválido.';end if;
  end if;
  if prof.role='admin' or prof.store='Nova Olímpia' then
   if (p->>'novaDaily')::integer is distinct from s."novaDaily" then insert into public.crm_goals(id,store,effective,daily) values(gen_random_uuid()::text,'Nova Olímpia',d+1,(p->>'novaDaily')::integer);end if;
   s."novaDaily":=(p->>'novaDaily')::integer;s."novaWeekly":=(p->>'novaWeekly')::integer;
  end if;
  if prof.role='admin' or prof.store='Tapira' then
   if (p->>'tapiraDaily')::integer is distinct from s."tapiraDaily" then insert into public.crm_goals(id,store,effective,daily) values(gen_random_uuid()::text,'Tapira',d+1,(p->>'tapiraDaily')::integer);end if;
   s."tapiraDaily":=(p->>'tapiraDaily')::integer;s."tapiraWeekly":=(p->>'tapiraWeekly')::integer;
  end if;
  update public.crm_settings set email=s.email,hour=s.hour,"novaDaily"=s."novaDaily","novaWeekly"=s."novaWeekly","tapiraDaily"=s."tapiraDaily","tapiraWeekly"=s."tapiraWeekly",version=s.version+1 where id='main';return '{}'::jsonb;
 end if;
 if rid is null or rid !~ '^[a-zA-Z0-9_-]{1,80}$' then raise exception 'Identificador inválido.';end if;
 if action in ('saveClient','moveStage') then
  select * into c from public.crm_clients where id=rid for update;
  if found then
   target:=c.store;
   if (p->>'version')::integer is distinct from c.version then raise exception 'Cliente alterado em outro dispositivo. Atualize a página.';end if;
   if action='saveClient' and p->>'store' is distinct from c.store then raise exception 'A loja do cliente não pode mudar.';end if;
  else
   if action='moveStage' then raise exception 'Cliente não encontrado.';end if;target:=p->>'store';
  end if;
 elsif action='addInvestment' then target:=p->>'store';
 else
  select * into c from public.crm_clients where id=p->>'clientId' for update;
  if not found then raise exception 'Cliente não encontrado.';end if;target:=c.store;
 end if;
 if target is null or (prof.role<>'admin' and target is distinct from prof.store) then raise exception 'Sem acesso a esta loja.' using errcode='42501';end if;
 if action='moveStage' then update public.crm_clients set stage=p->>'stage',version=version+1 where id=rid;
 elsif action='saveClient' then
  if c.id is null then
   insert into public.crm_clients(id,store,name,phone,lens,"lensDetails","lastGlasses",origin,acquired,campaign,stage) values(rid,target,p->>'name',p->>'phone',coalesce(p->>'lens',''),coalesce(p->>'lensDetails',''),nullif(p->>'lastGlasses','')::date,p->>'origin',(p->>'acquired')::date,coalesce(p->>'campaign',''),p->>'stage');
  else
   update public.crm_clients set name=p->>'name',phone=p->>'phone',lens=coalesce(p->>'lens',''),"lensDetails"=coalesce(p->>'lensDetails',''),"lastGlasses"=nullif(p->>'lastGlasses','')::date,origin=p->>'origin',acquired=(p->>'acquired')::date,campaign=coalesce(p->>'campaign',''),stage=p->>'stage',version=version+1 where id=rid;
  end if;
 elsif action='addContact' then
  insert into public.crm_contacts(id,"clientId",store,date,channel,source,result,note) values(rid,c.id,target,(p->>'date')::date,p->>'channel',p->>'source',p->>'result',coalesce(p->>'note','')) on conflict(id) do nothing;
  get diagnostics affected=row_count;
  if affected>0 and nullif(p->>'followup','') is not null then insert into public.crm_tasks(id,"clientId",store,date,note) values(rid||'-task',c.id,target,(p->>'followup')::date,coalesce(nullif(p->>'followupNote',''),'Retornar contato'));end if;
 elsif action in ('saveTask','completeTask') then
  select * into oldtask from public.crm_tasks where id=rid for update;
  if found then
   if oldtask."clientId"<>c.id or (p->>'version')::integer is distinct from oldtask.version then raise exception 'Follow-up alterado. Atualize a página.';end if;
   update public.crm_tasks set date=case when action='saveTask' then (p->>'date')::date else date end,note=case when action='saveTask' then p->>'note' else note end,done=case when action='completeTask' then true else done end,version=version+1 where id=rid;
  else
   if action='completeTask' then raise exception 'Follow-up não encontrado.';end if;
   insert into public.crm_tasks(id,"clientId",store,date,note) values(rid,c.id,target,(p->>'date')::date,p->>'note');
  end if;
 elsif action='addSale' then
  insert into public.crm_sales(id,"clientId",store,date,source,value,campaign,note) values(rid,c.id,target,(p->>'date')::date,p->>'source',(p->>'value')::numeric,coalesce(p->>'campaign',''),coalesce(p->>'note','')) on conflict(id) do nothing;
  get diagnostics affected=row_count;if affected>0 then update public.crm_clients set stage='Comprou',version=version+1 where id=c.id;end if;
 elsif action='addAppointment' then
  insert into public.crm_appointments(id,"clientId",store,date,time,kind,note) values(rid,c.id,target,(p->>'date')::date,p->>'time',p->>'kind',coalesce(p->>'note','')) on conflict(id) do nothing;
  get diagnostics affected=row_count;if affected>0 then update public.crm_clients set stage='Agendado',version=version+1 where id=c.id;end if;
 elsif action='addInvestment' then
  insert into public.crm_investments(id,store,start,"end",value,campaign) values(rid,target,(p->>'start')::date,(p->>'end')::date,(p->>'value')::numeric,p->>'campaign') on conflict(id) do nothing;
 else raise exception 'Ação desconhecida.';
 end if;
 return '{}'::jsonb;
end$$;
revoke all on function crm_private.mutate(text,jsonb) from public,anon;
grant execute on function crm_private.mutate(text,jsonb) to authenticated;
create function public.crm_mutate(action text,p jsonb) returns jsonb language sql security invoker set search_path='' as $$select crm_private.mutate(action,p)$$;
revoke all on function public.crm_mutate(text,jsonb) from public,anon;
grant execute on function public.crm_mutate(text,jsonb) to authenticated;
commit;
