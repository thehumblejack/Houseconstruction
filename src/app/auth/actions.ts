'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase' // Use the context-aware client to get the current session user
// Wait, createServerClient in lib/supabase is for client/browser? 
// The one in route.ts is for server components.
// We need to get the current session in Server Action context.
import { cookies } from 'next/headers'
import { createServerClient as createSsrClient } from '@supabase/ssr'

export async function confirmInvite() {
    // 1. Get current authenticated user
    const cookieStore = await cookies()
    const supabase = createSsrClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                }
            }
        }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Not authenticated' }
    }

    // 2. Check if user was invited
    const isInvited = user.user_metadata?.invited === true

    if (!isInvited) {
        return { error: 'Not an invited user. Please wait for admin approval.' }
    }

    // 3. Admin approve logic
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { error: 'Server configuration error' }
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

    // 4. Update status to approved
    const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
            status: 'approved',
            approved_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

    if (updateError) {
        console.error('Error approving user:', updateError)
        return { error: 'Failed to approve user' }
    }

    return { success: true }
}
