-- Update acceptance function to also auto-approve user profiles
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

    -- Strict email matching
    if lower(v_invite.email) <> lower(v_user_email) then
        return json_build_object('success', false, 'error', 'Email mismatch');
    end if;

    -- 1. Auto-approve user profile if it's pending
    -- This allows invited users to skip the manual approval queue
    update public.user_profiles 
    set status = 'approved', 
        approved_at = now() 
    where user_id = v_user_id 
    and status = 'pending';

    -- Check if already member
    if exists (select 1 from project_members where project_id = v_invite.project_id and user_id = v_user_id) then
         update project_invitations set status = 'accepted' where id = v_invite.id;
         return json_build_object('success', true, 'message', 'Already a member', 'project_id', v_invite.project_id);
    end if;

    -- 2. Insert Member
    insert into project_members (project_id, user_id, role)
    values (v_invite.project_id, v_user_id, v_invite.role);

    -- 3. Mark Invite as used
    update project_invitations set status = 'accepted' where id = v_invite.id;

    return json_build_object('success', true, 'project_id', v_invite.project_id);
end;
$$;
