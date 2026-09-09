do $do$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if; end $do$;
do $do$ begin if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if; end $do$;
do $do$ begin if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if; end $do$;
do $do$ begin if not exists (select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin noinherit; end if; end $do$;
do $do$ begin if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator noinherit login password 'x'; end if; end $do$;
grant anon, authenticated, service_role to authenticator;
create schema if not exists auth;
create schema if not exists extensions;
create schema if not exists net;
create schema if not exists graphql;
create schema if not exists storage;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  deleted_at timestamptz
);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated') $$;
create or replace function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create or replace function net.http_post(
  url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000
) returns bigint language sql as $$ select 1::bigint $$;
create table storage.buckets (id text primary key, name text, public boolean default false);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner uuid, created_at timestamptz default now(), metadata jsonb
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $fn$
  select (select array_agg(part) from (
    select part, row_number() over () rn from unnest(string_to_array(name, '/')) part
  ) t where rn < array_length(string_to_array(name, '/'), 1));
$fn$;
create or replace function storage.filename(name text) returns text language sql immutable as $fn$
  select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)];
$fn$;
create or replace function storage.extension(name text) returns text language sql immutable as $fn$
  select split_part(storage.filename(name), '.', 2);
$fn$;
create schema if not exists cron;
create or replace function cron.schedule(job_name text, schedule text, command text)
  returns bigint language sql as $fn$ select 1::bigint $fn$;
create or replace function cron.unschedule(job_name text)
  returns boolean language sql as $fn$ select true $fn$;
create table if not exists cron.job (
  jobid bigserial primary key, jobname text, schedule text, command text
);
create schema if not exists vault;
create table if not exists vault.decrypted_secrets (id uuid default gen_random_uuid(), name text, decrypted_secret text);
insert into vault.decrypted_secrets (name, decrypted_secret)
  values ('alert_function_url', 'http://localhost/functions/v1/send-alerts'),
         ('alert_function_key', 'test-key');
