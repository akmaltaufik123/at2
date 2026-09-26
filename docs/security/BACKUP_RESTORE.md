# Backup / restore — website Supabase

## Before any migration
1. `supabase db dump -f pre_rls_backup_YYYYMMDD.sql` (schema + data) + verify file non-empty.
2. Storage snapshot: dashboard > Storage > `booking-files`, `course-images` > confirm replication/versioning per project plan; export object list (names only, no contents in tickets).
3. Record: actor, time (UTC), project ref (masked), backup location, retention.

## Restore evidence
- Restore backup to a TEST project and boot frontend against TEST URL/anon key; confirm login, bookings, classes, admin report render with synthetic data.
- Keep restore log (date, tester, result). No restore test = no prod apply.

## RPO/RTO (proposed, needs owner sign-off)
- RPO 24h (daily dumps + storage replication), RTO 4h (restore + verify). Mark as PROPOSED until measured.
