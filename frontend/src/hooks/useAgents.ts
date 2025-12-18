import { useState, useEffect, useCallback } from 'react';
import { getAuthHeader } from './useAuth';
import { API_BASE } from '../lib/api';

export interface Agent {
  id: number;
  name: string;
  description: string;
  capabilities: string[] | null;
  times_used: number;
  created_date: string;
  last_used: string | null;
  is_active: boolean;
}

interface UseAgentsOptions {
  autoFetch?: boolean;
  activeOnly?: boolean;
}

export function useAgents(options: UseAgentsOptions = {}) {
  const { autoFetch = true, activeOnly = true } = options;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        active_only: activeOnly.toString(),
      });

      const response = await fetch(`${API_BASE}/agents?${params}`, {
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`);
      }

      const data = await response.json();
      setAgents(data.agents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [activeOnly]);

  const createAgent = useCallback(async (agent: {
    name: string;
    description: string;
    capabilities?: string[];
  }) => {
    try {
      const response = await fetch('${API_BASE}/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(agent),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to create agent: ${response.statusText}`);
      }

      const result = await response.json();
      await fetchAgents(); // Refresh the list
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [fetchAgents]);

  const deleteAgent = useCallback(async (name: string) => {
    try {
      const response = await fetch(`${API_BASE}/agents/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete agent: ${response.statusText}`);
      }

      // Remove from local state
      setAgents((prev) => prev.filter((a) => a.name !== name));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  const updateAgent = useCallback(async (name: string, updates: {
    description?: string;
    capabilities?: string[];
    is_active?: boolean;
  }) => {
    try {
      const response = await fetch(`${API_BASE}/agents/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update agent: ${response.statusText}`);
      }

      await fetchAgents(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [fetchAgents]);

  useEffect(() => {
    if (autoFetch) {
      fetchAgents();
    }
  }, [autoFetch, fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    fetchAgents,
    createAgent,
    deleteAgent,
    updateAgent,
  };
}
