-- Importação transacional, exclusiva da chave administrativa. Não acessível pelo CRM.
create or replace function public.crm_import_legacy(payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare t text;n bigint;result jsonb:='{}'::jsonb;
begin
 if current_user<>'service_role' then raise exception 'Importação exige chave administrativa.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(87341401);
 -- A importação substitui apenas os padrões iniciais; nunca uma base em uso.
 lock table public.crm_clients,public.crm_contacts,public.crm_tasks,public.crm_sales,public.crm_appointments,public.crm_investments,public.crm_settings,public.crm_goals in exclusive mode;
 foreach t in array array['clients','contacts','tasks','sales','appointments','investments'] loop
 execute format('select count(*) from public.crm_%I',t) into n;
 if n>0 then raise exception 'O banco já tem dados. Não é permitido importar sobre uma base em uso.';end if;
 if jsonb_typeof(payload->t) is distinct from 'array' then raise exception 'Arquivo inválido: falta %.',t;end if;
 end loop;
 if jsonb_typeof(payload->'goals') is distinct from 'array' or jsonb_array_length(payload->'goals')<2 or jsonb_typeof(payload->'settings') is distinct from 'object' then raise exception 'Configurações ou metas inválidas.';end if;
 delete from public.crm_goals;delete from public.crm_settings;
 foreach t in array array['clients','contacts','tasks','sales','appointments','investments','goals'] loop
 execute format('insert into public.crm_%I select * from jsonb_populate_recordset(null::public.crm_%I,$1)',t,t) using payload->t;
 get diagnostics n=row_count;result:=result||jsonb_build_object(t,n);
 end loop;
 insert into public.crm_settings select * from jsonb_populate_record(null::public.crm_settings,payload->'settings');
 return result;
end$$;
revoke all on function public.crm_import_legacy(jsonb) from public,anon,authenticated;
grant execute on function public.crm_import_legacy(jsonb) to service_role;
