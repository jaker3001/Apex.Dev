import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeader } from './useAuth';

const API_BASE = import.meta.env.VITE_API_URL || '';

// =============================================================================
// TYPES
// =============================================================================

export interface InboxItem {
  id: number;
  user_id: number;
  type: 'note' | 'photo' | 'audio' | 'document' | 'task';
  title?: string;
  content?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  project_id?: number;
  processed: boolean;
  created_at: string;
  processed_at?: string;
}

export interface InboxListResponse {
  items: InboxItem[];
  total: number;
  unprocessed_count: number;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'mention' | 'assignment' | 'reminder' | 'alert' | 'system';
  title: string;
  message?: string;
  source_type?: string;
  source_id?: number;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface NotificationsListResponse {
  notifications: Notification[];
  unread_count: number;
}

export interface TimeEntry {
  id: number;
  user_id: number;
  clock_in: string;
  clock_out?: string;
  project_id?: number;
  notes?: string;
  break_minutes: number;
  created_at: string;
  updated_at: string;
  duration_minutes?: number;
  is_active: boolean;
}

export interface ClockStatusResponse {
  is_clocked_in: boolean;
  current_entry?: TimeEntry;
  today_total_minutes: number;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  all_day: boolean;
  status?: string;
  attendees?: string[];
  html_link?: string;
  calendar_id?: string;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  source: string;
}

export interface AgendaItem {
  id: string;  // "event_123" or "task_456"
  type: 'event' | 'task';
  title: string;
  description?: string;
  start: string;
  end?: string;
  all_day: boolean;
  location?: string;
  status?: string;
  priority?: string;
  is_important?: boolean;
  calendar_id?: number;
  color?: string;
}

export interface AgendaResponse {
  items: AgendaItem[];
  start_date: string;
  end_date: string;
}

export interface WeatherCondition {
  temp_f: number;
  temp_c: number;
  condition: string;
  icon: string;
  humidity: number;
  wind_mph: number;
  wind_direction: string;
  feels_like_f: number;
  feels_like_c: number;
}

export interface WeatherForecastDay {
  date: string;
  high_f: number;
  low_f: number;
  condition: string;
  icon: string;
  chance_of_rain: number;
  chance_of_snow: number;
}

export interface WeatherData {
  location: string;
  current: WeatherCondition;
  forecast: WeatherForecastDay[];
  alerts: string[];
  last_updated: string;
}

// =============================================================================
// INBOX HOOKS
// =============================================================================

async function fetchInbox(params?: {
  processed?: boolean;
  item_type?: string;
  limit?: number;
}): Promise<InboxListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.processed !== undefined) {
    searchParams.set('processed', String(params.processed));
  }
  if (params?.item_type) {
    searchParams.set('item_type', params.item_type);
  }
  if (params?.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const queryString = searchParams.toString();
  const url = `${API_BASE}/api/inbox${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch inbox');
  return res.json();
}

async function createInboxItem(data: {
  type: string;
  title?: string;
  content?: string;
  project_id?: number;
}): Promise<InboxItem> {
  const res = await fetch(`${API_BASE}/api/inbox`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create inbox item');
  return res.json();
}

async function uploadInboxFile(formData: FormData): Promise<InboxItem> {
  const res = await fetch(`${API_BASE}/api/inbox/upload`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload file');
  return res.json();
}

async function processInboxItem(itemId: number): Promise<InboxItem> {
  const res = await fetch(`${API_BASE}/api/inbox/${itemId}/process`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to process inbox item');
  return res.json();
}

async function deleteInboxItem(itemId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/inbox/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete inbox item');
}

export function useInbox(params?: { processed?: boolean; item_type?: string; limit?: number }) {
  return useQuery({
    queryKey: ['inbox', params],
    queryFn: () => fetchInbox(params),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useCreateInboxItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInboxItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

export function useUploadInboxFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadInboxFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

export function useProcessInboxItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: processInboxItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

export function useDeleteInboxItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInboxItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

// =============================================================================
// NOTIFICATIONS HOOKS
// =============================================================================

async function fetchNotifications(params?: {
  unread_only?: boolean;
  limit?: number;
}): Promise<NotificationsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.unread_only) {
    searchParams.set('unread_only', 'true');
  }
  if (params?.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const queryString = searchParams.toString();
  const url = `${API_BASE}/api/notifications${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

async function fetchUnreadCount(): Promise<{ unread_count: number }> {
  const res = await fetch(`${API_BASE}/api/notifications/count`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch notification count');
  return res.json();
}

async function markNotificationRead(notifId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/notifications/${notifId}/read`, {
    method: 'PATCH',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
}

async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to mark all notifications as read');
}

export function useNotifications(params?: { unread_only?: boolean; limit?: number }) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => fetchNotifications(params),
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notificationCount'],
    queryFn: fetchUnreadCount,
    refetchInterval: 15000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
    },
  });
}

// =============================================================================
// TIME TRACKING HOOKS
// =============================================================================

async function fetchClockStatus(): Promise<ClockStatusResponse> {
  const res = await fetch(`${API_BASE}/api/time/status`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch clock status');
  return res.json();
}

async function clockIn(data?: { project_id?: number; notes?: string }): Promise<TimeEntry> {
  const res = await fetch(`${API_BASE}/api/time/clock-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data || {}),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to clock in');
  }
  return res.json();
}

async function clockOut(data?: { notes?: string; break_minutes?: number }): Promise<TimeEntry> {
  const res = await fetch(`${API_BASE}/api/time/clock-out`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data || {}),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to clock out');
  }
  return res.json();
}

async function fetchTimeEntries(params?: {
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<{ entries: TimeEntry[]; total: number; current_entry?: TimeEntry }> {
  const searchParams = new URLSearchParams();
  if (params?.start_date) {
    searchParams.set('start_date', params.start_date);
  }
  if (params?.end_date) {
    searchParams.set('end_date', params.end_date);
  }
  if (params?.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const queryString = searchParams.toString();
  const url = `${API_BASE}/api/time/entries${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch time entries');
  return res.json();
}

export function useClockStatus() {
  return useQuery({
    queryKey: ['clockStatus'],
    queryFn: fetchClockStatus,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clockIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clockStatus'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clockOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clockStatus'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useTimeEntries(params?: { start_date?: string; end_date?: string; limit?: number }) {
  return useQuery({
    queryKey: ['timeEntries', params],
    queryFn: () => fetchTimeEntries(params),
  });
}

// =============================================================================
// CALENDAR HOOKS
// =============================================================================

// Helper to check if user is authenticated
function isAuthenticated(): boolean {
  const headers = getAuthHeader();
  return 'Authorization' in headers;
}

async function fetchCalendarEvents(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<CalendarEventsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.start_date) {
    searchParams.set('start_date', params.start_date);
  }
  if (params?.end_date) {
    searchParams.set('end_date', params.end_date);
  }

  const queryString = searchParams.toString();
  const url = `${API_BASE}/api/calendar/events${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch calendar events');
  return res.json();
}

export function useCalendarEvents(params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: ['calendarEvents', params],
    queryFn: () => fetchCalendarEvents(params),
    refetchInterval: 300000, // Refresh every 5 minutes
    enabled: isAuthenticated(), // Only fetch when authenticated
    retry: 2,
  });
}

// Calendar event creation
export interface CalendarEventCreateInput {
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  all_day?: boolean;
  attendees?: string[];
}

async function createCalendarEvent(event: CalendarEventCreateInput): Promise<CalendarEvent> {
  const res = await fetch(`${API_BASE}/api/calendar/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create event');
  }
  return res.json();
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });
}

// Calendar event update
async function updateCalendarEvent(params: { id: string; event: Partial<CalendarEventCreateInput> }): Promise<CalendarEvent> {
  const res = await fetch(`${API_BASE}/api/calendar/events/${params.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(params.event),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update event');
  }
  return res.json();
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });
}

// Calendar event deletion
async function deleteCalendarEvent(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/calendar/events/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to delete event');
  }
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });
}

// Agenda items - combined events and tasks
async function fetchAgendaItems(params: { start_date: string; end_date: string }): Promise<AgendaResponse> {
  const searchParams = new URLSearchParams({
    start_date: params.start_date,
    end_date: params.end_date,
  });
  const res = await fetch(`${API_BASE}/api/calendar/agenda?${searchParams}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch agenda items');
  return res.json();
}

export function useAgendaItems(params: { start_date: string; end_date: string }) {
  return useQuery({
    queryKey: ['agenda', params],
    queryFn: () => fetchAgendaItems(params),
    enabled: isAuthenticated() && !!params.start_date && !!params.end_date,
  });
}

// =============================================================================
// WEATHER HOOKS
// =============================================================================

async function fetchWeather(params?: {
  lat?: number;
  lon?: number;
  location?: string;
}): Promise<WeatherData> {
  const searchParams = new URLSearchParams();
  if (params?.lat !== undefined) {
    searchParams.set('lat', String(params.lat));
  }
  if (params?.lon !== undefined) {
    searchParams.set('lon', String(params.lon));
  }
  if (params?.location) {
    searchParams.set('location', params.location);
  }

  const queryString = searchParams.toString();
  const url = `${API_BASE}/api/weather${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch weather');
  return res.json();
}

export function useWeather(params?: { lat?: number; lon?: number; location?: string }) {
  return useQuery({
    queryKey: ['weather', params],
    queryFn: () => fetchWeather(params),
    refetchInterval: 900000, // Refresh every 15 minutes
    staleTime: 600000, // Consider fresh for 10 minutes
    enabled: isAuthenticated(), // Only fetch when authenticated
    retry: 2, // Retry twice on failure
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

export function getWeatherIcon(code: string): string {
  // Map Open-Meteo weather codes to emoji
  const iconMap: Record<string, string> = {
    '0': '☀️', // Clear sky
    '1': '🌤️', // Mainly clear
    '2': '⛅', // Partly cloudy
    '3': '☁️', // Overcast
    '45': '🌫️', // Fog
    '48': '🌫️', // Depositing rime fog
    '51': '🌧️', // Light drizzle
    '53': '🌧️', // Moderate drizzle
    '55': '🌧️', // Dense drizzle
    '61': '🌧️', // Slight rain
    '63': '🌧️', // Moderate rain
    '65': '🌧️', // Heavy rain
    '71': '🌨️', // Slight snow
    '73': '🌨️', // Moderate snow
    '75': '🌨️', // Heavy snow
    '77': '🌨️', // Snow grains
    '80': '🌧️', // Slight rain showers
    '81': '🌧️', // Moderate rain showers
    '82': '🌧️', // Violent rain showers
    '85': '🌨️', // Slight snow showers
    '86': '🌨️', // Heavy snow showers
    '95': '⛈️', // Thunderstorm
    '96': '⛈️', // Thunderstorm with slight hail
    '99': '⛈️', // Thunderstorm with heavy hail
  };
  return iconMap[code] || '🌡️';
}
