-- 002_booking_availability_storage.sql
-- Preserves booking availability without exposing customer PII.
-- + Storage RLS for booking-files (private) and course-images (limited public).
-- REVIEW ONLY - test on staging before prod. See supabase/README.md.

-- 1. Availability view: only date/time/status, no PII. Authenticated-only.
create or replace view public.booking_slots
with (security_invoker = true) as
select booking_date, booking_time, status
from public.bookings
where status is distinct from 'cancelled';

revoke all on table public.booking_slots from anon, authenticated;
grant select on table public.booking_slots to authenticated;

-- 2. RPC for availability: SECURITY DEFINER with strict validation, returns taken times for one date.
-- Frontend should call this instead of SELECT on bookings for slot rendering.
create or replace function public.booking_times_for_date(p_date date)
returns table (booking_time text, status text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_date is null then
    raise exception 'date required';
  end if;
  -- Allow only today .. +90 days to prevent scraping history.
  if p_date < current_date or p_date > current_date + interval '90 days' then
    raise exception 'date out of range';
  end if;
  -- Require authentication: anon gets empty set (no error leak).
  if auth.uid() is null and not public.is_admin() then
    -- Still require login for availability to match current frontend (requireAuth).
    -- To allow anon availability later, remove this block and grant execute to anon.
    return;
  end if;
  return query
    select b.booking_time::text, b.status::text
    from public.bookings b
    where b.booking_date = p_date
      and b.status is distinct from 'cancelled';
end;
$$;

revoke all on function public.booking_times_for_date(date) from public;
grant execute on function public.booking_times_for_date(date) to authenticated;
-- To enable anon slot checks later (public booking page without login), uncomment:
-- grant execute on function public.booking_times_for_date(date) to anon;

-- 3. Storage buckets (create if missing; safe on rerun).
insert into storage.buckets (id, name, public)
values ('booking-files', 'booking-files', false)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('course-images', 'course-images', true)
on conflict (id) do update set public = excluded.public;

-- 4. Storage policies for booking-files (PRIVATE).
-- Assumes object names are prefixed per-user or random; ownership is enforced by
-- requiring authenticated + constraining writes to owner folder convention:
--   <auth.uid()>/...  (frontend should be updated to upload under user folder).
-- Existing flat names (booking-<ts>-*.ext) remain readable by admin only until migrated.
alter table if exists storage.objects enable row level security;

drop policy if exists "booking-files admin all" on storage.objects;
create policy "booking-files admin all" on storage.objects
  for all to authenticated
  using (bucket_id = 'booking-files' and public.is_admin())
  with check (bucket_id = 'booking-files' and public.is_admin());

drop policy if exists "booking-files owner read" on storage.objects;
create policy "booking-files owner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'booking-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "booking-files owner insert" on storage.objects;
create policy "booking-files owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'booking-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "booking-files owner update" on storage.objects;
create policy "booking-files owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'booking-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'booking-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "booking-files owner delete" on storage.objects;
create policy "booking-files owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'booking-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- No anon policy on booking-files: anon gets zero rows (desired private).

-- 5. Storage policies for course-images (PUBLIC READ, admin write).
drop policy if exists "course-images public read" on storage.objects;
create policy "course-images public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'course-images');

drop policy if exists "course-images admin write" on storage.objects;
create policy "course-images admin write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'course-images' and public.is_admin());

drop policy if exists "course-images admin update" on storage.objects;
create policy "course-images admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'course-images' and public.is_admin())
  with check (bucket_id = 'course-images' and public.is_admin());

drop policy if exists "course-images admin delete" on storage.objects;
create policy "course-images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'course-images' and public.is_admin());
