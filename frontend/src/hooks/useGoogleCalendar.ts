/**
 * Google Calendar integration hooks.
 * Handles OAuth status, connection, and disconnection.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeader } from './useAuth';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Types
export interface GoogleCalendarStatus {
  connected: boolean;
  email?: string;
  calendars?: GoogleCalendarInfo[];
  selectedCalendarIds?: string[];
}

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor?: string;
  accessRole: 'reader' | 'writer' | 'owner';
}

export interface GoogleCalendarSettings {
  selectedCalendarIds: string[];
}

// Query keys
export const googleCalendarKeys = {
  all: ['google-calendar'] as const,
  status: () => [...googleCalendarKeys.all, 'status'] as const,
  calendars: () => [...googleCalendarKeys.all, 'calendars'] as const,
};

/**
 * Check if Google Calendar is connected for the current user.
 */
export function useGoogleCalendarStatus() {
  return useQuery({
    queryKey: googleCalendarKeys.status(),
    queryFn: async (): Promise<GoogleCalendarStatus> => {
      const response = await fetch(`${API_BASE}/api/auth/google/status`, {
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        // If not connected, return disconnected status
        if (response.status === 401 || response.status === 404) {
          return { connected: false };
        }
        throw new Error('Failed to check Google Calendar status');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    retry: false,
  });
}

/**
 * Get list of available Google Calendars for the connected account.
 */
export function useGoogleCalendars() {
  return useQuery({
    queryKey: googleCalendarKeys.calendars(),
    queryFn: async (): Promise<GoogleCalendarInfo[]> => {
      const response = await fetch(`${API_BASE}/api/auth/google/calendars`, {
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Google Calendars');
      }

      const data = await response.json();
      return data.calendars;
    },
    staleTime: 10 * 60 * 1000, // Consider fresh for 10 minutes
    enabled: false, // Only fetch when explicitly needed
  });
}

/**
 * Disconnect Google Calendar from the current user's account.
 */
export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch(`${API_BASE}/api/auth/google/disconnect`, {
        method: 'POST',
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Google Calendar');
      }
    },
    onSuccess: () => {
      // Invalidate all Google Calendar queries
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.all });
      // Also invalidate calendar events since they depend on Google
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

/**
 * Update selected calendars for sync.
 */
export function useUpdateCalendarSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: GoogleCalendarSettings): Promise<void> => {
      const response = await fetch(`${API_BASE}/api/auth/google/settings`, {
        method: 'PUT',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to update calendar settings');
      }
    },
    onSuccess: () => {
      // Invalidate status to refresh selected calendars
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.status() });
      // Invalidate calendar events to refetch with new calendars
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

/**
 * Helper to open the Google OAuth popup.
 * Returns a promise that resolves when auth is complete.
 */
export function openGoogleAuthPopup(): Promise<boolean> {
  return new Promise((resolve) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `${API_BASE}/api/auth/google/authorize`,
      'google-auth',
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    if (!popup) {
      resolve(false);
      return;
    }

    // Listen for completion message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'google-auth-success') {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
        resolve(true);
      } else if (event.data?.type === 'google-auth-error') {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
        resolve(false);
      }
    };
    window.addEventListener('message', handleMessage);

    // Fallback: check periodically if popup closed without message
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        // Give a moment for any final messages, then resolve as success
        // (user may have completed auth before closing)
        setTimeout(() => resolve(true), 500);
      }
    }, 1000);

    // Timeout after 5 minutes
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      clearInterval(checkClosed);
      if (!popup.closed) {
        popup.close();
      }
      resolve(false);
    }, 5 * 60 * 1000);
  });
}
