-- Custom Drizzle migration — SQL Drizzle's table DSL cannot express.
-- Contains: trigger functions, the auth.users -> app.profiles trigger,
-- the private storage bucket + owner-scoped policy, and privilege revokes
-- (secure-by-default; RLS still gates every row regardless of grants).

-- ---------------------------------------------------------------------------
-- 1. updated_at — single function reused across tables.
--    Each table adds its own `before update` trigger calling this.
-- ---------------------------------------------------------------------------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on app.profiles;
create trigger trg_profiles_updated_at
  before update on app.profiles
  for each row execute function app.set_updated_at();

drop trigger if exists trg_subs_updated_at on app.subscriptions;
create trigger trg_subs_updated_at
  before update on app.subscriptions
  for each row execute function app.set_updated_at();

drop trigger if exists trg_orgs_updated_at on app.organizations;
create trigger trg_orgs_updated_at
  before update on app.organizations
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Auto-create a profile row when a user signs up.
--    SECURITY DEFINER so the trigger can write to app.profiles regardless of
--    the caller's role. search_path-locked for safety.
-- ---------------------------------------------------------------------------
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
-- 3. Revoke default privileges — secure by default.
--    RLS still gates every row; these grants are the table-level base.
--    Tables added in later migrations must mirror this pattern.
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
-- 4. Storage bucket — private user uploads (signed URLs only).
--    Each authenticated user owns their own objects (owner = auth.uid()).
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
