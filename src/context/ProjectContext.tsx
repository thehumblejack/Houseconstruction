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
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('ProjectContext: Error fetching projects:', error);
                return;
            }

            setProjects(data || []);

            // Handle initial selection
            if (data && data.length > 0) {
                const savedProjectId = localStorage.getItem('selectedProjectId');
                const savedProject = data.find((p: Project) => p.id === savedProjectId);
                setCurrentProjectState(savedProject || data[0]);
            } else {
                setCurrentProjectState(null);
            }
        } catch (error) {
            console.error('ProjectContext: Critical error:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

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
            const { data, error } = await supabase
                .from('projects')
                .insert([{ name, description }])
                .select()
                .single();

            if (error) throw error;

            await fetchProjects();
            if (data) setCurrentProject(data);
            return data;
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
                if (updatedProjects.length > 0) {
                    setCurrentProject(updatedProjects[0]);
                } else {
                    setCurrentProjectState(null);
                    localStorage.removeItem('selectedProjectId');
                }
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
