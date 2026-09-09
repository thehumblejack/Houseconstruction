-- ============================================================================
-- Finance / Trésorerie
--
-- Comptes = l'argent réel disponible (comptes bancaires, cash…).
-- Mouvements = entrées (approvisionnement) et sorties (paiements) rattachés à
-- un compte. Le solde d'un compte = solde initial + entrées − sorties.
--
-- Indépendant des factures : dépenser augmente le "total dépensé" du chantier ;
-- ici on suit séparément combien il reste réellement en banque.
-- Additif, member-scoped RLS ; écritures réservées aux éditeurs/admins.
-- ============================================================================

create table if not exists finance_accounts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  initial_balance numeric not null default 0,
  sort_order int default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

create table if not exists finance_movements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  account_id uuid not null references finance_accounts(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  amount numeric not null default 0,
  label text,
  supplier_id text,
  date date default now(),
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

create index if not exists idx_finance_accounts_project on finance_accounts(project_id);
create index if not exists idx_finance_movements_project on finance_movements(project_id);
create index if not exists idx_finance_movements_account on finance_movements(account_id);

alter table finance_accounts enable row level security;
alter table finance_movements enable row level security;

-- finance_accounts
drop policy if exists "he_sel_finance_accounts" on finance_accounts;
create policy "he_sel_finance_accounts" on finance_accounts for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_ins_finance_accounts" on finance_accounts;
create policy "he_ins_finance_accounts" on finance_accounts for insert to authenticated
  with check (public.can_edit_project(project_id));
drop policy if exists "he_upd_finance_accounts" on finance_accounts;
create policy "he_upd_finance_accounts" on finance_accounts for update to authenticated
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
drop policy if exists "he_del_finance_accounts" on finance_accounts;
create policy "he_del_finance_accounts" on finance_accounts for delete to authenticated
  using (public.can_edit_project(project_id));

-- finance_movements
drop policy if exists "he_sel_finance_movements" on finance_movements;
create policy "he_sel_finance_movements" on finance_movements for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_ins_finance_movements" on finance_movements;
create policy "he_ins_finance_movements" on finance_movements for insert to authenticated
  with check (public.can_edit_project(project_id));
drop policy if exists "he_upd_finance_movements" on finance_movements;
create policy "he_upd_finance_movements" on finance_movements for update to authenticated
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
drop policy if exists "he_del_finance_movements" on finance_movements;
create policy "he_del_finance_movements" on finance_movements for delete to authenticated
  using (public.can_edit_project(project_id));
