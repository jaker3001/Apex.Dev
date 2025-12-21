/**
 * Query Key Factory
 *
 * Centralized query key management for React Query.
 * Provides type-safe, consistent query keys across the application.
 *
 * Benefits:
 * - Type safety
 * - Consistency
 * - Easy invalidation
 * - Clear data dependencies
 */

import type { TaskFilters } from '../../hooks/useTasks';

/**
 * Task-related query keys
 */
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: number) => [...taskKeys.details(), id] as const,
  myDay: () => [...taskKeys.all, 'my-day'] as const,
  important: () => [...taskKeys.all, 'important'] as const,
  planned: () => [...taskKeys.all, 'planned'] as const,
};

/**
 * Task list query keys
 */
export const taskListKeys = {
  all: ['task-lists'] as const,
  lists: () => [...taskListKeys.all, 'list'] as const,
  list: (filters?: { user_id?: number }) => [...taskListKeys.lists(), filters] as const,
  details: () => [...taskListKeys.all, 'detail'] as const,
  detail: (id: number) => [...taskListKeys.details(), id] as const,
};

/**
 * Project-related query keys (PARA system)
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: {
    category?: string;
    status?: string;
    is_favorite?: boolean;
  }) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: number) => [...projectKeys.details(), id] as const,
  byCategory: (category: string) => [...projectKeys.all, 'category', category] as const,
  favorites: () => [...projectKeys.all, 'favorites'] as const,
};

/**
 * Note-related query keys (PKM system)
 */
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters?: {
    note_type?: string;
    project_id?: number;
    tags?: string[];
    is_favorite?: boolean;
    is_archived?: boolean;
  }) => [...noteKeys.lists(), filters] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: number) => [...noteKeys.details(), id] as const,
  search: (query: string) => [...noteKeys.all, 'search', query] as const,
  backlinks: (noteId: number) => [...noteKeys.all, 'backlinks', noteId] as const,
  tags: () => [...noteKeys.all, 'tags'] as const,
};

/**
 * Conversation-related query keys
 */
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters?: {
    limit?: number;
    offset?: number;
    active_only?: boolean;
  }) => [...conversationKeys.lists(), filters] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: number) => [...conversationKeys.details(), id] as const,
  messages: (conversationId: number) =>
    [...conversationKeys.detail(conversationId), 'messages'] as const,
};

/**
 * Job-related query keys (apex_operations.db)
 * Uses hybrid approach: API calls for complex queries
 */
export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (filters?: {
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  }) => [...jobKeys.lists(), filters] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: number) => [...jobKeys.details(), id] as const,
  estimates: (jobId: number) => [...jobKeys.detail(jobId), 'estimates'] as const,
  payments: (jobId: number) => [...jobKeys.detail(jobId), 'payments'] as const,
  documents: (jobId: number) => [...jobKeys.detail(jobId), 'documents'] as const,
  events: (jobId: number) => [...jobKeys.detail(jobId), 'events'] as const,
  contacts: (jobId: number) => [...jobKeys.detail(jobId), 'contacts'] as const,
};

/**
 * Agent-related query keys
 */
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (activeOnly = true) => [...agentKeys.lists(), { activeOnly }] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (name: string) => [...agentKeys.details(), name] as const,
};

/**
 * Skill-related query keys
 */
export const skillKeys = {
  all: ['skills'] as const,
  lists: () => [...skillKeys.all, 'list'] as const,
  list: () => [...skillKeys.lists()] as const,
  details: () => [...skillKeys.all, 'detail'] as const,
  detail: (id: number) => [...skillKeys.details(), id] as const,
  templates: () => [...skillKeys.all, 'templates'] as const,
};

/**
 * MCP server query keys
 */
export const mcpKeys = {
  all: ['mcp'] as const,
  lists: () => [...mcpKeys.all, 'list'] as const,
  list: (activeOnly = false) => [...mcpKeys.lists(), { activeOnly }] as const,
  details: () => [...mcpKeys.all, 'detail'] as const,
  detail: (name: string) => [...mcpKeys.details(), name] as const,
};

/**
 * Analytics query keys
 */
export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: () => [...analyticsKeys.all, 'overview'] as const,
  categories: () => [...analyticsKeys.all, 'categories'] as const,
  complexity: () => [...analyticsKeys.all, 'complexity'] as const,
  tools: () => [...analyticsKeys.all, 'tools'] as const,
  automationCandidates: (status?: string, limit = 10) =>
    [...analyticsKeys.all, 'automation-candidates', { status, limit }] as const,
  timeline: (days = 30) => [...analyticsKeys.all, 'timeline', days] as const,
  agents: () => [...analyticsKeys.all, 'agents'] as const,
};

/**
 * User query keys
 */
export const userKeys = {
  all: ['users'] as const,
  current: () => [...userKeys.all, 'current'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
};
