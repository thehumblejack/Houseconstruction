'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RejectedPage() {
    const { user, userProfile, loading, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && userProfile?.status === 'approved') {
            router.replace('/');
        }
    }, [loading, userProfile, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center">
                    {/* Icon */}
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                        <svg
                            className="h-8 w-8 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Access Denied
                    </h1>

                    {/* Message */}
                    <p className="text-gray-600 mb-6">
                        Unfortunately, your access request has been rejected by an administrator.
                    </p>

                    {/* User Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="text-sm text-gray-500 mb-1">Email</div>
                        <div className="font-medium text-gray-900">{user?.email}</div>
                        <div className="text-sm text-gray-500 mt-3 mb-1">Status</div>
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            <span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                            Rejected
                        </div>
                    </div>

                    {/* Rejection Reason */}
                    {userProfile?.rejection_reason && (
                        <div className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <h3 className="font-semibold text-red-900 mb-2">Reason</h3>
                            <p className="text-sm text-red-800">{userProfile.rejection_reason}</p>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Need Help?
                        </h3>
                        <p className="text-sm text-blue-800">
                            If you believe this is an error or would like to discuss your access request,
                            please contact the administrator at <strong>hamzahadjtaieb@gmail.com</strong>
                        </p>
                    </div>

                    {/* Actions */}
                    <button
                        onClick={signOut}
                        className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
