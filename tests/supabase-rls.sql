-- Teste real de banco. Tudo acontece dentro de uma transação e é revertido.
begin;
insert into auth.users(id,aud,role,email) values
 ('10000000-0000-4000-8000-000000000001','authenticated','authenticated','qa-nova@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','authenticated','authenticated','qa-tapira@example.invalid'),
 ('10000000-0000-4000-8000-000000000003','authenticated','authenticated','qa-admin@example.invalid');
insert into public.crm_profiles(user_id,role,store) values
 ('10000000-0000-4000-8000-000000000001','store','Nova Olímpia'),
 ('10000000-0000-4000-8000-000000000002','store','Tapira'),
 ('10000000-0000-4000-8000-000000000003','admin',null);
insert into public.crm_clients(id,store,name,phone,origin,acquired) values
 ('__qa_nova','Nova Olímpia','QA Nova','44999990001','Base do caderno',current_date),
 ('__qa_tapira','Tapira','QA Tapira','44999990002','Anúncio patrocinado',current_date);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","user_metadata":{"role":"admin"}}',true);
do $$begin
 if (select count(*) from public.crm_clients where id like '__qa_%')<>1 then raise exception 'RLS de Nova falhou';end if;
 if exists(select 1 from public.crm_clients where id='__qa_tapira') then raise exception 'Vazamento entre lojas';end if;
 perform public.crm_mutate('moveStage','{"id":"__qa_nova","version":1,"stage":"Em conversa"}');
 begin perform public.crm_mutate('moveStage','{"id":"__qa_tapira","version":1,"stage":"Comprou"}');raise exception 'Permitiu alterar outra loja';exception when insufficient_privilege then null;end;
 begin update public.crm_profiles set role='admin',store=null;raise exception 'Permitiu promover perfil';exception when insufficient_privilege then null;end;
 begin update public.crm_clients set stage='Comprou';raise exception 'Permitiu escrita fora da transação';exception when insufficient_privilege then null;end;
 perform public.crm_mutate('addContact',jsonb_build_object('id','__qa_contact','clientId','__qa_nova','date',current_date,'channel','WhatsApp','source','Prospecção ativa','result','Interessado','followup',current_date+1));
 perform public.crm_mutate('addContact',jsonb_build_object('id','__qa_contact','clientId','__qa_nova','date',current_date,'channel','WhatsApp','source','Prospecção ativa','result','Interessado','followup',current_date+1));
 if (select count(*) from public.crm_contacts where id='__qa_contact')<>1 or (select count(*) from public.crm_tasks where id='__qa_contact-task')<>1 then raise exception 'Idempotência falhou';end if;
 begin perform public.crm_mutate('addContact',jsonb_build_object('id','__qa_invalid','clientId','__qa_nova','date',current_date,'channel','WhatsApp','source','Prospecção ativa','result','Interessado','followup','2026-02-31'));exception when datetime_field_overflow then null;end;
 if exists(select 1 from public.crm_contacts where id='__qa_invalid') then raise exception 'Rollback de contato + tarefa falhou';end if;
 perform public.crm_mutate('addSale',jsonb_build_object('id','__qa_sale','clientId','__qa_nova','date',current_date,'source','Anúncio patrocinado','value',899.90));
 if (select stage from public.crm_clients where id='__qa_nova')<>'Comprou' then raise exception 'Etapa após venda falhou';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.crm_clients where id like '__qa_%')<>1 or exists(select 1 from public.crm_contacts where id='__qa_contact') or exists(select 1 from public.crm_sales where id='__qa_sale') then raise exception 'RLS de Tapira falhou';end if;
 perform public.crm_mutate('saveSettings',jsonb_build_object('version',1,'tapiraDaily',15,'tapiraWeekly',75,'novaDaily',999,'email','invalido'));
 if (select "novaDaily" from public.crm_settings)<>10 or (select "tapiraDaily" from public.crm_settings)<>15 then raise exception 'Permissões de metas falharam';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.crm_clients where id like '__qa_%')<>2 then raise exception 'Consolidado admin falhou';end if;
 if (select sum(value) from public.crm_sales where id='__qa_sale')<>899.90 then raise exception 'Receita falhou';end if;
end$$;
set local role anon;
do $$begin
 begin perform count(*) from public.crm_clients;raise exception 'Anon leu clientes';exception when insufficient_privilege then null;end;
 begin perform public.crm_mutate('moveStage','{}');raise exception 'Anon chamou RPC';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
