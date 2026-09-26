-- 004_public_booking_anon_hardened.sql
-- Public booking without login: narrow anon allowances, PII stays unreadable.
-- REVIEW ONLY - test on staging before prod. See supabase/README.md.
-- Requires: 001_core_rls, 002_booking_availability_storage, 003_hardening_triggers.
--
-- What this does:
--  1. Lets anon call booking_times_for_date(p_date) for one in-range date only
--     (today..+90d). Returns booking_time/status only, no PII. No history scraping.
--  2. Lets anon INSERT into bookings with a strict WITH CHECK allowlist
--     (service enum, date window, time format, name/phone/email/location/notes lengths).
--     status is forced to 'pending' by 003 trigger; user_id must be NULL for anon.
--     No anon SELECT/UPDATE/DELETE on bookings (PII stays admin/owner-only).
--  3. Lets anon INSERT into storage booking-files under public/ prefix with
--     extension allowlist only. No anon SELECT/UPDATE/DELETE (private bucket stays).
--     Client size caps (10MB img / 50MB vid in js/booking-form.js) are UX only;
--     enforce real caps with a storage upload Edge Function or reverse-proxy limit.

-- 1. Availability RPC: allow anon, keep date-range guard.
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
  if p_date < current_date or p_date > current_date + interval '90 days' then
    raise exception 'date out of range';
  end if;
  return query
    select b.booking_time::text, b.status::text
    from public.bookings b
    where b.booking_date = p_date
      and b.status is distinct from 'cancelled';
end;
$$;

revoke all on function public.booking_times_for_date(date) from public;
grant execute on function public.booking_times_for_date(date) to anon, authenticated;

-- 2. Bookings: grant + narrow anon INSERT only.
grant insert on table public.bookings to anon;

drop policy if exists bookings_anon_insert_public on public.bookings;
create policy bookings_anon_insert_public on public.bookings
  for insert to anon
  with check (
    user_id is null
    and service in (
      'Pemasangan Server, Rack Server, WiFi & CCTV',
      'Pemasangan Kabel Rangkaian',
      'Pemasangan Komputer & Laptop',
      'Kelas Asas Kecerdasan Buatan (AI)',
      'Kelas Asas Komputer',
      'Lain-lain'
    )
    and booking_date >= current_date
    and booking_date <= current_date + interval '90 days'
    and booking_time ~ '^[0-9]{2}:[0-9]{2}$'
    and char_length(customer_name) between 2 and 100
    and phone ~ '^(\+?6?0)?1[0-9]{8,9}$'
    and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(email) <= 150
    and char_length(location) between 1 and 120
    and (notes is null or char_length(notes) <= 1000)
    and (image_url is null or image_url ~ '^(public/)?booking-[0-9]+-[a-z0-9]{6}\.(gif|png|jpg|jpeg|webp)$')
    and (video_url is null or video_url ~ '^(public/)?booking-[0-9]+-[a-z0-9]{6}\.(mp4|webm|mov)$')
  );

-- Explicitly no anon read/write beyond insert (defense in depth; 001 already revokes).
-- No anon SELECT/UPDATE/DELETE policy is created here on purpose.

-- 3. Storage booking-files: narrow anon INSERT under public/ prefix, extension allowlist.
-- Frontend must upload to public/booking-<ts>-<rand6>.<ext> after this ships.
drop policy if exists "booking-files anon insert public prefix" on storage.objects;
create policy "booking-files anon insert public prefix" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'booking-files'
    and (
      -- New convention (frontend updated to public/ prefix):
      name ~ '^public/booking-[0-9]+-[a-z0-9]{6}\.(gif|png|jpg|jpeg|webp|mp4|webm|mov)$'
      -- Legacy flat names (booking-<ts>-*.ext) during transition; remove after migration:
      or name ~ '^booking-[0-9]+-[a-z0-9]{6}\.(gif|png|jpg|jpeg|webp|mp4|webm|mov)$'
    )
  );

-- No anon SELECT/UPDATE/DELETE on booking-files (stays private; admin/owner only per 002).
