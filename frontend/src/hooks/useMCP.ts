import { useState, useEffect, useCallback } from 'react';
import { getAuthHeader } from './useAuth';
import { API_BASE } from '../lib/api';

export interface MCPServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface MCPServer {
  id: number;
  name: string;
  server_type: string;
  config: MCPServerConfig;
  status: 'active' | 'inactive' | 'error';
  last_used?: string;
  created_date: string;
  error_message?: string;
}

interface UseMCPOptions {
  autoFetch?: boolean;
  activeOnly?: boolean;
}

export function useMCP(options: UseMCPOptions = {}) {
  const { autoFetch = true, activeOnly = false } = options;

  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (activeOnly) params.set('active_only', 'true');

      const response = await fetch(`${API_BASE}/mcp?${params}`, {
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch MCP servers: ${response.statusText}`);
      }

      const data = await response.json();
      setServers(data.servers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [activeOnly]);

  const enableServer = useCallback(async (name: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/mcp/${encodeURIComponent(name)}/enable`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to enable server: ${response.statusText}`);
      }

      // Update local state
      setServers((prev) =>
        prev.map((s) => (s.name === name ? { ...s, status: 'active' as const } : s))
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  const disableServer = useCallback(async (name: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/mcp/${encodeURIComponent(name)}/disable`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to disable server: ${response.statusText}`);
      }

      // Update local state
      setServers((prev) =>
        prev.map((s) => (s.name === name ? { ...s, status: 'inactive' as const } : s))
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  const toggleServer = useCallback(async (name: string): Promise<boolean> => {
    const server = servers.find((s) => s.name === name);
    if (!server) return false;

    if (server.status === 'active') {
      return disableServer(name);
    } else {
      return enableServer(name);
    }
  }, [servers, enableServer, disableServer]);

  const getServer = useCallback((name: string): MCPServer | undefined => {
    return servers.find((s) => s.name === name);
  }, [servers]);

  useEffect(() => {
    if (autoFetch) {
      fetchServers();
    }
  }, [autoFetch, fetchServers]);

  return {
    servers,
    isLoading,
    error,
    fetchServers,
    enableServer,
    disableServer,
    toggleServer,
    getServer,
  };
}
