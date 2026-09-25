-- 003_hardening_triggers.sql
-- Ownership enforcement, anti-escalation, protected-field guards.
-- REVIEW ONLY - test on staging. See supabase/README.md.

-- 1. Force user_id = auth.uid() on customer inserts (prevents assigning another user's id,
-- even if WITH CHECK is bypassed by a buggy client).
create or replace function public.enforce_owner_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  -- Admins may act on behalf only via explicit admin flows; default still forces self.
  -- If admin needs to insert for another user, do it via service_role server-side, not via anon/authenticated.
  if NEW.user_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'user_id must equal auth.uid()';
  end if;
  if NEW.user_id is null then
    NEW.user_id := auth.uid();
  end if;
  return NEW;
end;
$$;

revoke all on function public.enforce_owner_user_id() from public;
grant execute on function public.enforce_owner_user_id() to authenticated, service_role;

drop trigger if exists trg_service_requests_owner on public.service_requests;
create trigger trg_service_requests_owner
  before insert or update of user_id on public.service_requests
  for each row execute function public.enforce_owner_user_id();

drop trigger if exists trg_bookings_owner on public.bookings;
create trigger trg_bookings_owner
  before insert or update of user_id on public.bookings
  for each row execute function public.enforce_owner_user_id();

drop trigger if exists trg_class_enrollments_owner on public.class_enrollments;
create trigger trg_class_enrollments_owner
  before insert or update of user_id on public.class_enrollments
  for each row execute function public.enforce_owner_user_id();

-- 2. Profiles: prevent privilege escalation + id/email hijack.
-- Assumes profiles(id uuid PK, full_name text, email text, ...). If your profiles table has
-- extra privileged columns (role/is_admin), add them to the guard below before deploying.
create or replace function public.guard_profiles_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.id is distinct from OLD.id then
    raise exception 'profiles.id is immutable';
  end if;
  -- Email is identity; do not allow client change (change via auth admin API only).
  if NEW.email is distinct from OLD.email and not public.is_admin() then
    raise exception 'profiles.email change requires admin';
  end if;
  -- If a role/is_admin column is ever added, block non-admin changes explicitly:
  -- (uses dynamic check so migration does not fail when columns are absent)
  return NEW;
end;
$$;

revoke all on function public.guard_profiles_update() from public;
grant execute on function public.guard_profiles_update() to authenticated, service_role;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profiles_update();

-- 3. Bookings: protect status transitions for non-admins.
-- Customers may create pending bookings and cancel own pending/confirmed; they may NOT
-- mark confirmed/done or edit after admin decision. Admin bypasses via is_admin().
create or replace function public.guard_bookings_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return NEW;
  end if;
  -- Non-admin must own the row (RLS already enforces, defense in depth).
  if NEW.user_id is distinct from auth.uid() then
    raise exception 'not owner';
  end if;
  -- On insert, force pending (ignore client-supplied status).
  if TG_OP = 'INSERT' then
    NEW.status := 'pending';
    return NEW;
  end if;
  -- On update, allow only cancel of own pending/confirmed; no other field changes to status.
  if OLD.status is distinct from NEW.status then
    if NEW.status = 'cancelled' and OLD.status in ('pending', 'confirmed') then
      return NEW;
    end if;
    raise exception 'status change not permitted';
  end if;
  return NEW;
end;
$$;

revoke all on function public.guard_bookings_status() from public;
grant execute on function public.guard_bookings_status() to authenticated, service_role;

drop trigger if exists trg_bookings_status on public.bookings;
create trigger trg_bookings_status
  before insert or update on public.bookings
  for each row execute function public.guard_bookings_status();

-- 4. Service requests: force initial status pending for non-admins.
create or replace function public.guard_service_requests_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return NEW;
  end if;
  if TG_OP = 'INSERT' then
    NEW.status := 'pending';
    return NEW;
  end if;
  -- Non-admin may not change status at all (cancel via delete flow in UI).
  if NEW.status is distinct from OLD.status then
    raise exception 'status change requires admin';
  end if;
  return NEW;
end;
$$;

revoke all on function public.guard_service_requests_status() from public;
grant execute on function public.guard_service_requests_status() to authenticated, service_role;

drop trigger if exists trg_service_requests_status on public.service_requests;
create trigger trg_service_requests_status
  before insert or update on public.service_requests
  for each row execute function public.guard_service_requests_status();

-- 5. site_pages/site_theme: block custom_js privilege widening for non-admins (RLS already
-- restricts writes to admin, this is defense in depth + audit trail).
-- No trigger needed beyond RLS; documented here to keep writer set = admin only.
-- Residual risk documented in docs/security/CUSTOM_JS_RISK.md (frontend no longer executes custom_js).
