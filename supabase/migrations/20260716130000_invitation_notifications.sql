-- ============================================================================
-- In-app invitation notifications + project owner labels
--
-- 1) get_my_invitations(): pending invitations addressed to MY email, with the
--    project name and inviter email resolved (security definer, so it works
--    even though the invitee can't read the project/profile rows yet).
--    Powers the notification bell: "Invitation au projet X — Accepter".
--
-- 2) get_my_project_owners(): owner email for each project I'm a member of.
--    Powers the badge in the project dropdown showing whose workspace it is.
--
-- Additive only. Both functions expose strictly the caller's own slice.
-- ============================================================================

create or replace function public.get_my_invitations()
returns table (
  id uuid,
  token text,
  project_id uuid,
  project_name text,
  inviter_email text,
  role text,
  created_at timestamptz
)
language sql security definer stable set search_path = public as $$
  select
    i.id,
    i.token::text,
    i.project_id,
    p.name,
    coalesce(up.email, 'un membre'),
    i.role::text,
    i.created_at
  from project_invitations i
  join projects p on p.id = i.project_id
  left join user_profiles up on up.user_id = i.invited_by
  where lower(i.email) = lower(coalesce(auth.email(), ''))
    and coalesce(i.status, 'pending') = 'pending'
    and i.created_at > now() - interval '7 days'
    -- don't notify for projects I'm already a member of
    and not exists (
      select 1 from project_members pm
      where pm.project_id = i.project_id and pm.user_id = auth.uid()
    )
  order by i.created_at desc;
$$;

create or replace function public.get_my_project_owners()
returns table (project_id uuid, owner_email text)
language sql security definer stable set search_path = public as $$
  select p.id, up.email
  from projects p
  join project_members pm on pm.project_id = p.id and pm.user_id = auth.uid()
  left join user_profiles up on up.user_id = p.created_by;
$$;
