-- ============================================================================
-- 1) expense_payments — paiements partiels par facture (avec reçu photo).
--    Une facture passe « Payé » quand la somme des versements couvre son
--    montant TTC ; chaque versement peut porter un reçu (URL storage).
-- 2) finance_debt_entries — ajouts datés sur une créance/dette existante.
--    Total dette = montant initial + somme des ajouts.
-- Additif, member-scoped RLS ; écritures réservées aux éditeurs/admins.
-- ============================================================================

create table if not exists expense_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  expense_id uuid not null references expenses(id) on delete cascade,
  amount numeric not null default 0,
  date date default now(),
  receipt_image text,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

create table if not exists finance_debt_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  debt_id uuid not null references finance_debts(id) on delete cascade,
  amount numeric not null default 0,
  date date default now(),
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

create index if not exists idx_expense_payments_project on expense_payments(project_id);
create index if not exists idx_expense_payments_expense on expense_payments(expense_id);
create index if not exists idx_finance_debt_entries_project on finance_debt_entries(project_id);
create index if not exists idx_finance_debt_entries_debt on finance_debt_entries(debt_id);

alter table expense_payments enable row level security;
alter table finance_debt_entries enable row level security;

drop policy if exists "he_sel_expense_payments" on expense_payments;
create policy "he_sel_expense_payments" on expense_payments for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_ins_expense_payments" on expense_payments;
create policy "he_ins_expense_payments" on expense_payments for insert to authenticated
  with check (public.can_edit_project(project_id));
drop policy if exists "he_upd_expense_payments" on expense_payments;
create policy "he_upd_expense_payments" on expense_payments for update to authenticated
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
drop policy if exists "he_del_expense_payments" on expense_payments;
create policy "he_del_expense_payments" on expense_payments for delete to authenticated
  using (public.can_edit_project(project_id));

drop policy if exists "he_sel_finance_debt_entries" on finance_debt_entries;
create policy "he_sel_finance_debt_entries" on finance_debt_entries for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_ins_finance_debt_entries" on finance_debt_entries;
create policy "he_ins_finance_debt_entries" on finance_debt_entries for insert to authenticated
  with check (public.can_edit_project(project_id));
drop policy if exists "he_upd_finance_debt_entries" on finance_debt_entries;
create policy "he_upd_finance_debt_entries" on finance_debt_entries for update to authenticated
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
drop policy if exists "he_del_finance_debt_entries" on finance_debt_entries;
create policy "he_del_finance_debt_entries" on finance_debt_entries for delete to authenticated
  using (public.can_edit_project(project_id));
