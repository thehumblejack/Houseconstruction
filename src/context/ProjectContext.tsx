'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Project {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

interface ProjectContextType {
    projects: Project[];
    currentProject: Project | null;
    loading: boolean;
    setCurrentProject: (project: Project) => void;
    createProject: (name: string, description: string) => Promise<Project | null>;
    deleteProject: (id: string) => Promise<boolean>;
    refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType>({
    projects: [],
    currentProject: null,
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
                        handleSelection(data || []);
                    }
                    return;
                }

                // If error is empty object (rare weirdness), ignore or warn but don't crash
                if (Object.keys(memberError).length === 0) {
                    console.warn('ProjectContext: Empty error object received via project_members fetch. Likely RLS or empty table. Proceeding to legacy check.');
                } else {
                    console.error('ProjectContext: Error fetching project members:', memberError);
                }
                // Don't return here! We need to attempt auto-migration if this failed (likely due to first-time setup)
            }

            // Map the joined data structure back to Project[]
            // Map the joined data structure back to Project[]
            let mappedProjects = memberData
                ? memberData
                    .map((m: any) => m.projects)
                    .filter((p: any) => p !== null)
                    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                : [];

            // AUTO-MIGRATION: If no members found, check for legacy projects and claim them
            if (mappedProjects.length === 0) {
                const { data: legacyData } = await supabase.from('projects').select('*').order('created_at', { ascending: true });

                if (legacyData && legacyData.length > 0) {
                    console.log('ProjectContext: Found legacy projects. Auto-migrating user as admin...');

                    const newMembers = legacyData.map((p: any) => ({
                        project_id: p.id,
                        user_id: user.id,
                        role: 'admin'
                    }));

                    const { error: migError } = await supabase.from('project_members').insert(newMembers);

                    if (!migError) {
                        console.log('ProjectContext: Migration successful.');
                        mappedProjects = legacyData;
                    } else {
                        console.error('ProjectContext: Migration failed:', migError);
                        // Still show them temporarily so the UI isn't empty, though they might have permission issues editing
                        mappedProjects = legacyData;
                    }
                }
            }

            setProjects(mappedProjects);
            handleSelection(mappedProjects);

        } catch (error) {
            console.error('ProjectContext: Critical error:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase, user]);

    const handleSelection = (projectList: Project[]) => {
        if (projectList && projectList.length > 0) {
            const savedProjectId = localStorage.getItem('selectedProjectId');
            const savedProject = projectList.find((p: Project) => p.id === savedProjectId);
            setCurrentProjectState(savedProject || projectList[0]);
        } else {
            setCurrentProjectState(null);
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
    };

    const createProject = async (name: string, description: string) => {
        try {
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
                    // Critical failure, might want to rollback project or retry
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
                handleSelection(updatedProjects);
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
        loading,
        setCurrentProject,
        createProject,
        deleteProject,
        refreshProjects: fetchProjects
    }), [projects, currentProject, loading, fetchProjects, deleteProject]);

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => useContext(ProjectContext);
