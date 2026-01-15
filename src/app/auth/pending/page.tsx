'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PendingPage() {
    const { user, userProfile, loading, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && userProfile?.status === 'approved') {
            router.replace('/expenses');
        }
    }, [loading, userProfile, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center">
                    {/* Icon */}
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                        <svg
                            className="h-8 w-8 text-yellow-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Account Pending Approval
                    </h1>

                    {/* Message */}
                    <p className="text-gray-600 mb-6">
                        Your account has been created successfully and is currently pending approval from an administrator.
                    </p>

                    {/* User Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="text-sm text-gray-500 mb-1">Registered Email</div>
                        <div className="font-medium text-gray-900">{user?.email}</div>
                        {userProfile?.full_name && (
                            <>
                                <div className="text-sm text-gray-500 mt-3 mb-1">Name</div>
                                <div className="font-medium text-gray-900">{userProfile.full_name}</div>
                            </>
                        )}
                        <div className="text-sm text-gray-500 mt-3 mb-1">Status</div>
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
                            Pending Review
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            What happens next?
                        </h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• An administrator will review your request</li>
                            <li>• You'll receive an email once your account is approved</li>
                            <li>• You can check back here anytime for updates</li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                            Refresh Status
                        </button>
                        <button
                            onClick={signOut}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
