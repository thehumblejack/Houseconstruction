'use client';

import { useProject } from '@/context/ProjectContext';
import ProjectSettingsModal from '@/components/ProjectSettingsModal';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { UserProfile } from '@/context/AuthContext';
import { Shield } from 'lucide-react';
import { UserPlus } from 'lucide-react';

export default function AdminUsersPage() {
    const { isAdmin, loading: authLoading } = useAuth();
    const { currentProject } = useProject();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.replace('/');
        }
    }, [isAdmin, authLoading, router]);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('user_profiles')
                .select('*')
                .order('requested_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error: supabaseError } = await query;

            if (supabaseError) {
                if (supabaseError.message?.includes('relation') || supabaseError.message?.includes('does not exist')) {
                    setError('DATABASE_MISSING');
                    return;
                }
                throw supabaseError;
            }
            setUsers(data || []);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError(err.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin, filter]);

    const approveUser = async (userId: string) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    rejection_reason: null,
                })
                .eq('id', userId);

            if (error) throw error;
            await fetchUsers();
        } catch (error) {
            console.error('Error approving user:', error);
            alert('Failed to approve user');
        } finally {
            setActionLoading(null);
        }
    };

    const rejectUser = async (userId: string) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    status: 'rejected',
                    rejection_reason: rejectionReason || 'Access denied by administrator',
                })
                .eq('id', userId);

            if (error) throw error;
            setShowRejectModal(null);
            setRejectionReason('');
            await fetchUsers();
        } catch (error) {
            console.error('Error rejecting user:', error);
            alert('Failed to reject user');
        } finally {
            setActionLoading(null);
        }
    };

    const updateUserRole = async (userId: string, newRole: 'admin' | 'user' | 'viewer') => {
        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            await fetchUsers();
        } catch (error) {
            console.error('Error updating user role:', error);
            alert('Failed to update user role');
        } finally {
            setActionLoading(null);
        }
    };

    const deleteUser = async (userId: string, authUserId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        setActionLoading(userId);
        try {
            // Delete from user_profiles (will cascade to auth.users if needed)
            const { error } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;
            await fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        } finally {
            setActionLoading(null);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error === 'DATABASE_MISSING') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Configuration requise</h2>
                    <p className="text-gray-600 mb-6">
                        La table <code>user_profiles</code> n'existe pas encore. Veuillez appliquer les migrations dans Supabase.
                    </p>
                    <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs font-mono text-left mb-6 overflow-x-auto">
                        # Copiez le contenu de : <br />
                        supabase/migrations/20260112_add_user_management.sql <br />
                        # Et exécutez-le dans le SQL Editor de Supabase.
                    </div>
                    <button
                        onClick={() => fetchUsers()}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                    >
                        Vérifier de nouveau
                    </button>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    const pendingCount = users.filter(u => u.status === 'pending').length;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
                        <p className="text-gray-600">Manage user access requests and permissions</p>
                    </div>
                    {currentProject && (
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                            <UserPlus className="h-4 w-4" />
                            Inviter au Projet <br />({currentProject.name})
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-1">Total Users</div>
                        <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-1">Pending Approval</div>
                        <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-1">Approved</div>
                        <div className="text-2xl font-bold text-green-600">
                            {users.filter(u => u.status === 'approved').length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-1">Rejected</div>
                        <div className="text-2xl font-bold text-red-600">
                            {users.filter(u => u.status === 'rejected').length}
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="flex border-b">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={`px-6 py-3 font-medium capitalize transition-colors ${filter === tab
                                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab}
                                {tab === 'pending' && pendingCount > 0 && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Requested
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {user.full_name || 'No name'}
                                                </div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${user.status === 'approved'
                                                    ? 'bg-green-100 text-green-800'
                                                    : user.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}
                                            >
                                                <span
                                                    className={`w-2 h-2 rounded-full mr-2 ${user.status === 'approved'
                                                        ? 'bg-green-600'
                                                        : user.status === 'pending'
                                                            ? 'bg-yellow-600'
                                                            : 'bg-red-600'
                                                        }`}
                                                ></span>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={user.role}
                                                onChange={(e) =>
                                                    updateUserRole(user.id, e.target.value as any)
                                                }
                                                disabled={actionLoading === user.id}
                                                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="viewer">Viewer</option>
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.requested_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            {user.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => approveUser(user.id)}
                                                        disabled={actionLoading === user.id}
                                                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => setShowRejectModal(user.id)}
                                                        disabled={actionLoading === user.id}
                                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {user.status === 'approved' && (
                                                <button
                                                    onClick={() => setShowRejectModal(user.id)}
                                                    disabled={actionLoading === user.id}
                                                    className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                            {user.status === 'rejected' && (
                                                <button
                                                    onClick={() => approveUser(user.id)}
                                                    disabled={actionLoading === user.id}
                                                    className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteUser(user.id, user.user_id)}
                                                disabled={actionLoading === user.id}
                                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && (
                        <div className="text-center py-12">
                            <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {filter === 'all'
                                    ? 'No users have signed up yet.'
                                    : `No ${filter} users found.`}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Reject User Access
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Please provide a reason for rejecting this user's access request.
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason (optional)"
                            className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
                            rows={4}
                        />
                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectionReason('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => rejectUser(showRejectModal)}
                                disabled={actionLoading === showRejectModal}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {actionLoading === showRejectModal ? 'Rejecting...' : 'Reject User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showInviteModal && (
                <ProjectSettingsModal onClose={() => setShowInviteModal(false)} />
            )}
        </div>
    );
}
