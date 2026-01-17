-- FUNCTION: Check if user is member of project (Security Definer to bypass RLS recursion)
create or replace function public.is_member_of(_project_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 
    from project_members 
    where project_id = _project_id 
    and user_id = auth.uid()
  );
$$;

-- RESET POLICIES on project_members
drop policy if exists "Members can view other members" on project_members;
drop policy if exists "Users can view project steps" on project_members;
drop policy if exists "Users can view own membership" on project_members;
drop policy if exists "Users can view team members" on project_members;
drop policy if exists "Users can join projects (auto-migration)" on project_members;
drop policy if exists "Users can update own membership" on project_members;

alter table project_members enable row level security;

-- POLICY 1: VIEW
-- Users can view rows if:
-- 1. It is their own row (user_id = auth.uid())
-- 2. OR they are a member of the project (using the secure function)
create policy "View project members"
    on project_members for select
    using (
        user_id = auth.uid() 
        or 
        public.is_member_of(project_id)
    );

-- POLICY 2: INSERT
-- Users can insert rows for THEMSELVES (Auto-migration or accepting invite)
-- Note: Accepting invite sets user_id=auth.uid(), forcing 'admin' role in migration code.
create policy "Insert membership"
    on project_members for insert
    with check (
        user_id = auth.uid()
    );

-- POLICY 3: UPDATE
-- Users can update their own row (e.g. maybe leave project?)
create policy "Update own membership"
    on project_members for update
    using (user_id = auth.uid());

-- POLICY 4: DELETE
-- Users can delete their own row (Leave project)
-- Admins can delete others (using function)
create policy "Delete membership"
    on project_members for delete
    using (
        user_id = auth.uid()
        or
        (public.is_member_of(project_id) and exists (
            select 1 from project_members 
            where project_id = project_members.project_id 
            and user_id = auth.uid() 
            and role = 'admin'
        ))
    );
