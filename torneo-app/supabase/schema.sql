-- Ejecutar completo en Supabase > SQL Editor. Activar antes: Authentication > Providers > "Allow anonymous sign-ins".
create table if not exists tournaments(id text primary key, code text unique not null, data jsonb not null, rev int not null default 1, updated_at timestamptz not null default now());
create table if not exists members(tournament_id text references tournaments(id) on delete cascade, user_id uuid not null, seat int not null check(seat in (0,1)), primary key(tournament_id,user_id), unique(tournament_id,seat));
alter table tournaments enable row level security; alter table members enable row level security;
-- Sin políticas sobre tournaments: nadie lee/escribe directo; todo pasa por las funciones de abajo (valida membresía).
create policy members_self on members for select using (user_id=auth.uid());

create or replace function create_tournament(p_id text,p_data jsonb) returns text language plpgsql security definer set search_path=public as $$
declare c text:=upper(substr(md5(random()::text||clock_timestamp()::text),1,6));
begin if auth.uid() is null then raise exception 'no autenticado'; end if;
 insert into tournaments(id,code,data) values(p_id,c,p_data); insert into members values(p_id,auth.uid(),0); return c; end $$;

create or replace function join_tournament(p_code text) returns jsonb language plpgsql security definer set search_path=public as $$
declare t tournaments;
begin if auth.uid() is null then raise exception 'no autenticado'; end if;
 select * into t from tournaments where code=upper(trim(p_code)); if not found then raise exception 'código inválido'; end if;
 if not exists(select 1 from members where tournament_id=t.id and user_id=auth.uid()) then
  if (select count(*) from members where tournament_id=t.id)>=2 then raise exception 'torneo completo (máx. 2 participantes)'; end if;
  insert into members values(t.id,auth.uid(),1); end if;
 return jsonb_build_object('id',t.id,'rev',t.rev,'data',t.data); end $$;

create or replace function pull_tournament(p_id text) returns jsonb language plpgsql security definer set search_path=public as $$
declare t tournaments;
begin if not exists(select 1 from members where tournament_id=p_id and user_id=auth.uid()) then raise exception 'sin acceso'; end if;
 select * into t from tournaments where id=p_id; return jsonb_build_object('rev',t.rev,'data',t.data); end $$;

-- Concurrencia optimista: solo escribe si la revisión base coincide; si no, devuelve lo remoto para fusionar.
create or replace function push_tournament(p_id text,p_base int,p_data jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare t tournaments;
begin if not exists(select 1 from members where tournament_id=p_id and user_id=auth.uid()) then raise exception 'sin acceso'; end if;
 select * into t from tournaments where id=p_id for update;
 if t.rev=p_base then update tournaments set data=p_data,rev=rev+1,updated_at=now() where id=p_id; return jsonb_build_object('ok',true,'rev',p_base+1); end if;
 return jsonb_build_object('ok',false,'rev',t.rev,'data',t.data); end $$;
revoke all on function create_tournament,join_tournament,pull_tournament,push_tournament from public,anon;
grant execute on function create_tournament,join_tournament,pull_tournament,push_tournament to authenticated;
