-- Relax RLS strategies to allow authenticated users to manage data
-- This is often necessary if the user's email mechanism doesn't perfectly match or during dev.

drop policy if exists "Admin Modify Suppliers" on suppliers;
create policy "Auth Modify Suppliers" on suppliers for all to authenticated using (true);

drop policy if exists "Admin Modify Expenses" on expenses;
create policy "Auth Modify Expenses" on expenses for all to authenticated using (true);

drop policy if exists "Admin Modify Invoice Items" on invoice_items;
create policy "Auth Modify Invoice Items" on invoice_items for all to authenticated using (true);

drop policy if exists "Admin Modify Deposits" on deposits;
create policy "Auth Modify Deposits" on deposits for all to authenticated using (true);
