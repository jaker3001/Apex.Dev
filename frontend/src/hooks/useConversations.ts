import { useState, useEffect, useCallback } from 'react';

export interface ConversationPreview {
  id: number;
  sessionId: string;
  title: string | null;
  preview: string | null;
  lastModelId: string | null;
  lastModelName: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface UseConversationsOptions {
  autoFetch?: boolean;
  limit?: number;
  includeInactive?: boolean;
}

export function useConversations(options: UseConversationsOptions = {}) {
  const { autoFetch = true, limit = 20, includeInactive = false } = options;

  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        include_inactive: includeInactive.toString(),
      });

      const response = await fetch(`http://localhost:8000/api/conversations?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [limit, includeInactive]);

  const deleteConversation = useCallback(async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/conversations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.statusText}`);
      }

      // Remove from local state
      setConversations((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  const getConversation = useCallback(async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/conversations/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, []);

  const getMessages = useCallback(async (id: number, limit?: number) => {
    try {
      const params = limit ? `?limit=${limit}` : '';
      const response = await fetch(`http://localhost:8000/api/conversations/${id}/messages${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchConversations();
    }
  }, [autoFetch, fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    fetchConversations,
    deleteConversation,
    getConversation,
    getMessages,
  };
}
