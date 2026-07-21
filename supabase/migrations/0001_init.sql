-- ============================================================================
-- Next.js Template · Schema + RLS migration
-- ============================================================================
-- Provider-agnostic. Run via either:
--   1. Supabase dashboard SQL editor, OR
--   2. `supabase db push` from the linked project, OR
--   3. psql against the DATABASE_URL directly.
--
-- Security model:
--   • Every table has RLS enabled — NO default access.
--   • Privileges are revoked from anon/authenticated/service_role by default.
--   • Access is granted ONLY via explicit policies.
--   • profiles:       self only (read + write)
--   • subscriptions:  self only (read) — NEVER writable from client.
--                     Written exclusively by the service role from webhook handlers.
--   • organizations:  owner (all) + visibility-gated read (public | private)
--   • webhook_events: service-role only (no client access)
-- ============================================================================

-- Schema: isolate app tables from auth.*/storage.*
create schema if not exists app;

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type app.visibility as enum ('public', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.payment_provider as enum ('razorpay', 'stripe');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table if not exists app.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null,
  full_name            varchar(200),
  avatar_url           text,
  razorpay_customer_id varchar(100),
  stripe_customer_id   varchar(100),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists app.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references app.profiles(id) on delete cascade,
  plan                      varchar(50) not null,
  status                    app.subscription_status not null default 'trialing',
  provider                  app.payment_provider not null,
  provider_subscription_id  varchar(100),
  provider_payment_id       varchar(100),
  amount_cents              integer not null check (amount_cents >= 0),
  currency                  varchar(3) not null default 'usd',
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  canceled_at               timestamptz,
  metadata                  jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table if not exists app.organizations (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references app.profiles(id) on delete cascade,
  name          varchar(200) not null,
  slug          varchar(100) not null unique,
  website       text,
  description   text,
  tags          jsonb,
  visibility    app.visibility not null default 'private',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Webhook event ledger — idempotency for duplicate deliveries.
-- Service-role only (no RLS policy for authenticated = no client access).
create table if not exists app.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  provider     app.payment_provider not null,
  event_id     varchar(200) not null,
  event_type   varchar(100),
  processed_at timestamptz not null default now(),
  payload      jsonb
);

-- Enforce idempotency: one row per (provider, event_id).
create unique index if not exists uniq_webhook_provider_event
  on app.webhook_events(provider, event_id);

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_subscriptions_user_id        on app.subscriptions(user_id);
create index if not exists idx_subscriptions_provider_sub   on app.subscriptions(provider_subscription_id) where provider_subscription_id is not null;
create index if not exists idx_subscriptions_status         on app.subscriptions(status);
create index if not exists idx_organizations_owner_id       on app.organizations(owner_id);
create index if not exists idx_organizations_visibility     on app.organizations(visibility);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security — enable on ALL tables first
-- ---------------------------------------------------------------------------
alter table app.profiles       enable row level security;
alter table app.subscriptions  enable row level security;
alter table app.organizations  enable row level security;
alter table app.webhook_events enable row level security;

-- Drop legacy policies if this migration is re-run (idempotent).
drop policy if exists "profiles_select_self"   on app.profiles;
drop policy if exists "profiles_insert_self"   on app.profiles;
drop policy if exists "profiles_update_self"   on app.profiles;
drop policy if exists "subs_select_self"       on app.subscriptions;
drop policy if exists "orgs_select_owner"      on app.organizations;
drop policy if exists "orgs_select_visibility" on app.organizations;
drop policy if exists "orgs_insert_owner"      on app.organizations;
drop policy if exists "orgs_update_owner"      on app.organizations;
drop policy if exists "orgs_delete_owner"      on app.organizations;

-- ============================================================================
-- 4a. PROFILES — owner read/write only. Never public.
-- ============================================================================
create policy "profiles_select_self"
  on app.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_self"
  on app.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_self"
  on app.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ============================================================================
-- 4b. SUBSCRIPTIONS — owner can READ their own. No client writes.
--     The `service_role` bypasses RLS entirely, so webhook handlers
--     (which use the admin client) can write. Client SDK uses anon/authenticated,
--     which is governed by these policies.
-- ============================================================================
create policy "subs_select_self"
  on app.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- 4c. ORGANIZATIONS — visibility-gated.
--     • Owner: full CRUD on their own rows.
--     • Readers: SELECT governed by the visibility column.
--         - public:  visible to all authenticated users
--         - private: visible to the owner only
--     Extend this policy if you add role-tiered access.
-- ============================================================================

create policy "orgs_select_owner"
  on app.organizations for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "orgs_select_visibility"
  on app.organizations for select
  to authenticated
  using (visibility = 'public');

create policy "orgs_insert_owner"
  on app.organizations for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "orgs_update_owner"
  on app.organizations for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "orgs_delete_owner"
  on app.organizations for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------------

-- 5a. updated_at — single function reused across tables.
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at  on app.profiles;
create trigger trg_profiles_updated_at
  before update on app.profiles
  for each row execute function app.set_updated_at();

drop trigger if exists trg_subs_updated_at  on app.subscriptions;
create trigger trg_subs_updated_at
  before update on app.subscriptions
  for each row execute function app.set_updated_at();

drop trigger if exists trg_orgs_updated_at  on app.organizations;
create trigger trg_orgs_updated_at
  before update on app.organizations
  for each row execute function app.set_updated_at();

-- 5b. Auto-create a profile row when a user signs up.
--     SECURITY DEFINER so the trigger can write to app.profiles regardless
--     of the caller's role. search_path-locked for safety.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into app.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
exception when unique_violation then
  -- Profile already exists (e.g. re-run) — no-op.
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. Revoke default privileges — secure by default
-- ---------------------------------------------------------------------------
revoke execute on function app.set_updated_at   from public, anon, authenticated;
revoke execute on function app.handle_new_user  from public, anon, authenticated;

alter default privileges for role postgres in schema app
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema app
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema app
  revoke usage, select on sequences from anon, authenticated, service_role;

-- Minimal explicit grants to the table base — RLS still gates every row.
-- webhook_events is intentionally NOT granted to authenticated:
-- only the service_role (admin client, used by webhook handlers) can access it,
-- and it bypasses RLS entirely.
grant select, insert, update, delete on
  app.profiles, app.subscriptions, app.organizations to authenticated;
grant usage, select on all sequences in schema app to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Storage bucket — private user uploads (signed URLs only)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

drop policy if exists "uploads_owner_all" on storage.objects;
create policy "uploads_owner_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'uploads'
    and owner = (select auth.uid())
  )
  with check (
    bucket_id = 'uploads'
    and owner = (select auth.uid())
  );

-- ============================================================================
-- Done. Verify with:
--   select tablename, rowsecurity from pg_tables where schemaname = 'app';
--   select policyname, tablename from pg_policies where schemaname = 'app';
-- ============================================================================
