-- Create table if it doesn't exist
create table if not exists project_steps (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references projects(id) on delete cascade not null,
    step_id text not null,
    completed boolean default false,
    completed_at timestamptz,
    updated_at timestamptz default now(),
    unique(project_id, step_id)
);

-- Enable RLS
alter table project_steps enable row level security;

-- Drop existing policies to avoid "already exists" errors
drop policy if exists "Users can view project steps" on project_steps;
drop policy if exists "Users can insert project steps" on project_steps;
drop policy if exists "Users can update project steps" on project_steps;

-- Re-create policies
create policy "Users can view project steps"
    on project_steps for select
    using (true);

create policy "Users can insert project steps"
    on project_steps for insert
    with check (true);

create policy "Users can update project steps"
    on project_steps for update
    using (true);
