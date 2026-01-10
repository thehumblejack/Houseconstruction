-- 3. Enable RLS
alter table suppliers enable row level security;
alter table expenses enable row level security;
alter table invoice_items enable row level security;
alter table deposits enable row level security;

-- 4. Create Policies

-- Suppliers: Everyone can read, only admin can insert/update/delete
create policy "Public Read Suppliers" on suppliers for select using (true);
create policy "Admin Modify Suppliers" on suppliers for all using (auth.email() = 'hamzahadjtaieb@gmail.com');

-- Expenses: Everyone can read, only admin can insert/update/delete
create policy "Public Read Expenses" on expenses for select using (true);
create policy "Admin Modify Expenses" on expenses for all using (auth.email() = 'hamzahadjtaieb@gmail.com');

-- Invoice Items: Everyone can read, only admin can insert/update/delete
create policy "Public Read Invoice Items" on invoice_items for select using (true);
create policy "Admin Modify Invoice Items" on invoice_items for all using (auth.email() = 'hamzahadjtaieb@gmail.com');

-- Deposits: Everyone can read, only admin can insert/update/delete
create policy "Public Read Deposits" on deposits for select using (true);
create policy "Admin Modify Deposits" on deposits for all using (auth.email() = 'hamzahadjtaieb@gmail.com');
