'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Project {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    role?: 'admin' | 'editor' | 'viewer';
}

interface ProjectContextType {
    projects: Project[];
    currentProject: Project | null;
    userRole: 'admin' | 'editor' | 'viewer' | null;
    loading: boolean;
    setCurrentProject: (project: Project) => void;
    createProject: (name: string, description: string) => Promise<Project | null>;
    deleteProject: (id: string) => Promise<boolean>;
    refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType>({
    projects: [],
    currentProject: null,
    userRole: null,
    loading: true,
    setCurrentProject: () => { },
    createProject: async () => null,
    deleteProject: async () => false,
    refreshProjects: async () => { },
});

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer' | null>(null);
    const [rawMemberships, setRawMemberships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = useMemo(() => createClient(), []);

    const fetchProjects = useCallback(async () => {
        try {
            console.log('ProjectContext: Fetching projects...');

            if (!user) return;

            // New logic: Fetch via project_members
            const { data: memberData, error: memberError } = await supabase
                .from('project_members')
                .select('project_id, role, projects(*)')
                .eq('user_id', user.id);

            if (memberError) {
                // Fallback for legacy/migration phase
                if (memberError.code === '42P01') { // undefined_table
                    console.warn('ProjectContext: project_members table missing, falling back to legacy fetch');
                    const { data, error } = await supabase
                        .from('projects')
                        .select('*')
                        .order('created_at', { ascending: true });

                    if (!error) {
                        setProjects(data || []);
                        setRawMemberships((data || []).map((p: any) => ({ project_id: p.id, role: 'admin' })));
                        handleSelection(data || [], (data || []).map((p: any) => ({ project_id: p.id, role: 'admin' })));
                    }
                    return;
                }
                console.error('ProjectContext: Error fetching project members:', memberError);
            }

            setRawMemberships(memberData || []);

            let mappedProjects = memberData
                ? memberData
                    .map((m: any) => ({
                        ...m.projects,
                        role: m.role
                    }))
                    .filter((p: any) => p !== null && p.id)
                    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                : [];

            // AUTO-MIGRATION: If no members found, check for legacy projects and claim them
            if (mappedProjects.length === 0) {
                const { data: legacyData } = await supabase.from('projects').select('*').order('created_at', { ascending: true });

                if (legacyData && legacyData.length > 0) {
                    const newMembers = legacyData.map((p: any) => ({
                        project_id: p.id,
                        user_id: user.id,
                        role: 'admin'
                    }));

                    const { error: migError } = await supabase.from('project_members').insert(newMembers);

                    if (!migError) {
                        mappedProjects = legacyData.map((p: any) => ({ ...p, role: 'admin' }));
                        setRawMemberships(newMembers);
                    } else {
                        mappedProjects = legacyData.map((p: any) => ({ ...p, role: 'admin' }));
                        setRawMemberships(newMembers);
                    }
                }
            }

            setProjects(mappedProjects);
            handleSelection(mappedProjects, memberData || mappedProjects.map((p: any) => ({ project_id: p.id, role: 'admin' })));

        } catch (error) {
            console.error('ProjectContext: Critical error:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase, user]);

    const handleSelection = (projectList: Project[], memberships: any[]) => {
        if (projectList && projectList.length > 0) {
            const savedProjectId = localStorage.getItem('selectedProjectId');
            const savedProject = projectList.find((p: Project) => p.id === savedProjectId);
            const selected = savedProject || projectList[0];

            setCurrentProjectState(selected);
            const membership = memberships.find(m => m.project_id === selected.id);
            setUserRole(membership?.role || 'viewer');
        } else {
            setCurrentProjectState(null);
            setUserRole(null);
        }
    };

    useEffect(() => {
        if (user) {
            fetchProjects();
        } else {
            setProjects([]);
            setCurrentProjectState(null);
            setLoading(false);
        }
    }, [user, fetchProjects]);

    const setCurrentProject = (project: Project) => {
        setCurrentProjectState(project);
        localStorage.setItem('selectedProjectId', project.id);
        const membership = rawMemberships.find(m => m.project_id === project.id);
        setUserRole(membership?.role || 'viewer');
    };

    const createProject = async (name: string, description: string) => {
        try {
            // Only admins can create projects if we want to enforce it here too
            // or we keep it for now as a way to "start" a project

            // 1. Create Project
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .insert([{ name, description }])
                .select()
                .single();

            if (projectError) throw projectError;

            // 2. Add creator as Admin member
            if (user && projectData) {
                const { error: memberError } = await supabase
                    .from('project_members')
                    .insert({
                        project_id: projectData.id,
                        user_id: user.id,
                        role: 'admin'
                    });

                if (memberError) {
                    console.error('Error creating admin member:', memberError);
                }
            }

            await fetchProjects();
            if (projectData) setCurrentProject(projectData);
            return projectData;
        } catch (error) {
            console.error('ProjectContext: Error creating project:', error);
            return null;
        }
    };

    const deleteProject = async (id: string) => {
        try {
            // Check if user is admin for this project
            const membership = rawMemberships.find(m => m.project_id === id);
            if (membership?.role !== 'admin') {
                alert('Seuls les administrateurs peuvent supprimer un projet.');
                return false;
            }

            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Update local state
            const updatedProjects = projects.filter(p => p.id !== id);
            setProjects(updatedProjects);

            // If we deleted the current project, select another one or null
            if (currentProject?.id === id) {
                handleSelection(updatedProjects, rawMemberships);
            }

            return true;
        } catch (error) {
            console.error('ProjectContext: Error deleting project:', error);
            return false;
        }
    };

    const value = useMemo(() => ({
        projects,
        currentProject,
        userRole,
        loading,
        setCurrentProject,
        createProject,
        deleteProject,
        refreshProjects: fetchProjects
    }), [projects, currentProject, userRole, loading, fetchProjects, deleteProject]);

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => useContext(ProjectContext);
