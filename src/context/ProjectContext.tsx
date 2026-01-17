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
    refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType>({
    projects: [],
    currentProject: null,
    loading: true,
    setCurrentProject: () => { },
    createProject: async () => null,
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

    const value = useMemo(() => ({
        projects,
        currentProject,
        loading,
        setCurrentProject,
        createProject,
        refreshProjects: fetchProjects
    }), [projects, currentProject, loading, fetchProjects]);

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => useContext(ProjectContext);
