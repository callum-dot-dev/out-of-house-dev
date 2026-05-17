-- =============================================================
-- RLS hotfix: simplify profile-read policy to avoid the helper
-- function path that was timing out / recursing.
--
-- Backfills any missing profile rows for existing auth.users so a
-- login that pre-dates the trigger still has somewhere to read.
-- =============================================================

-- 1. Backfill missing profiles (defensive — trigger should have done this)
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data->>'role', 'client')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 2. Drop the combined OR-with-helper policy. Replace with two cleaner
--    policies. A user can always read their own profile; developers and
--    admins can additionally read any profile. The "any profile" half
--    uses the SECURITY DEFINER helper, but a user reading their own row
--    short-circuits on the first policy and never touches the helper.
drop policy if exists "own profile read" on public.profiles;

create policy "profile read self"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profile read by dev or admin"
  on public.profiles for select
  using (public.is_developer_or_admin());

-- 3. Make sure RLS is on (no-op if already enabled).
alter table public.profiles enable row level security;
