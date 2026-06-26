-- ============================================================================
-- Storage write protection for `invoices` + `documents` buckets (ADDITIVE / SAFE)
--
-- Same approach: RESTRICTIVE policies. Nothing is deleted (the only DROPs target
-- the `he_*` policies this script creates). Existing permissive policies still
-- grant uploads to editors; these add an AND-condition so a "viewer" (no
-- admin/editor membership anywhere) cannot upload, overwrite, or delete.
--
-- The `bucket_id not in (...)` clause means OTHER buckets are unaffected.
-- Reads/downloads are untouched. Depends on public.is_editor_somewhere()
-- from 20260626120000_role_based_rls.sql.
-- ============================================================================

drop policy if exists "he_ins_storage" on storage.objects;
drop policy if exists "he_upd_storage" on storage.objects;
drop policy if exists "he_del_storage" on storage.objects;

create policy "he_ins_storage" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id not in ('invoices', 'documents') or public.is_editor_somewhere());

create policy "he_upd_storage" on storage.objects as restrictive for update to authenticated
  using (bucket_id not in ('invoices', 'documents') or public.is_editor_somewhere())
  with check (bucket_id not in ('invoices', 'documents') or public.is_editor_somewhere());

create policy "he_del_storage" on storage.objects as restrictive for delete to authenticated
  using (bucket_id not in ('invoices', 'documents') or public.is_editor_somewhere());
