-- Public function to get invitation details (token -> project name, email)
-- This allows anyone to check if an invitation is valid without being logged in.
create or replace function public.get_invitation_details(invite_token uuid)
returns json
language plpgsql
security definer -- Bypass RLS to check for the token
as $$
declare
    v_invite_details record;
begin
    select 
        p.name as project_name, 
        i.email, 
        i.status, 
        i.expires_at 
    into v_invite_details
    from project_invitations i
    join projects p on p.id = i.project_id
    where i.token = invite_token;

    if v_invite_details is null then
        return json_build_object('success', false, 'error', 'Invitation non trouvée.');
    end if;

    if v_invite_details.status <> 'pending' then
        return json_build_object('success', false, 'error', 'Cette invitation a déjà été utilisée ou est invalide.');
    end if;

    if v_invite_details.expires_at < now() then
        return json_build_object('success', false, 'error', 'Cette invitation a expiré.');
    end if;

    return json_build_object(
        'success', true, 
        'project_name', v_invite_details.project_name,
        'email', v_invite_details.email
    );
end;
$$;
