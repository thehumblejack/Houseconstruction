-- Enable UUID extension if not exists
create extension if not exists "uuid-ossp";

-- 1. Create project_members table
create table if not exists project_members (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references projects(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade, 
    -- user_id is nullable initially if we want to support placeholder members, but for now strict
    -- actually, better to link strictly.
    role text not null check (role in ('admin', 'editor', 'viewer')),
    joined_at timestamptz default now(),
    unique(project_id, user_id)
);

alter table project_members enable row level security;

-- 2. Create project_invitations table
create table if not exists project_invitations (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references projects(id) on delete cascade not null,
    email text not null,
    role text not null check (role in ('admin', 'editor', 'viewer')),
    token uuid default gen_random_uuid() not null unique,
    invited_by uuid references auth.users(id),
    status text default 'pending' check (status in ('pending', 'accepted', 'expired')),
    created_at timestamptz default now(),
    expires_at timestamptz default (now() + interval '7 days')
);

alter table project_invitations enable row level security;

-- 3. RLS Policies

-- project_members:
-- Users can read members of projects they belong to
create policy "Members can view other members"
    on project_members for select
    using (
        project_id in (
            select project_id from project_members where user_id = auth.uid()
        )
    );

-- project_invitations:
-- Only admins/editors of the project can create invitations
create policy "Admins/Editors can create invitations"
    on project_invitations for insert
    with check (
        exists (
            select 1 from project_members
            where project_id = project_invitations.project_id
            and user_id = auth.uid()
            and role in ('admin', 'editor')
        )
        -- Fallback: If no members exist yet (migration scenario), maybe allow owner?
        -- Assuming migration fills project_members first.
    );

create policy "Admins/Editors can view invitations"
    on project_invitations for select
    using (
        exists (
            select 1 from project_members
            where project_id = project_invitations.project_id
            and user_id = auth.uid()
            and role in ('admin', 'editor')
        )
    );

-- 4. RPC Function to Accept Invitation
-- This function runs with security definer to bypass RLS during the acceptance process
create or replace function accept_project_invitation(invite_token uuid)
returns json
language plpgsql
security definer
as $$
declare
    v_invite project_invitations%rowtype;
    v_user_email text;
    v_user_id uuid;
begin
    -- Get current user email and id
    select email, id into v_user_email, v_user_id from auth.users where id = auth.uid();
    
    if v_user_id is null then
        return json_build_object('success', false, 'error', 'Not authenticated');
    end if;

    -- Find invitation
    select * into v_invite from project_invitations 
    where token = invite_token and status = 'pending';

    if v_invite.id is null then
        return json_build_object('success', false, 'error', 'Invitation invalid or not found');
    end if;

    -- Check expiry
    if v_invite.expires_at < now() then
        update project_invitations set status = 'expired' where id = v_invite.id;
        return json_build_object('success', false, 'error', 'Invitation expired');
    end if;

    -- Check email match (Optional: strict email matching)
    -- If you want anyone with the link to accept, remove this check.
    -- Strict is safer.
    if lower(v_invite.email) <> lower(v_user_email) then
        return json_build_object('success', false, 'error', 'Email mismatch');
    end if;

    -- Check if already member
    if exists (select 1 from project_members where project_id = v_invite.project_id and user_id = v_user_id) then
         update project_invitations set status = 'accepted' where id = v_invite.id;
         return json_build_object('success', true, 'message', 'Already a member', 'project_id', v_invite.project_id);
    end if;

    -- Insert Member
    insert into project_members (project_id, user_id, role)
    values (v_invite.project_id, v_user_id, v_invite.role);

    -- Update Invite
    update project_invitations set status = 'accepted' where id = v_invite.id;

    return json_build_object('success', true, 'project_id', v_invite.project_id);
end;
$$;

-- 5. Migration: Auto-add existing project creators as 'admin'
-- CAUTION: This assumes 'projects' has a user_id or similar owner column.
-- Since I cannot verified the projects column, I will write a safer block.
-- Assuming standard Supabase, owner is usually implicit or in a column.
-- I'll define a function to "claim" projects if empty.
