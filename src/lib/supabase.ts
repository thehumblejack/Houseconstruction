import { createBrowserClient } from '@supabase/ssr'

let client: any = null;

export const createClient = () => {
    // Return existing client on browser to prevent infinite loops
    if (typeof window !== 'undefined' && client) return client;

    const newClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (typeof window !== 'undefined') client = newClient;
    return newClient;
}
