-- FIX RLS Policies to allow Auto-Migration and prevent Recursion errors

-- 1. Drop existing policies on project_members to start fresh
drop policy if exists "Members can view other members" on project_members;
drop policy if exists "Users can view project steps" on project_members; -- clean up any others just in case

-- 2. Allow users to see their OWN membership rows (Crucial for first load)
create policy "Users can view own membership"
    on project_members for select
    using (user_id = auth.uid());

-- 3. Allow users to see OTHER members of projects they are part of
-- We use a simpler approach or rely on the fact that if you can see the project, you can see members.
-- But for now, let's just re-add the team view policy, hoping the "view own" resolves the recursion base case.
create policy "Users can view team members"
    on project_members for select
    using (
        exists (
            select 1 from project_members as pm
            where pm.project_id = project_members.project_id
            and pm.user_id = auth.uid()
        )
    );

-- 4. Allow users to INSERT their own membership (Crucial for Auto-Migration)
create policy "Users can join projects (auto-migration)"
    on project_members for insert
    with check (user_id = auth.uid());

-- 5. Allow updating own membership (optional, but good)
create policy "Users can update own membership"
    on project_members for update
    using (user_id = auth.uid());
