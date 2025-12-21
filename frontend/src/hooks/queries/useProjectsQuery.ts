/**
 * Projects Query Hooks (Supabase - PARA System)
 *
 * React Query hooks for PARA project management (Projects, Areas, Resources, Archives)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import { projectKeys } from '../../lib/react-query/queryKeys';
import type { ChatProject } from '../../lib/supabase/types';

const SUPABASE_ENABLED = import.meta.env.VITE_FEATURE_SUPABASE_ENABLED === 'true';

export interface ProjectFilters {
  category?: 'project' | 'area' | 'resource' | 'archive';
  status?: 'active' | 'on_hold' | 'completed' | 'archived';
  is_favorite?: boolean;
  search?: string;
  parent_id?: number | null;
}

/**
 * Hook to fetch projects with filters
 */
export function useProjectsQuery(filters?: ProjectFilters) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: async () => {
      if (!SUPABASE_ENABLED) {
        return fetchProjectsFromAPI(filters);
      }

      let query = supabase
        .from('chat_projects')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.is_favorite !== undefined) {
        query = query.eq('is_favorite', filters.is_favorite);
      }
      if (filters?.parent_id !== undefined) {
        if (filters.parent_id === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', filters.parent_id);
        }
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Hook to fetch a single project
 */
export function useProjectQuery(id: number) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      if (!SUPABASE_ENABLED) {
        return fetchProjectFromAPI(id);
      }

      const { data, error } = await supabase
        .from('chat_projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: id > 0,
  });
}

/**
 * Hook to create a project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      project: Partial<ChatProject> & { name: string }
    ): Promise<ChatProject> => {
      if (!SUPABASE_ENABLED) {
        return createProjectViaAPI(project);
      }

      const { data, error } = await supabase
        .from('chat_projects')
        .insert(project as never)
        .select()
        .single();

      if (error) throw error;
      return data as ChatProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Hook to update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<ChatProject>;
    }): Promise<ChatProject> => {
      if (!SUPABASE_ENABLED) {
        return updateProjectViaAPI(id, updates);
      }

      const { data, error } = await supabase
        .from('chat_projects')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ChatProject;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Hook to delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      if (!SUPABASE_ENABLED) {
        return deleteProjectViaAPI(id);
      }

      const { error } = await supabase.from('chat_projects').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Hook to toggle project favorite status
 */
export function useToggleProjectFavorite() {
  const updateProject = useUpdateProject();

  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: number; is_favorite: boolean }) => {
      return updateProject.mutateAsync({
        id,
        updates: { is_favorite },
      });
    },
  });
}

// Fallback API functions
async function fetchProjectsFromAPI(filters?: ProjectFilters) {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);

  const res = await fetch(`/api/chat-projects?${params}`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

async function fetchProjectFromAPI(id: number) {
  const res = await fetch(`/api/chat-projects/${id}`);
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

async function createProjectViaAPI(project: Partial<ChatProject>) {
  const res = await fetch('/api/chat-projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

async function updateProjectViaAPI(id: number, updates: Partial<ChatProject>) {
  const res = await fetch(`/api/chat-projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

async function deleteProjectViaAPI(id: number) {
  const res = await fetch(`/api/chat-projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
}
