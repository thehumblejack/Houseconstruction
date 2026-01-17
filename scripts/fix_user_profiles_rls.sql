-- Allow authenticated users to view all user profiles
-- This is necessary for the Team/Members list to function.

-- Enable RLS (should be already on)
alter table user_profiles enable row level security;

-- Drop restricting policies if any (safely)
drop policy if exists "Users can view own profile" on user_profiles;
drop policy if exists "Public profiles" on user_profiles;

-- Create permissive policy for authenticated users
create policy "Authenticated users can view all profiles"
    on user_profiles for select
    to authenticated
    using (true);

-- Ensure project_invitations are accessible (re-enforcing)
drop policy if exists "Admins/Editors can view invitations" on project_invitations;
drop policy if exists "Admins/Editors can create invitations" on project_invitations;

-- Allow reading invitations if you are authenticated and a member of the project (simplified check)
create policy "Project members can view invitations"
    on project_invitations for select
    using (
        exists (
            select 1 from project_members
            where project_id = project_invitations.project_id
            and user_id = auth.uid()
        )
    );

create policy "Admins/Editors can create invitations"
    on project_invitations for insert
    with check (
        exists (
            select 1 from project_members
            where project_id = project_invitations.project_id
            and user_id = auth.uid()
            and role in ('admin', 'editor')
        )
    );

-- Also allow deleting invitations (e.g. revoking)
create policy "Admins/Editors can delete invitations"
    on project_invitations for delete
    using (
         exists (
            select 1 from project_members
            where project_id = project_invitations.project_id
            and user_id = auth.uid()
            and role in ('admin', 'editor')
        )
    );
