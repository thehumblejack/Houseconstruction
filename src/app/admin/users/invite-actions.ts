'use server'

import { createClient } from '@supabase/supabase-js'

export async function inviteUser(email: string, role: string) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { error: 'Server configuration error: Missing SERVICE_ROLE_KEY' }
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // Determine base URL
    // In production (Vercel), NEXT_PUBLIC_SITE_URL or VERCEL_URL should be set
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${baseUrl}/auth/callback?next=/auth/set-password`,
        data: { invited: true }
    })

    if (inviteError) {
        console.error('Invite error:', inviteError)
        if (inviteError.message.includes('already been registered')) {
            return { error: 'Cet utilisateur est déjà enregistré. S\'il est en attente, utilisez le bouton "Renvoyer l\'invitation".' }
        }
        return { error: inviteError.message }
    }

    if (data.user) {
        // Update profile with the selected role but keep status pending until they setup password
        // Using upsert to handle cases where trigger might have already created it or not
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .upsert({
                user_id: data.user.id,
                email: email,
                role: role,
                status: 'pending',
                approved_at: null,
                // Use default full_name if not present or let it stay null until they update it
                full_name: data.user.user_metadata?.full_name || email.split('@')[0]
            }, { onConflict: 'user_id' })

        if (profileError) {
            console.error('Profile update error:', profileError)
            return { error: 'User invited but failed to set role/status via profile.' }
        }
    }

    return { success: true }
}

export async function resendInvite(email: string) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { error: 'Server configuration error: Missing SERVICE_ROLE_KEY' }
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Resend email
    // 'invite' is for creating new invites. To resend an existing one or a confirmation email, Use 'signup'.
    // Supabase documentation indicates 'signup' type is used for email confirmation resends.
    const { error } = await supabaseAdmin.auth.resend({
        type: 'signup',
        email: email,
        options: {
            emailRedirectTo: `${baseUrl}/auth/callback?next=/auth/set-password`
        }
    })

    if (error) {
        console.error('Resend invite error:', error)
        return { error: error.message }
    }

    return { success: true }
}
