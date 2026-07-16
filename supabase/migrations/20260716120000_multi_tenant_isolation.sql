-- ============================================================================
-- Multi-tenant isolation (CRITICAL)
--
-- Goal: every user only sees THEIR projects and the data inside them.
-- Before this, read policies were `using (true)` — any approved user could
-- read everyone's expenses, suppliers, phases, etc.
--
-- Strategy (additive, deletes nothing):
--   • security-definer helpers to check membership without RLS recursion
--   • RESTRICTIVE member-scoped SELECT policies on all project-scoped tables
--     (they AND with the existing permissive reads)
--   • `projects` / `project_members`: RLS enabled + scoped policies, with a
--     bootstrap clause so a new user can create their own first project
--   • `suppliers` become owned/linked: visible only if you created them, or
--     they're linked/used in one of your projects
--   • `pending_factures` get a created_by owner
--   • The app owner (hamzahadjtaieb@gmail.com) keeps full visibility —
--     including legacy rows that predate ownership columns.
-- ============================================================================

-- ── Helpers (security definer → no RLS recursion) ──────────────────────────
create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid()
  );
$$;

create or replace function public.is_project_admin(p_project_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid() and pm.role = 'admin'
  );
$$;

create or replace function public.is_app_owner()
returns boolean language sql stable as $$
  select auth.email() = 'hamzahadjtaieb@gmail.com';
$$;

-- ── projects ────────────────────────────────────────────────────────────────
alter table projects add column if not exists created_by uuid default auth.uid();
alter table projects enable row level security;

drop policy if exists "he_sel_projects" on projects;
create policy "he_sel_projects" on projects for select to authenticated
  using (public.is_project_member(id) or created_by = auth.uid() or public.is_app_owner());
drop policy if exists "he_ins_projects" on projects;
create policy "he_ins_projects" on projects for insert to authenticated
  with check (auth.uid() is not null);
drop policy if exists "he_upd_projects" on projects;
create policy "he_upd_projects" on projects for update to authenticated
  using (public.is_project_admin(id) or public.is_app_owner())
  with check (public.is_project_admin(id) or public.is_app_owner());
drop policy if exists "he_del_projects" on projects;
create policy "he_del_projects" on projects for delete to authenticated
  using (public.is_project_admin(id) or public.is_app_owner());

-- Clamp any unknown pre-existing permissive policies too:
drop policy if exists "he_tenant_projects" on projects;
create policy "he_tenant_projects" on projects as restrictive for select to authenticated
  using (public.is_project_member(id) or created_by = auth.uid() or public.is_app_owner());

-- ── project_members ─────────────────────────────────────────────────────────
alter table project_members enable row level security;

drop policy if exists "he_sel_project_members" on project_members;
create policy "he_sel_project_members" on project_members for select to authenticated
  using (user_id = auth.uid() or public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_ins_project_members" on project_members;
create policy "he_ins_project_members" on project_members for insert to authenticated
  with check (
    -- bootstrap: creator of a project adds themself as its first admin
    (user_id = auth.uid() and (select p.created_by from projects p where p.id = project_id) = auth.uid())
    or public.is_project_admin(project_id)
    or public.is_app_owner()
  );
drop policy if exists "he_upd_project_members" on project_members;
create policy "he_upd_project_members" on project_members for update to authenticated
  using (public.is_project_admin(project_id) or public.is_app_owner())
  with check (public.is_project_admin(project_id) or public.is_app_owner());
drop policy if exists "he_del_project_members" on project_members;
create policy "he_del_project_members" on project_members for delete to authenticated
  using (public.is_project_admin(project_id) or user_id = auth.uid() or public.is_app_owner());

-- ── Member-scoped reads on all project data (restrictive = ANDs with reads) ─
drop policy if exists "he_tenant_expenses" on expenses;
create policy "he_tenant_expenses" on expenses as restrictive for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_tenant_invoice_items" on invoice_items;
create policy "he_tenant_invoice_items" on invoice_items as restrictive for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_tenant_deposits" on deposits;
create policy "he_tenant_deposits" on deposits as restrictive for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_tenant_orders" on orders;
create policy "he_tenant_orders" on orders as restrictive for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_tenant_order_items" on order_items;
create policy "he_tenant_order_items" on order_items as restrictive for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_tenant_uploaded_documents" on uploaded_documents;
create policy "he_tenant_uploaded_documents" on uploaded_documents as restrictive for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_tenant_project_steps" on project_steps;
create policy "he_tenant_project_steps" on project_steps as restrictive for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_tenant_project_suppliers" on project_suppliers;
create policy "he_tenant_project_suppliers" on project_suppliers as restrictive for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_tenant_phases" on phases;
create policy "he_tenant_phases" on phases as restrictive for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());
drop policy if exists "he_tenant_project_settings" on project_settings;
create policy "he_tenant_project_settings" on project_settings as restrictive for select to authenticated
  using (public.is_project_member(project_id) or public.is_app_owner());

-- ── suppliers: owned by their creator, or shared through a project link ─────
alter table suppliers add column if not exists created_by uuid default auth.uid();

drop policy if exists "he_tenant_suppliers" on suppliers;
create policy "he_tenant_suppliers" on suppliers as restrictive for select to authenticated
  using (
    created_by = auth.uid()
    or public.is_app_owner()
    or exists (select 1 from project_suppliers ps where ps.supplier_id = suppliers.id and public.is_project_member(ps.project_id))
    or exists (select 1 from expenses e where e.supplier_id = suppliers.id and public.is_project_member(e.project_id))
  );
drop policy if exists "he_tenant_suppliers_upd" on suppliers;
create policy "he_tenant_suppliers_upd" on suppliers as restrictive for update to authenticated
  using (
    created_by = auth.uid()
    or public.is_app_owner()
    or exists (select 1 from project_suppliers ps where ps.supplier_id = suppliers.id and public.is_project_member(ps.project_id))
  )
  with check (true);
drop policy if exists "he_tenant_suppliers_del" on suppliers;
create policy "he_tenant_suppliers_del" on suppliers as restrictive for delete to authenticated
  using (created_by = auth.uid() or public.is_app_owner());

-- ── pending_factures: owned by whoever captured them ─────────────────────────
alter table pending_factures add column if not exists created_by uuid default auth.uid();

drop policy if exists "he_tenant_pending_sel" on pending_factures;
create policy "he_tenant_pending_sel" on pending_factures as restrictive for select to authenticated
  using (created_by = auth.uid() or (created_by is null and public.is_app_owner()));
drop policy if exists "he_tenant_pending_upd" on pending_factures;
create policy "he_tenant_pending_upd" on pending_factures as restrictive for update to authenticated
  using (created_by = auth.uid() or (created_by is null and public.is_app_owner()))
  with check (true);
drop policy if exists "he_tenant_pending_del" on pending_factures;
create policy "he_tenant_pending_del" on pending_factures as restrictive for delete to authenticated
  using (created_by = auth.uid() or (created_by is null and public.is_app_owner()));
