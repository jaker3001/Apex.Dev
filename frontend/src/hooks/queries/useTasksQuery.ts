/**
 * Tasks Query Hooks (Supabase)
 *
 * React Query hooks for task CRUD operations using Supabase client.
 * Includes optimistic updates and real-time subscriptions support.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import { taskKeys, taskListKeys } from '../../lib/react-query/queryKeys';
import type { UserTask } from '../../lib/supabase/types';

// Feature flag check
const SUPABASE_ENABLED = import.meta.env.VITE_FEATURE_SUPABASE_ENABLED === 'true';

/**
 * Task filter types
 */
export interface TaskFilters {
  list_id?: number;
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'none' | 'low' | 'medium' | 'high';
  is_my_day?: boolean;
  is_important?: boolean;
  due_date?: string;
  view?: 'my_day' | 'important' | 'planned';
  search?: string;
  project_id?: number;
}

/**
 * Extended task type with subtasks
 */
export interface TaskWithSubtasks extends UserTask {
  subtasks?: UserTask[];
  subtask_total?: number;
  subtask_completed?: number;
}

/**
 * Hook to fetch tasks with filters
 */
export function useTasksQuery(filters?: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      if (!SUPABASE_ENABLED) {
        // Fallback to API
        return fetchTasksFromAPI(filters);
      }

      let query = supabase
        .from('user_tasks')
        .select('*')
        .is('parent_id', null) // Only top-level tasks
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.list_id) {
        query = query.eq('list_id', filters.list_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.is_my_day !== undefined) {
        query = query.eq('is_my_day', filters.is_my_day);
      }
      if (filters?.is_important !== undefined) {
        query = query.eq('is_important', filters.is_important);
      }
      if (filters?.due_date) {
        query = query.eq('due_date', filters.due_date);
      }
      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // View-specific filters
      if (filters?.view === 'my_day') {
        query = query.eq('is_my_day', true);
      } else if (filters?.view === 'important') {
        query = query.eq('is_important', true);
      } else if (filters?.view === 'planned') {
        query = query.not('due_date', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch subtasks for each task
      const tasks = data as UserTask[] | null;
      const tasksWithSubtasks = await Promise.all(
        (tasks || []).map(async (task) => {
          const { data: subtasks } = await supabase
            .from('user_tasks')
            .select('*')
            .eq('parent_id', task.id)
            .order('sort_order', { ascending: true});

          const subtaskData = subtasks as UserTask[] | null;
          const subtask_total = subtaskData?.length || 0;
          const subtask_completed =
            subtaskData?.filter((s) => s.status === 'completed').length || 0;

          return {
            ...task,
            subtasks: subtaskData || [],
            subtask_total,
            subtask_completed,
          } as TaskWithSubtasks;
        })
      );

      return tasksWithSubtasks;
    },
    enabled: true,
  });
}

/**
 * Hook to fetch a single task by ID
 */
export function useTaskQuery(id: number) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      if (!SUPABASE_ENABLED) {
        return fetchTaskFromAPI(id);
      }

      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch subtasks
      const { data: subtasks } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('parent_id', id)
        .order('sort_order', { ascending: true });

      const taskData = data as UserTask;
      const subtaskData = subtasks as UserTask[] | null;

      return {
        ...taskData,
        subtasks: subtaskData || [],
        subtask_total: subtaskData?.length || 0,
        subtask_completed:
          subtaskData?.filter((s) => s.status === 'completed').length || 0,
      } as TaskWithSubtasks;
    },
    enabled: id > 0,
  });
}

/**
 * Hook to fetch task lists
 */
export function useTaskListsQuery() {
  return useQuery({
    queryKey: taskListKeys.lists(),
    queryFn: async () => {
      if (!SUPABASE_ENABLED) {
        return fetchTaskListsFromAPI();
      }

      const { data, error } = await supabase
        .from('task_lists')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Get task counts for each list
      const lists = data as { id: number; name: string; icon?: string | null; color?: string | null; is_system: boolean; sort_order: number; user_id: number; created_at: string; updated_at: string }[] | null;
      const listsWithCounts = await Promise.all(
        (lists || []).map(async (list) => {
          const { count } = await supabase
            .from('user_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id)
            .neq('status', 'completed');

          return {
            ...list,
            task_count: count || 0,
          };
        })
      );

      return listsWithCounts;
    },
  });
}

/**
 * Hook to create a task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      task: Partial<UserTask> & { title: string }
    ): Promise<UserTask> => {
      if (!SUPABASE_ENABLED) {
        return createTaskViaAPI(task);
      }

      const { data, error } = await supabase
        .from('user_tasks')
        .insert(task as never)
        .select()
        .single();

      if (error) throw error;
      return data as UserTask;
    },
    onMutate: async (newTask) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousTasks = queryClient.getQueryData(taskKeys.all);

      queryClient.setQueryData(taskKeys.all, (old: TaskWithSubtasks[] = []) => [
        { ...newTask, id: -1, created_at: new Date().toISOString() } as TaskWithSubtasks,
        ...old,
      ]);

      return { previousTasks };
    },
    onError: (_err, _newTask, context) => {
      // Revert optimistic update
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.all, context.previousTasks);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskListKeys.all });
    },
  });
}

/**
 * Hook to update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<UserTask>;
    }): Promise<UserTask> => {
      if (!SUPABASE_ENABLED) {
        return updateTaskViaAPI(id, updates);
      }

      const { data, error} = await supabase
        .from('user_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as UserTask;
    },
    onMutate: async ({ id, updates }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });

      const previousTask = queryClient.getQueryData(taskKeys.detail(id));

      queryClient.setQueryData(taskKeys.detail(id), (old: TaskWithSubtasks) => ({
        ...old,
        ...updates,
      }));

      return { previousTask };
    },
    onError: (_err, { id }, context) => {
      // Revert optimistic update
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskListKeys.all });
    },
  });
}

/**
 * Hook to delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      if (!SUPABASE_ENABLED) {
        return deleteTaskViaAPI(id);
      }

      const { error } = await supabase.from('user_tasks').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskListKeys.all });
    },
  });
}

/**
 * Hook to complete a task
 */
export function useCompleteTask() {
  const updateTask = useUpdateTask();

  return useMutation({
    mutationFn: async (id: number) => {
      return updateTask.mutateAsync({
        id,
        updates: {
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
      });
    },
  });
}

/**
 * Hook to add task to My Day
 */
export function useAddToMyDay() {
  const updateTask = useUpdateTask();

  return useMutation({
    mutationFn: async (id: number) => {
      return updateTask.mutateAsync({
        id,
        updates: {
          is_my_day: true,
          my_day_date: new Date().toISOString().split('T')[0],
        },
      });
    },
  });
}

/**
 * Hook to remove task from My Day
 */
export function useRemoveFromMyDay() {
  const updateTask = useUpdateTask();

  return useMutation({
    mutationFn: async (id: number) => {
      return updateTask.mutateAsync({
        id,
        updates: {
          is_my_day: false,
          my_day_date: null,
        },
      });
    },
  });
}

// Fallback API functions (when Supabase is not enabled)
async function fetchTasksFromAPI(filters?: TaskFilters) {
  const params = new URLSearchParams();
  if (filters?.list_id) params.set('list_id', String(filters.list_id));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.is_my_day !== undefined)
    params.set('is_my_day', String(filters.is_my_day));
  if (filters?.view) params.set('view', filters.view);

  const res = await fetch(`/api/tasks?${params}`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  const data = await res.json();
  return data.tasks || [];
}

async function fetchTaskFromAPI(id: number) {
  const res = await fetch(`/api/tasks/${id}`);
  if (!res.ok) throw new Error('Failed to fetch task');
  return res.json();
}

async function fetchTaskListsFromAPI() {
  const res = await fetch('/api/task-lists');
  if (!res.ok) throw new Error('Failed to fetch task lists');
  const data = await res.json();
  return data.lists || [];
}

async function createTaskViaAPI(task: Partial<UserTask>) {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

async function updateTaskViaAPI(id: number, updates: Partial<UserTask>) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

async function deleteTaskViaAPI(id: number) {
  const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete task');
}
