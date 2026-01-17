-- 1. Create a function to check for admin/editor roles safely
create or replace function public.can_manage_project(_project_id uuid)
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
    and role in ('admin', 'editor')
  );
$$;

-- 2. Reset policies for project_invitations
drop policy if exists "Project members can view invitations" on project_invitations;
drop policy if exists "Admins/Editors can view invitations" on project_invitations;
drop policy if exists "Admins/Editors can create invitations" on project_invitations;
drop policy if exists "Admins/Editors can delete invitations" on project_invitations;

-- 3. Apply new policies using the safe function
-- VIEW: Any member can view invitations
create policy "View invitations"
    on project_invitations for select
    using (
        public.is_member_of(project_id)
    );

-- INSERT: Only admins/editors can create invitations
create policy "Insert invitations"
    on project_invitations for insert
    with check (
        public.can_manage_project(project_id)
    );

-- DELETE: Only admins/editors can delete invitations
create policy "Delete invitations"
    on project_invitations for delete
    using (
        public.can_manage_project(project_id)
    );
