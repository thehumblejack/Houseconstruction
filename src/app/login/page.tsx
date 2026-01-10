'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/expenses');
            } else if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback`,
                    },
                });
                if (error) throw error;
                setMessage('Check your email for the confirmation link.');
            } else if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${location.origin}/auth/update-password`,
                });
                if (error) throw error;
                setMessage('Password reset instructions sent to your email.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-jakarta">
            <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-900 mb-2">
                        {mode === 'signin' && 'Welcome Back'}
                        {mode === 'signup' && 'Create Account'}
                        {mode === 'forgot' && 'Reset Password'}
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        {mode === 'signin' && 'Enter your credentials to access the dashboard'}
                        {mode === 'signup' && 'Sign up to start tracking expenses'}
                        {mode === 'forgot' && 'Enter your email to receive reset instructions'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-bold">{error}</p>
                    </div>
                )}

                {message && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-xl flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-bold">{message}</p>
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                            placeholder="name@example.com"
                        />
                    </div>

                    {mode !== 'forgot' && (
                        <div>
                            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
                        {!loading && (
                            <>
                                {mode === 'signin' && 'Sign In'}
                                {mode === 'signup' && 'Sign Up'}
                                {mode === 'forgot' && 'Send Reset Link'}
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 flex items-center justify-center gap-6 text-xs font-bold text-slate-500">
                    {mode === 'signin' ? (
                        <>
                            <button onClick={() => setMode('signup')} className="hover:text-slate-900 transition-colors">Create Account</button>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <button onClick={() => setMode('forgot')} className="hover:text-slate-900 transition-colors">Forgot Password?</button>
                        </>
                    ) : (
                        <button onClick={() => setMode('signin')} className="hover:text-slate-900 transition-colors">Back to Sign In</button>
                    )}
                </div>
            </div>
        </div>
    );
}
