import { useState, useEffect, useCallback } from 'react';
import { getAuthHeader } from './useAuth';
import { API_BASE } from '../lib/api';

export interface ChatProject {
  id: number;
  name: string;
  description: string | null;
  instructions: string | null;
  knowledgePath: string | null;
  linkedJobNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseChatProjectsOptions {
  autoFetch?: boolean;
}

export function useChatProjects(options: UseChatProjectsOptions = {}) {
  const { autoFetch = true } = options;

  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/chat-projects`, {
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch chat projects: ${response.statusText}`);
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (project: {
    name: string;
    description?: string;
    instructions?: string;
    knowledge_path?: string;
    linked_job_number?: string;
  }): Promise<ChatProject | null> => {
    try {
      const response = await fetch(`${API_BASE}/chat-projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(project),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to create project: ${response.statusText}`);
      }

      const result = await response.json();
      await fetchProjects(); // Refresh the list
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [fetchProjects]);

  const updateProject = useCallback(async (id: number, updates: {
    name?: string;
    description?: string;
    instructions?: string;
    knowledge_path?: string;
    linked_job_number?: string;
  }): Promise<ChatProject | null> => {
    try {
      const response = await fetch(`${API_BASE}/chat-projects/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update project: ${response.statusText}`);
      }

      const result = await response.json();
      await fetchProjects(); // Refresh the list
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [fetchProjects]);

  const deleteProject = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/chat-projects/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }

      // Remove from local state
      setProjects((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  const getProject = useCallback((id: number): ChatProject | undefined => {
    return projects.find((p) => p.id === id);
  }, [projects]);

  useEffect(() => {
    if (autoFetch) {
      fetchProjects();
    }
  }, [autoFetch, fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getProject,
  };
}
