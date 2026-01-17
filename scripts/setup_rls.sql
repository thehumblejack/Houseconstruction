-- Enable RLS on core tables
alter table projects enable row level security;
alter table project_suppliers enable row level security;
alter table project_settings enable row level security;

-- 1. Policies for 'projects'
-- Allow all authenticated users to view projects (for now)
create policy "Authenticated users can select projects"
    on projects for select
    to authenticated
    using (true);

-- Allow authenticated users to insert projects
create policy "Authenticated users can insert projects"
    on projects for insert
    to authenticated
    with check (auth.uid() = owner_id);

-- Allow owners to update their projects
create policy "Owners can update projects"
    on projects for update
    to authenticated
    using (auth.uid() = owner_id);

-- Allow owners to delete their projects
create policy "Owners can delete projects"
    on projects for delete
    to authenticated
    using (auth.uid() = owner_id);


-- 2. Policies for 'project_suppliers'
create policy "Authenticated users can view project suppliers"
    on project_suppliers for select
    to authenticated
    using (true);

create policy "Authenticated users can insert project suppliers"
    on project_suppliers for insert
    to authenticated
    with check (true);

create policy "Authenticated users can update project suppliers"
    on project_suppliers for update
    to authenticated
    using (true);

create policy "Authenticated users can delete project suppliers"
    on project_suppliers for delete
    to authenticated
    using (true);


-- 3. Policies for 'project_settings'
create policy "Authenticated users can view project settings"
    on project_settings for select
    to authenticated
    using (true);

create policy "Authenticated users can insert project settings"
    on project_settings for insert
    to authenticated
    with check (true);

create policy "Authenticated users can update project settings"
    on project_settings for update
    to authenticated
    using (true);
