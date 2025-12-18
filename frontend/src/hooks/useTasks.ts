import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeader } from './useAuth';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Types
export interface TaskList {
  id: number;
  user_id: number;
  name: string;
  icon?: string;
  color?: string;
  is_system: boolean;
  sort_order: number;
  task_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  user_id: number;
  list_id?: number;
  parent_id?: number;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'none' | 'low' | 'medium' | 'high';
  due_date?: string;
  due_time?: string;
  is_important: boolean;
  is_my_day: boolean;
  my_day_date?: string;
  project_id?: number;
  recurrence_rule?: string;
  completed_at?: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  subtask_total: number;
  subtask_completed: number;
  subtasks: Task[];
}

export interface TaskListsResponse {
  lists: TaskList[];
  total: number;
}

export interface TasksResponse {
  tasks: Task[];
  total: number;
}

export interface TaskFilters {
  list_id?: number;
  status?: string;
  is_my_day?: boolean;
  is_important?: boolean;
  due_date?: string;
  view?: 'my_day' | 'important' | 'planned';
}

// API functions
async function fetchTaskLists(): Promise<TaskListsResponse> {
  const res = await fetch(`${API_BASE}/api/task-lists`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch task lists');
  return res.json();
}

async function fetchTasks(filters?: TaskFilters): Promise<TasksResponse> {
  const params = new URLSearchParams();
  if (filters?.list_id) params.set('list_id', String(filters.list_id));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.is_my_day !== undefined) params.set('is_my_day', String(filters.is_my_day));
  if (filters?.is_important !== undefined) params.set('is_important', String(filters.is_important));
  if (filters?.due_date) params.set('due_date', filters.due_date);
  if (filters?.view) params.set('view', filters.view);

  const queryString = params.toString();
  const url = `${API_BASE}/api/tasks${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

async function fetchTask(id: number): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch task');
  return res.json();
}

async function createTaskList(data: { name: string; icon?: string; color?: string }): Promise<TaskList> {
  const res = await fetch(`${API_BASE}/api/task-lists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create task list');
  return res.json();
}

async function updateTaskList(id: number, data: Partial<TaskList>): Promise<TaskList> {
  const res = await fetch(`${API_BASE}/api/task-lists/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update task list');
  return res.json();
}

async function deleteTaskList(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/task-lists/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete task list');
}

async function createTask(data: {
  title: string;
  list_id?: number;
  parent_id?: number;
  description?: string;
  priority?: string;
  due_date?: string;
  due_time?: string;
  is_important?: boolean;
  is_my_day?: boolean;
  project_id?: number;
}): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

async function updateTask(id: number, data: Partial<Task>): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

async function deleteTask(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete task');
}

async function completeTask(id: number): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}/complete`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to complete task');
  return res.json();
}

async function addToMyDay(id: number): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}/add-to-my-day`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to add to My Day');
  return res.json();
}

async function removeFromMyDay(id: number): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}/remove-from-my-day`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to remove from My Day');
  return res.json();
}

// Hooks
export function useTaskLists() {
  return useQuery({
    queryKey: ['taskLists'],
    queryFn: fetchTaskLists,
  });
}

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchTasks(filters),
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => fetchTask(id),
    enabled: id > 0,
  });
}

export function useCreateTaskList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTaskList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
    },
  });
}

export function useUpdateTaskList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaskList> }) => updateTaskList(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
    },
  });
}

export function useDeleteTaskList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTaskList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) => updateTask(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeTask,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
    },
  });
}

export function useAddToMyDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addToMyDay,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    },
  });
}

export function useRemoveFromMyDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeFromMyDay,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    },
  });
}
