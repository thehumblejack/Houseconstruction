-- ============================================================================
-- Viewer (Observateur) = READ-ONLY — server-side enforcement (ADDITIVE / SAFE)
--
-- This does NOT delete any of your existing policies or data. It ADDS
-- RESTRICTIVE policies, which Postgres combines with AND on top of whatever
-- permissive policies already grant access. Net effect: writes (insert/update/
-- delete) now also require an admin/editor membership; reads are untouched.
--
-- The only DROP statements target the `he_*` policies THIS script creates, so it
-- is safely re-runnable. It never touches your other policies.
--
-- Project role lives in public.project_members(project_id, user_id, role).
-- ============================================================================

create or replace function public.can_edit_project(p_project_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid()
      and pm.role in ('admin', 'editor')
  );
$$;

create or replace function public.is_editor_somewhere()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members pm
    where pm.user_id = auth.uid() and pm.role in ('admin', 'editor')
  );
$$;

-- ---- expenses ----
drop policy if exists "he_ins_expenses" on expenses;
drop policy if exists "he_upd_expenses" on expenses;
drop policy if exists "he_del_expenses" on expenses;
create policy "he_ins_expenses" on expenses as restrictive for insert to authenticated with check (public.can_edit_project(project_id));
create policy "he_upd_expenses" on expenses as restrictive for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "he_del_expenses" on expenses as restrictive for delete to authenticated using (public.can_edit_project(project_id));

-- ---- invoice_items ----
drop policy if exists "he_ins_invoice_items" on invoice_items;
drop policy if exists "he_upd_invoice_items" on invoice_items;
drop policy if exists "he_del_invoice_items" on invoice_items;
create policy "he_ins_invoice_items" on invoice_items as restrictive for insert to authenticated with check (public.can_edit_project(project_id));
create policy "he_upd_invoice_items" on invoice_items as restrictive for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "he_del_invoice_items" on invoice_items as restrictive for delete to authenticated using (public.can_edit_project(project_id));

-- ---- deposits ----
drop policy if exists "he_ins_deposits" on deposits;
drop policy if exists "he_upd_deposits" on deposits;
drop policy if exists "he_del_deposits" on deposits;
create policy "he_ins_deposits" on deposits as restrictive for insert to authenticated with check (public.can_edit_project(project_id));
create policy "he_upd_deposits" on deposits as restrictive for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "he_del_deposits" on deposits as restrictive for delete to authenticated using (public.can_edit_project(project_id));

-- ---- orders ----
drop policy if exists "he_ins_orders" on orders;
drop policy if exists "he_upd_orders" on orders;
drop policy if exists "he_del_orders" on orders;
create policy "he_ins_orders" on orders as restrictive for insert to authenticated with check (public.can_edit_project(project_id));
create policy "he_upd_orders" on orders as restrictive for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "he_del_orders" on orders as restrictive for delete to authenticated using (public.can_edit_project(project_id));

-- ---- order_items ----
drop policy if exists "he_ins_order_items" on order_items;
drop policy if exists "he_upd_order_items" on order_items;
drop policy if exists "he_del_order_items" on order_items;
create policy "he_ins_order_items" on order_items as restrictive for insert to authenticated with check (public.can_edit_project(project_id));
create policy "he_upd_order_items" on order_items as restrictive for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "he_del_order_items" on order_items as restrictive for delete to authenticated using (public.can_edit_project(project_id));

-- ---- uploaded_documents ----
drop policy if exists "he_ins_uploaded_documents" on uploaded_documents;
drop policy if exists "he_upd_uploaded_documents" on uploaded_documents;
drop policy if exists "he_del_uploaded_documents" on uploaded_documents;
create policy "he_ins_uploaded_documents" on uploaded_documents as restrictive for insert to authenticated with check (public.can_edit_project(project_id));
create policy "he_upd_uploaded_documents" on uploaded_documents as restrictive for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "he_del_uploaded_documents" on uploaded_documents as restrictive for delete to authenticated using (public.can_edit_project(project_id));

-- ---- project_steps ----
drop policy if exists "he_ins_project_steps" on project_steps;
drop policy if exists "he_upd_project_steps" on project_steps;
drop policy if exists "he_del_project_steps" on project_steps;
create policy "he_ins_project_steps" on project_steps as restrictive for insert to authenticated with check (public.can_edit_project(project_id));
create policy "he_upd_project_steps" on project_steps as restrictive for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "he_del_project_steps" on project_steps as restrictive for delete to authenticated using (public.can_edit_project(project_id));

-- ---- project_suppliers ----
drop policy if exists "he_ins_project_suppliers" on project_suppliers;
drop policy if exists "he_upd_project_suppliers" on project_suppliers;
drop policy if exists "he_del_project_suppliers" on project_suppliers;
create policy "he_ins_project_suppliers" on project_suppliers as restrictive for insert to authenticated with check (public.can_edit_project(project_id));
create policy "he_upd_project_suppliers" on project_suppliers as restrictive for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy "he_del_project_suppliers" on project_suppliers as restrictive for delete to authenticated using (public.can_edit_project(project_id));

-- ---- suppliers (GLOBAL catalog: viewer-everywhere cannot write) ----
drop policy if exists "he_ins_suppliers" on suppliers;
drop policy if exists "he_upd_suppliers" on suppliers;
drop policy if exists "he_del_suppliers" on suppliers;
create policy "he_ins_suppliers" on suppliers as restrictive for insert to authenticated with check (public.is_editor_somewhere());
create policy "he_upd_suppliers" on suppliers as restrictive for update to authenticated using (public.is_editor_somewhere()) with check (public.is_editor_somewhere());
create policy "he_del_suppliers" on suppliers as restrictive for delete to authenticated using (public.is_editor_somewhere());
