-- ============================================================================
-- Phases + facture groups
--
-- 1) `phases` table: named project phases (Phase 1, Phase 2, …).
-- 2) `expenses.phase_id`: each facture can be tagged with a phase (badge in UI,
--    per-phase cost totals). Deleting a phase un-tags its factures (SET NULL) —
--    it never deletes any facture.
-- 3) `expenses.group_name`: free-text group inside a supplier (e.g. group all
--    "telescopie" factures under one collapsible "Telescopie" group with total).
--
-- Additive only: no data is deleted or modified. Safe to run once in the
-- Supabase SQL editor. Reuses public.can_edit_project() from the RLS migration,
-- so viewers (Observateur) cannot create/modify phases or tags.
-- ============================================================================

create table if not exists phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table phases enable row level security;

drop policy if exists "he_read_phases" on phases;
create policy "he_read_phases" on phases for select to authenticated using (true);
drop policy if exists "he_ins_phases" on phases;
create policy "he_ins_phases" on phases for insert to authenticated with check (public.can_edit_project(project_id));
drop policy if exists "he_upd_phases" on phases;
create policy "he_upd_phases" on phases for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
drop policy if exists "he_del_phases" on phases;
create policy "he_del_phases" on phases for delete to authenticated using (public.can_edit_project(project_id));

alter table expenses add column if not exists phase_id uuid references phases(id) on delete set null;
alter table expenses add column if not exists group_name text;

-- Phase badge color (key from the app palette: blue/purple/amber/emerald/rose/cyan/slate)
alter table phases add column if not exists color text;
