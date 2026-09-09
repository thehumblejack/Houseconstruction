-- ============================================================================
-- Finance — extras : devises, créances/dettes, revenus récurrents
--
-- 1) finance_accounts.currency : TND (défaut), USD ou EUR. Les soldes en devise
--    sont convertis en TND via les taux stockés dans project_settings (fx_rates).
-- 2) finance_debts : qui me doit (receivable) / à qui je dois (payable).
-- 3) finance_recurring : revenus récurrents (salaire…), à encaisser chaque mois.
-- Additif, member-scoped RLS ; écritures réservées aux éditeurs/admins.
-- ============================================================================

alter table finance_accounts add column if not exists currency text not null default 'TND';

create table if not exists finance_debts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  person text not null,
  amount numeric not null default 0,
  direction text not null check (direction in ('receivable','payable')),
  note text,
  settled boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

create table if not exists finance_recurring (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label text not null,
  account_id uuid references finance_accounts(id) on delete set null,
  amount numeric not null default 0,
  currency text not null default 'TND',
  direction text not null default 'in',
  day_of_month int,
  last_applied date,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

create index if not exists idx_finance_debts_project on finance_debts(project_id);
create index if not exists idx_finance_recurring_project on finance_recurring(project_id);

alter table finance_debts enable row level security;
alter table finance_recurring enable row level security;

-- finance_debts
drop policy if exists "he_sel_finance_debts" on finance_debts;
create policy "he_sel_finance_debts" on finance_debts for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_ins_finance_debts" on finance_debts;
create policy "he_ins_finance_debts" on finance_debts for insert to authenticated
  with check (public.can_edit_project(project_id));
drop policy if exists "he_upd_finance_debts" on finance_debts;
create policy "he_upd_finance_debts" on finance_debts for update to authenticated
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
drop policy if exists "he_del_finance_debts" on finance_debts;
create policy "he_del_finance_debts" on finance_debts for delete to authenticated
  using (public.can_edit_project(project_id));

-- finance_recurring
drop policy if exists "he_sel_finance_recurring" on finance_recurring;
create policy "he_sel_finance_recurring" on finance_recurring for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_ins_finance_recurring" on finance_recurring;
create policy "he_ins_finance_recurring" on finance_recurring for insert to authenticated
  with check (public.can_edit_project(project_id));
drop policy if exists "he_upd_finance_recurring" on finance_recurring;
create policy "he_upd_finance_recurring" on finance_recurring for update to authenticated
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
drop policy if exists "he_del_finance_recurring" on finance_recurring;
create policy "he_del_finance_recurring" on finance_recurring for delete to authenticated
  using (public.can_edit_project(project_id));
