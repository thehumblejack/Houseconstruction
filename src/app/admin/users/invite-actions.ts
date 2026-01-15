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
        redirectTo: `${baseUrl}/auth/callback?next=/auth/set-password`
    })

    if (inviteError) {
        console.error('Invite error:', inviteError)
        return { error: inviteError.message }
    }

    if (data.user) {
        // Update profile with the selected role and approve immediately
        // Using upsert to handle cases where trigger might have already created it or not
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .upsert({
                user_id: data.user.id,
                email: email,
                role: role,
                status: 'approved',
                approved_at: new Date().toISOString(),
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
