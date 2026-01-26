import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeader } from './useAuth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface Calendar {
  id: number;
  name: string;
  color: string;
  description?: string;
  is_visible: boolean;
  is_default: boolean;
  sort_order: number;
}

export interface CalendarCreateInput {
  name: string;
  color?: string;
  description?: string;
}

export interface CalendarUpdateInput {
  name?: string;
  color?: string;
  description?: string;
  is_visible?: boolean;
  sort_order?: number;
}

async function fetchCalendars(): Promise<{ calendars: Calendar[] }> {
  const res = await fetch(`${API_BASE}/api/calendars`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch calendars');
  return res.json();
}

async function createCalendar(data: CalendarCreateInput): Promise<Calendar> {
  const res = await fetch(`${API_BASE}/api/calendars`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create calendar');
  return res.json();
}

async function updateCalendar(params: { id: number; data: CalendarUpdateInput }): Promise<Calendar> {
  const res = await fetch(`${API_BASE}/api/calendars/${params.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(params.data),
  });
  if (!res.ok) throw new Error('Failed to update calendar');
  return res.json();
}

async function deleteCalendar(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/calendars/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete calendar');
}

export function useCalendars() {
  return useQuery({
    queryKey: ['calendars'],
    queryFn: fetchCalendars,
  });
}

export function useCreateCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });
}

export function useUpdateCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });
}

export function useDeleteCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });
}
