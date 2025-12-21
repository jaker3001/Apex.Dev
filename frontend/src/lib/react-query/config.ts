/**
 * React Query Configuration
 *
 * Centralized configuration for React Query (TanStack Query) with:
 * - Error handling
 * - Retry logic
 * - Cache settings
 * - Default options
 */

import { QueryClient, type DefaultOptions } from '@tanstack/react-query';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Custom error handler for React Query
 */
export function handleQueryError(error: unknown) {
  // Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as PostgrestError;
    console.error('Database error:', pgError.message, pgError.code);
    return;
  }

  // Network errors
  if (error instanceof Error) {
    console.error('Query error:', error.message);
    return;
  }

  console.error('Unknown error:', error);
}

/**
 * Default options for all queries and mutations
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // Stale time: how long before data is considered stale
    staleTime: 1000 * 60 * 5, // 5 minutes

    // Cache time: how long unused data stays in cache
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)

    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry on auth errors (401/403)
      if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as PostgrestError;
        if (pgError.code === 'PGRST301' || pgError.code === 'PGRST302') {
          return false;
        }
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },

    // Don't refetch on window focus by default (can override per query)
    refetchOnWindowFocus: false,

    // Refetch on reconnect
    refetchOnReconnect: true,

    // Don't refetch on mount if data is fresh
    refetchOnMount: false,
  },
  mutations: {
    // Retry mutations once
    retry: 1,
  },
};

/**
 * Main Query Client instance
 * Import and use this in your app
 */
export const queryClient = new QueryClient({
  defaultOptions,
});

/**
 * Helper to invalidate all task-related queries
 */
export function invalidateTaskQueries() {
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  queryClient.invalidateQueries({ queryKey: ['task-lists'] });
}

/**
 * Helper to invalidate all project-related queries
 */
export function invalidateProjectQueries() {
  queryClient.invalidateQueries({ queryKey: ['projects'] });
  queryClient.invalidateQueries({ queryKey: ['chat-projects'] });
}

/**
 * Helper to invalidate all note-related queries
 */
export function invalidateNoteQueries() {
  queryClient.invalidateQueries({ queryKey: ['notes'] });
}

/**
 * Helper to invalidate all conversation-related queries
 */
export function invalidateConversationQueries() {
  queryClient.invalidateQueries({ queryKey: ['conversations'] });
  queryClient.invalidateQueries({ queryKey: ['messages'] });
}

/**
 * Helper to prefetch data
 */
export async function prefetchQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>
) {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
  });
}
