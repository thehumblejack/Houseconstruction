'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export interface UserProfile {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    status: 'pending' | 'approved' | 'rejected';
    role: 'admin' | 'user' | 'viewer';
    requested_at: string;
    approved_at: string | null;
    rejection_reason: string | null;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    isApproved: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    userProfile: null,
    loading: true,
    isAdmin: false,
    isApproved: false,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = useMemo(() => createClient(), []);

    const fetchUserProfile = useCallback(async (userId: string) => {
        try {
            console.log('Auth: Fetching profile for', userId);
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
                    console.warn('Auth: user_profiles table not found or profile missing. Using email fallback.');
                    return null;
                }
                console.error('Auth: Error fetching user profile:', error);
                return null;
            }

            console.log('Auth: Profile found:', data.status);
            return data as UserProfile;
        } catch (error) {
            console.error('Auth: Critical error fetching user profile:', error);
            return null;
        }
    }, [supabase]);

    const refreshProfile = useCallback(async () => {
        if (user) {
            const profile = await fetchUserProfile(user.id);
            setUserProfile(profile);
        }
    }, [user, fetchUserProfile]);

    useEffect(() => {
        let mounted = true;
        let isInitialLoad = true;

        // Safety timeout to prevent infinite loading screen
        const loadingTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('Auth: Failsafe triggered - forcing loading to false after timeout');
                setLoading(false);
            }
        }, 8000);

        const handleSession = async (currentSession: Session | null) => {
            if (!mounted) return;

            console.log('Auth: Handling session state', { hasSession: !!currentSession, email: currentSession?.user?.email });

            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
                // If we already have the profile for this user, don't refetch on every minor auth change
                if (!userProfile || userProfile.user_id !== currentSession.user.id) {
                    const profile = await fetchUserProfile(currentSession.user.id);
                    if (mounted) setUserProfile(profile);
                }
            } else {
                if (mounted) setUserProfile(null);
            }

            if (mounted && isInitialLoad) {
                isInitialLoad = false;
                setLoading(false);
                clearTimeout(loadingTimeout);
            }
        };

        // Initialize with getSession
        supabase.auth.getSession().then(({ data: { session } }: any) => {
            if (mounted && isInitialLoad) {
                console.log('Auth: Initial session fetch complete');
                handleSession(session);
            }
        });

        // Listen for all auth events
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
            console.log('Auth: Event received:', event);
            if (!mounted) return;

            if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setUserProfile(null);
                setLoading(false);
                return;
            }

            handleSession(session);
        });

        return () => {
            mounted = false;
            clearTimeout(loadingTimeout);
            subscription.unsubscribe();
        };
    }, [supabase, fetchUserProfile]); // Removed loading from dependencies to avoid potential loops

    // Real-time listener for user profile updates
    useEffect(() => {
        if (!user || loading) return; // Wait for initial load to finish before setting up real-time

        console.log('Auth: Setting up real-time listener for profile', user.id);
        const channel = supabase
            .channel(`profile:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_profiles',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: any) => {
                    const newStatus = payload.new.status;
                    const oldStatus = payload.old?.status || userProfile?.status;

                    console.log('Auth: Profile updated via real-time', { oldStatus, newStatus });

                    if (oldStatus === 'pending' && newStatus === 'approved') {
                        window.alert('Bienvenue ! Votre compte a été approuvé. Vous pouvez maintenant accéder à la plateforme.');
                    } else if (newStatus === 'rejected') {
                        window.alert('Désolé, votre accès a été révoqué par un administrateur.');
                    }

                    setUserProfile(payload.new as UserProfile);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, supabase]);

    // Role fallbacks for safe operation
    const isAdmin = userProfile
        ? (userProfile.role === 'admin' && userProfile.status === 'approved')
        : user?.email === 'hamzahadjtaieb@gmail.com';

    const isApproved = userProfile
        ? userProfile.status === 'approved'
        : (user?.email === 'hamzahadjtaieb@gmail.com');

    // Route Protection and Redirection
    useEffect(() => {
        if (loading) {
            console.log('Auth: Still loading session/profile...');
            return;
        }

        const isAuthPage = pathname === '/login' || pathname?.startsWith('/auth/');
        console.log('Auth: Processing route', { pathname, isAuthPage, user: !!user, hasProfile: !!userProfile });

        if (!user) {
            // Not logged in
            if (!isAuthPage) {
                console.log('Auth: Redirecting to login (unauthenticated)');
                router.replace('/login');
            }
        } else if (userProfile) {
            // Logged in with profile
            console.log('Auth: User status:', userProfile.status);
            if (userProfile.status === 'pending' && pathname !== '/auth/pending') {
                console.log('Auth: Redirecting to pending page');
                router.replace('/auth/pending');
            } else if (userProfile.status === 'rejected' && pathname !== '/auth/rejected') {
                console.log('Auth: Redirecting to rejected page');
                router.replace('/auth/rejected');
            } else if (userProfile.status === 'approved' && isAuthPage) {
                console.log('Auth: Approved user on auth page, redirecting home');
                router.replace('/');
            }
        } else if (user && !userProfile && !isAuthPage) {
            // Logged in but profile missing
            console.log('Auth: No profile found for logged in user', user.email);
            if (user.email === 'hamzahadjtaieb@gmail.com') {
                console.log('Auth: Admin fallback activated');
            } else {
                console.log('Auth: Redirecting to pending (no profile found)');
                router.replace('/auth/pending');
            }
        }
    }, [user, userProfile, loading, pathname, router]);

    const signOut = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            setUserProfile(null);
            setUser(null);
            setSession(null);
            router.push('/login');
        } catch (error) {
            console.error('Auth: Signout failed', error);
            // Force local clearing anyway
            setUserProfile(null);
            setUser(null);
            setSession(null);
            router.push('/login');
        }
    }, [supabase, router]);

    const value = useMemo(() => ({
        user,
        session,
        userProfile,
        loading,
        isAdmin,
        isApproved,
        signOut,
        refreshProfile
    }), [user, session, userProfile, loading, isAdmin, isApproved, signOut, refreshProfile]);

    return (
        <AuthContext.Provider value={value}>
            {!loading ? children : (
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-10 w-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Initialisation...</p>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
