-- Create projects table
create table if not exists projects (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    created_at timestamptz default now(),
    owner_id uuid references auth.users(id)
);

-- Add project_id to existing tables
alter table suppliers add column if not exists project_id uuid references projects(id) on delete cascade;
alter table expenses add column if not exists project_id uuid references projects(id) on delete cascade;
alter table deposits add column if not exists project_id uuid references projects(id) on delete cascade;

-- Allow RLS to see these new columns (or just ensure they are available for all)
-- For this simple setup we will assume common access if RLS is disabled, 
-- but better to have these columns for filtering.

-- Create a project for the existing data
insert into projects (name, description) values ('AFH Maison', 'Projet initial de construction de maison');

-- Update all existing records to point to this new project
do $$
declare
    afh_id uuid;
begin
    select id from projects where name = 'AFH Maison' limit 1 into afh_id;
    
    update suppliers set project_id = afh_id where project_id is null;
    update expenses set project_id = afh_id where project_id is null;
    update deposits set project_id = afh_id where project_id is null;
end $$;
