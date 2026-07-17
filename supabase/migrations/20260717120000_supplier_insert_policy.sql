-- ============================================================================
-- Let any authenticated user create their OWN suppliers, and stamp ownership.
--
-- The multi-tenant migration added owner/member SELECT/UPDATE/DELETE policies
-- to `suppliers` but no explicit INSERT policy — so creating a new supplier
-- (AI flow / manual wizard) could be blocked, and name-derived ids collided
-- with other users' rows (now the app uses unique ids). This adds a clean,
-- additive INSERT policy and makes created_by default to the caller.
-- ============================================================================

alter table suppliers alter column created_by set default auth.uid();

drop policy if exists "he_ins_suppliers_own" on suppliers;
create policy "he_ins_suppliers_own" on suppliers for insert to authenticated
  with check (created_by = auth.uid() or created_by is null or public.is_app_owner());

-- Same for the project link (idempotent guard; writes already need edit rights).
drop policy if exists "he_ins_project_suppliers_member" on project_suppliers;
create policy "he_ins_project_suppliers_member" on project_suppliers for insert to authenticated
  with check (public.is_project_member(project_id) or public.is_app_owner());
